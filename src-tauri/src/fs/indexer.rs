//! Indexación ligera de archivos `.md` en SQLite (sin parser de bloques).

use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::Path;

use crate::db::ProjectDb;
use crate::error::AppError;
use crate::fs::entity_aliases::{aliases_to_json, read_aliases_from_markdown};

const SKIP_DIRS: &[&str] = &[".git", ".narralith", "node_modules"];

/// ID estable del proyecto derivado de la ruta canónica.
pub fn stable_project_id(project_root: &Path) -> String {
    let canonical = project_root
        .canonicalize()
        .unwrap_or_else(|_| project_root.to_path_buf());
    let mut hasher = DefaultHasher::new();
    canonical.to_string_lossy().hash(&mut hasher);
    format!("proj_{:016x}", hasher.finish())
}

/// Recorre el FS del proyecto e inserta/actualiza filas en `entities` (status `active`).
pub fn index_markdown_files(db: &ProjectDb, project_root: &Path) -> Result<(), AppError> {
    let now = unix_ms_now();
    let mut stack = vec![project_root.to_path_buf()];

    while let Some(dir) = stack.pop() {
        let entries = fs::read_dir(&dir).map_err(|e| AppError::database(e.to_string()))?;

        for entry in entries {
            let entry = entry.map_err(|e| AppError::database(e.to_string()))?;
            let path = entry.path();
            let file_name = entry.file_name();
            let name = file_name.to_string_lossy();

            if path.is_dir() {
                if SKIP_DIRS.contains(&name.as_ref()) {
                    continue;
                }
                stack.push(path);
                continue;
            }

            if path.extension().and_then(|e| e.to_str()) != Some("md") {
                continue;
            }

            if name.starts_with('.') {
                continue;
            }

            let relative = path
                .strip_prefix(project_root)
                .map_err(|e| AppError::database(e.to_string()))?
                .to_string_lossy()
                .replace('\\', "/");

            let entity_name = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("Untitled")
                .to_string();

            let category = infer_category(&relative);
            let entity_id = entity_id_for_path(&relative);
            let aliases_json = aliases_to_json(&read_aliases_from_markdown(&path));

            db.connection()
                .execute(
                    "INSERT INTO entities (id, name, path, category, color, aliases, metadata, created_at, updated_at, status)
                     VALUES (?1, ?2, ?3, ?4, NULL, ?5, '{}', ?6, ?6, 'active')
                     ON CONFLICT(path) DO UPDATE SET
                       name = excluded.name,
                       category = excluded.category,
                       aliases = excluded.aliases,
                       updated_at = excluded.updated_at,
                       status = 'active'",
                    rusqlite::params![
                        entity_id,
                        entity_name,
                        relative,
                        category,
                        aliases_json,
                        now
                    ],
                )
                .map_err(|e| AppError::database(e.to_string()))?;
        }
    }

    Ok(())
}

/// ID estable para una ruta relativa de entidad.
pub fn entity_id_for_path(relative_path: &str) -> String {
    let mut hasher = DefaultHasher::new();
    relative_path.hash(&mut hasher);
    format!("ent_{:016x}", hasher.finish())
}

/// Infiere categoría taxonómica por prefijo de carpeta (Fase 1; sin parser YAML).
pub fn infer_category(relative_path: &str) -> &'static str {
    let normalized = relative_path.replace('\\', "/");
    let lower = normalized.to_lowercase();

    if lower.starts_with("manuscrito/") || lower == "manuscrito" {
        return "manuscript";
    }

    if !lower.starts_with("worldbuilding/") {
        return "custom";
    }

    if lower.contains("/eventos") {
        return "event";
    }
    if lower.contains("/personajes") {
        return "character";
    }
    if lower.contains("/ubicaciones") {
        return "location";
    }
    if lower.contains("/facciones") {
        return "faction";
    }
    if lower.contains("/lore_y_mitos") || lower.contains("/lore") {
        return "lore";
    }
    if lower.contains("/sistemas_de_poder") {
        return "power_system";
    }
    if lower.contains("/naturaleza") {
        return "nature";
    }
    if lower.contains("/objetos_y_artefactos") {
        return "object";
    }
    if lower.contains("/sociedad_y_cultura") {
        return "society";
    }

    "custom"
}

fn unix_ms_now() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn infer_category_from_worldbuilding_paths() {
        assert_eq!(
            infer_category("Worldbuilding/Personajes/Principal/Hero.md"),
            "character"
        );
        assert_eq!(
            infer_category("Manuscrito/Volumen 1/Escena_1.md"),
            "manuscript"
        );
        assert_eq!(
            infer_category("Worldbuilding/Eventos/Batalla.md"),
            "event"
        );
    }
}
