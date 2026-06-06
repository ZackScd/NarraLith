//! Comandos IPC de fichas de entidad (Fase 4.1).

use std::fs;

use serde::Deserialize;
use serde_json::Value;
use tauri::State;

use crate::db::wiki_links;
use crate::entity::{
    ensure_entity_path, list_entity_timeline, list_location_inhabitants, list_template_summaries,
    load_template, parse_entity_str, refresh_entity_row, resolve_template_id, serialize_entity,
    EntityDocument, EntityTemplate, InhabitantRow, TemplateSummary, TimelineEntry,
};
use crate::error::AppError;
use crate::fs::paths::{resolve_new_child, resolve_under_root};
use crate::fs::reconcile::upsert_file;
use crate::parser::sanitize_metadata;
use crate::state::ProjectState;

#[tauri::command]
pub fn list_entity_templates(
    state: State<'_, ProjectState>,
) -> Result<Vec<TemplateSummary>, AppError> {
    state.with_db(|_db, root| list_template_summaries(root))
}

#[tauri::command]
pub fn get_entity_template(
    state: State<'_, ProjectState>,
    template_id: String,
) -> Result<EntityTemplate, AppError> {
    state.with_db(|_db, root| load_template(root, &template_id))
}

#[tauri::command]
pub fn resolve_template_for_path(
    state: State<'_, ProjectState>,
    file_path: String,
) -> Result<String, AppError> {
    state.with_db(|_db, root| {
        let rel = crate::fs::paths::normalize_relative(&file_path)?;
        Ok(resolve_template_id(root, &rel))
    })
}

#[tauri::command]
pub fn get_entity_timeline(
    state: State<'_, ProjectState>,
    entity_path: String,
) -> Result<Vec<TimelineEntry>, AppError> {
    state.with_db(|db, _root| {
        let rel = crate::fs::paths::normalize_relative(&entity_path)?;
        ensure_entity_path(&rel)?;
        list_entity_timeline(db.connection(), &rel)
    })
}

#[tauri::command]
pub fn get_location_inhabitants(
    state: State<'_, ProjectState>,
    location_path: String,
    limit: Option<usize>,
) -> Result<Vec<InhabitantRow>, AppError> {
    state.with_db(|db, _root| {
        let rel = crate::fs::paths::normalize_relative(&location_path)?;
        ensure_entity_path(&rel)?;
        let cap = limit.unwrap_or(100).min(200);
        list_location_inhabitants(db.connection(), &rel, cap)
    })
}

#[tauri::command]
pub fn read_entity(
    state: State<'_, ProjectState>,
    file_path: String,
) -> Result<EntityDocument, AppError> {
    state.with_db(|_db, root| {
        let rel = crate::fs::paths::normalize_relative(&file_path)?;
        ensure_entity_path(&rel)?;
        let full = resolve_under_root(root, &rel)?;
        if !full.is_file() {
            return Err(AppError::new("error.entity.not_found"));
        }
        let raw = fs::read_to_string(&full).map_err(|e| AppError::database(e.to_string()))?;
        let template_id = resolve_template_id(root, &rel);
        Ok(parse_entity_str(&rel, &raw, &template_id))
    })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveEntityPayload {
    pub frontmatter: Value,
    pub body: String,
}

#[tauri::command]
pub fn save_entity(
    state: State<'_, ProjectState>,
    file_path: String,
    payload: SaveEntityPayload,
) -> Result<EntityDocument, AppError> {
    state.with_db(|db, root| {
        let rel = crate::fs::paths::normalize_relative(&file_path)?;
        ensure_entity_path(&rel)?;
        let frontmatter = sanitize_metadata(payload.frontmatter);
        let content = serialize_entity(&frontmatter, &payload.body)?;
        let full = resolve_under_root(root, &rel)?;

        write_atomic(&full, content.as_bytes())?;

        refresh_entity_row(db, root, &rel)?;
        wiki_links::sync_wiki_links_for_file(db, &rel, &[(0, payload.body.clone())])?;

        let template_id = resolve_template_id(root, &rel);
        Ok(parse_entity_str(&rel, &content, &template_id))
    })
}

#[tauri::command]
pub fn create_entity(
    state: State<'_, ProjectState>,
    parent_path: String,
    name: String,
    template_id: Option<String>,
) -> Result<EntityDocument, AppError> {
    state.with_db(|db, root| {
        let mut file_name = name.trim().to_string();
        if file_name.is_empty() {
            return Err(AppError::new("error.entity.name_required"));
        }
        if !file_name.to_lowercase().ends_with(".md") {
            file_name.push_str(".md");
        }
        let stem = file_name
            .strip_suffix(".md")
            .unwrap_or(&file_name)
            .to_string();
        crate::fs::paths::validate_name(&stem)?;

        let full = resolve_new_child(root, &parent_path, &file_name)?;
        if full.exists() {
            return Err(AppError::new("error.fs.path_exists"));
        }

        let rel_parent = if parent_path.is_empty() {
            String::new()
        } else {
            crate::fs::paths::normalize_relative(&parent_path)?
        };
        let relative = if rel_parent.is_empty() {
            file_name.clone()
        } else {
            format!("{}/{}", rel_parent, file_name)
        };
        ensure_entity_path(&relative)?;

        let template_id = template_id.unwrap_or_else(|| resolve_template_id(root, &relative));
        let template = load_template(root, &template_id)?;
        let frontmatter = initial_frontmatter(&template, &stem);
        let body = String::new();
        let content = serialize_entity(&frontmatter, &body)?;

        if let Some(parent) = full.parent() {
            fs::create_dir_all(parent).map_err(|e| AppError::database(e.to_string()))?;
        }
        write_atomic(&full, content.as_bytes())?;
        upsert_file(db, root, &full)?;
        refresh_entity_row(db, root, &relative)?;

        Ok(parse_entity_str(&relative, &content, &template_id))
    })
}

const EVENT_ENTITY_PARENT: &str = "Worldbuilding/Eventos";

/// Crea o reutiliza ficha en `Worldbuilding/Eventos/` (§1.10, D1).
#[tauri::command]
pub fn ensure_event_entity(
    state: State<'_, ProjectState>,
    name: String,
    description: String,
    source_path: Option<String>,
) -> Result<String, AppError> {
    state.with_db(|db, root| ensure_event_entity_file(db, root, &name, &description, source_path.as_deref()))
}

pub fn ensure_event_entity_file(
    db: &crate::db::ProjectDb,
    root: &std::path::Path,
    name: &str,
    description: &str,
    source_manuscript_path: Option<&str>,
) -> Result<String, AppError> {
    let title = name.trim();
    if title.is_empty() {
        return Err(AppError::new("error.entity.name_required"));
    }

    let file_name = format!("{title}.md");
    crate::fs::paths::validate_name(title)?;

    let relative = format!("{EVENT_ENTITY_PARENT}/{file_name}");
    let full = resolve_under_root(root, &relative)?;

    if full.is_file() {
        if !description.trim().is_empty() {
            let raw = fs::read_to_string(&full).map_err(|e| AppError::database(e.to_string()))?;
            let mut doc = parse_entity_str(&relative, &raw, "event");
            if let Value::Object(ref mut map) = doc.frontmatter {
                map.insert(
                    "description".to_string(),
                    Value::String(description.trim().to_string()),
                );
            }
            let content = serialize_entity(&doc.frontmatter, &doc.body)?;
            write_atomic(&full, content.as_bytes())?;
            refresh_entity_row(db, root, &relative)?;
        }
        return Ok(relative);
    }

    if let Some(parent) = full.parent() {
        fs::create_dir_all(parent).map_err(|e| AppError::database(e.to_string()))?;
    }

    let template = load_template(root, "event")?;
    let mut frontmatter = initial_frontmatter(&template, title);
    if let Value::Object(ref mut map) = frontmatter {
        if let Some(source) = source_manuscript_path {
            let trimmed = source.trim();
            if !trimmed.is_empty() {
                map.insert("sourcePath".to_string(), Value::String(trimmed.to_string()));
            }
        }
        if !description.trim().is_empty() {
            map.insert(
                "description".to_string(),
                Value::String(description.trim().to_string()),
            );
        }
    }

    let body = String::new();
    let content = serialize_entity(&frontmatter, &body)?;
    write_atomic(&full, content.as_bytes())?;
    upsert_file(db, root, &full)?;
    refresh_entity_row(db, root, &relative)?;

    Ok(relative)
}

fn initial_frontmatter(template: &EntityTemplate, stem: &str) -> Value {
    let mut map = serde_json::Map::new();
    map.insert("title".to_string(), Value::String(stem.to_string()));
    map.insert(
        "type".to_string(),
        Value::String(template.id.clone()),
    );

    for section in &template.sections {
        for field in &section.fields {
            if field.key == "_body" || field.key == "title" {
                continue;
            }
            if let Some(def) = &field.default {
                map.insert(field.key.clone(), def.clone());
            }
        }
    }

    Value::Object(map)
}

fn write_atomic(path: &std::path::Path, bytes: &[u8]) -> Result<(), AppError> {
    let parent = path
        .parent()
        .ok_or_else(|| AppError::new("error.fs.invalid_path"))?;
    let temp = parent.join(format!(
        ".narralith-write-{}",
        std::process::id()
    ));
    fs::write(&temp, bytes).map_err(|e| AppError::database(e.to_string()))?;
    fs::rename(&temp, path).map_err(|e| AppError::database(e.to_string()))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::ProjectDb;
    use tempfile::TempDir;

    fn open_test_db(tmp: &TempDir) -> (ProjectDb, std::path::PathBuf) {
        let root = tmp.path().canonicalize().unwrap();
        let eventos = root.join("Worldbuilding").join("Eventos");
        fs::create_dir_all(&eventos).unwrap();
        (ProjectDb::open(&root).unwrap(), root)
    }

    #[test]
    fn ensure_event_entity_creates_under_worldbuilding_eventos() {
        let tmp = TempDir::new().unwrap();
        let (db, root) = open_test_db(&tmp);

        let path = ensure_event_entity_file(
            &db,
            &root,
            "Batalla del norte",
            "Primer choque",
            Some("Manuscrito/Cap1.md"),
        )
        .unwrap();

        assert_eq!(path, "Worldbuilding/Eventos/Batalla del norte.md");
        let full = root.join(path.replace('/', "\\"));
        assert!(full.is_file());
        let raw = fs::read_to_string(&full).unwrap();
        assert!(raw.contains("sourcePath: Manuscrito/Cap1.md"));
        assert!(raw.contains("type: event"));
    }

    #[test]
    fn ensure_event_entity_reuses_existing_file() {
        let tmp = TempDir::new().unwrap();
        let (db, root) = open_test_db(&tmp);

        let first = ensure_event_entity_file(&db, &root, "Duplicado", "", None).unwrap();
        let second =
            ensure_event_entity_file(&db, &root, "Duplicado", "nueva desc", None).unwrap();
        assert_eq!(first, second);
    }
}
