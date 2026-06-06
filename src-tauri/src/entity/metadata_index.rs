//! Actualiza `entities.metadata` desde el frontmatter de la ficha (Fase 4.1.4).

use std::fs;
use std::path::Path;

use serde_json::Value;

use crate::db::ProjectDb;
use crate::entity::document::parse_entity_str;
use crate::entity::path_rules::is_entity_relative_path;
use crate::entity::registry::resolve_template_id;
use crate::fs::entity_aliases::{aliases_to_json, read_aliases_from_markdown};
use crate::error::AppError;
use crate::fs::indexer::{entity_id_for_path, infer_category};

pub fn metadata_json_string(frontmatter: &Value) -> String {
    serde_json::to_string(frontmatter).unwrap_or_else(|_| "{}".to_string())
}

pub fn entity_display_name(frontmatter: &Value, file_stem: &str) -> String {
    frontmatter
        .get("title")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| file_stem.to_string())
}

/// Reindexa nombre, aliases y metadata JSON de una ficha en `entities`.
pub fn refresh_entity_row(
    db: &ProjectDb,
    project_root: &Path,
    relative: &str,
) -> Result<(), AppError> {
    if !is_entity_relative_path(relative) {
        return Ok(());
    }

    let full = project_root.join(relative.replace('/', std::path::MAIN_SEPARATOR_STR));
    if !full.is_file() {
        return Ok(());
    }

    let raw = fs::read_to_string(&full).map_err(|e| AppError::database(e.to_string()))?;
    let template_id = resolve_template_id(project_root, relative);
    let doc = parse_entity_str(relative, &raw, &template_id);

    let stem = full
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Untitled");
    let name = entity_display_name(&doc.frontmatter, stem);
    let category = infer_category(relative);
    let entity_id = entity_id_for_path(relative);
    let aliases_json = aliases_to_json(&read_aliases_from_markdown(&full));
    let metadata_json = metadata_json_string(&doc.frontmatter);
    let now = unix_ms_now();

    db.connection()
        .execute(
            "INSERT INTO entities (id, name, path, category, color, aliases, metadata, created_at, updated_at, status)
             VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, ?7, ?7, 'active')
             ON CONFLICT(path) DO UPDATE SET
               name = excluded.name,
               category = excluded.category,
               aliases = excluded.aliases,
               metadata = excluded.metadata,
               updated_at = excluded.updated_at,
               status = 'active'",
            rusqlite::params![
                entity_id,
                name,
                relative,
                category,
                aliases_json,
                metadata_json,
                now
            ],
        )
        .map_err(|e| AppError::database(e.to_string()))?;

    Ok(())
}

fn unix_ms_now() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
