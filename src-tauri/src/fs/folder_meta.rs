//! Metadatos ocultos de carpeta (`.folder.md`) para la vista de tarjetas (Fase 4.4).

use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::entity::document::{parse_entity_str, serialize_entity};
use crate::error::AppError;
use crate::fs::paths::{normalize_relative, resolve_under_root};
use crate::parser::parse_segment;

pub const FOLDER_META_FILENAME: &str = ".folder.md";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct FolderMeta {
    #[serde(default)]
    pub description: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
}

pub fn folder_meta_relative_path(dir_relative: &str) -> Result<String, AppError> {
    let dir = normalize_relative(dir_relative)?;
    if dir.is_empty() {
        return Err(AppError::new("error.folder.invalid_path"));
    }
    Ok(format!("{dir}/{FOLDER_META_FILENAME}"))
}

pub fn get_folder_meta(project_root: &Path, relative_dir: &str) -> Result<FolderMeta, AppError> {
    let dir = normalize_relative(relative_dir)?;
    ensure_directory(project_root, &dir)?;

    let meta_path = folder_meta_relative_path(&dir)?;
    let abs = resolve_under_root(project_root, &meta_path)?;
    if !abs.is_file() {
        return Ok(FolderMeta::default());
    }

    let raw = fs::read_to_string(&abs).map_err(|e| AppError::database(e.to_string()))?;
    Ok(parse_folder_meta(&raw))
}

pub fn set_folder_description(
    project_root: &Path,
    relative_dir: &str,
    description: String,
    image_path: Option<String>,
    title: Option<String>,
) -> Result<(), AppError> {
    let dir = normalize_relative(relative_dir)?;
    ensure_directory(project_root, &dir)?;

    if let Some(ref img) = image_path {
        let trimmed = img.trim();
        if !trimmed.is_empty() {
            normalize_relative(trimmed)?;
        }
    }

    let meta_path = folder_meta_relative_path(&dir)?;
    let abs = resolve_under_root(project_root, &meta_path)?;

    let frontmatter = json!({
        "description": description.trim(),
        "imagePath": image_path.filter(|s| !s.trim().is_empty()),
        "title": title.filter(|s| !s.trim().is_empty()),
    });

    let body = if abs.is_file() {
        let raw = fs::read_to_string(&abs).map_err(|e| AppError::database(e.to_string()))?;
        parse_entity_str(&meta_path, &raw, "custom").body
    } else {
        String::new()
    };

    let content = serialize_entity(&frontmatter, &body)?;
    if let Some(parent) = abs.parent() {
        fs::create_dir_all(parent).map_err(|e| AppError::database(e.to_string()))?;
    }
    fs::write(&abs, content).map_err(|e| AppError::database(e.to_string()))?;
    Ok(())
}

fn ensure_directory(project_root: &Path, relative_dir: &str) -> Result<(), AppError> {
    let abs = resolve_under_root(project_root, relative_dir)?;
    if !abs.is_dir() {
        return Err(AppError::new("error.folder.not_found"));
    }
    Ok(())
}

fn parse_folder_meta(raw: &str) -> FolderMeta {
    let parts = parse_segment(raw);
    let obj = parts.metadata.as_object();
    FolderMeta {
        description: string_field(obj, "description"),
        image_path: optional_string_field(obj, "imagePath").or(optional_string_field(obj, "image_path")),
        title: optional_string_field(obj, "title"),
    }
}

fn string_field(obj: Option<&serde_json::Map<String, Value>>, key: &str) -> String {
    obj.and_then(|m| m.get(key))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_default()
}

fn optional_string_field(obj: Option<&serde_json::Map<String, Value>>, key: &str) -> Option<String> {
    obj.and_then(|m| m.get(key))
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

/// Cuenta fichas activas en el subárbol (recursivo), excluyendo `.folder.md`.
pub fn count_entities_in_tree(
    conn: &rusqlite::Connection,
    relative_dir: &str,
) -> Result<u32, AppError> {
    let dir = normalize_relative(relative_dir)?;
    let pattern = if dir.is_empty() {
        "%".to_string()
    } else {
        format!("{dir}/%")
    };

    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM entities
             WHERE status = 'active'
               AND path LIKE ?1 ESCAPE '\\'
               AND path NOT LIKE '%/.folder.md' ESCAPE '\\'",
            [pattern],
            |row| row.get(0),
        )
        .map_err(|e| AppError::database(e.to_string()))?;

    Ok(count.max(0) as u32)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::ProjectDb;
    use tempfile::TempDir;

    #[test]
    fn round_trip_folder_description() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        let dir = root.join("Worldbuilding/Personajes");
        fs::create_dir_all(&dir).unwrap();

        set_folder_description(
            root,
            "Worldbuilding/Personajes",
            "Héroes y villanos".into(),
            Some("Imagenes/Retratos/portada.png".into()),
            Some("Personajes".into()),
        )
        .unwrap();

        let meta = get_folder_meta(root, "Worldbuilding/Personajes").unwrap();
        assert_eq!(meta.description, "Héroes y villanos");
        assert_eq!(
            meta.image_path.as_deref(),
            Some("Imagenes/Retratos/portada.png")
        );
        assert_eq!(meta.title.as_deref(), Some("Personajes"));
    }

    #[test]
    fn count_entities_recursive() {
        let tmp = TempDir::new().unwrap();
        let db = ProjectDb::open(tmp.path()).unwrap();
        let conn = db.connection();
        let now = 1_i64;

        conn.execute(
            "INSERT INTO entities (id, name, path, category, color, aliases, metadata, created_at, updated_at, status)
             VALUES
             ('e1', 'A', 'Worldbuilding/Personajes/A.md', 'character', NULL, '[]', '{}', ?1, ?1, 'active'),
             ('e2', 'B', 'Worldbuilding/Personajes/Sub/B.md', 'character', NULL, '[]', '{}', ?1, ?1, 'active'),
             ('e3', 'C', 'Worldbuilding/Ubicaciones/C.md', 'location', NULL, '[]', '{}', ?1, ?1, 'active')",
            rusqlite::params![now],
        )
        .unwrap();

        assert_eq!(
            count_entities_in_tree(conn, "Worldbuilding/Personajes").unwrap(),
            2
        );
        assert_eq!(count_entities_in_tree(conn, "Worldbuilding/Ubicaciones").unwrap(), 1);
    }
}
