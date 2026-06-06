//! Adopta una carpeta existente del usuario: caché `.narralith` sin tocar sus `.md`.

use std::fs;
use std::path::Path;

use crate::db::{ProjectDb, NARRALITH_DIR};
use crate::error::AppError;
use crate::fs::calendar_config::ensure_calendar_config;
use crate::fs::maps_store::ensure_maps_dir;
use crate::fs::indexer::stable_project_id;
use crate::git::init_repository;

const DEFAULT_TAXONOMY_JSON: &str = include_str!("../../resources/defaults/taxonomy.json");

/// Asegura `.narralith/`, metadatos mínimos y Git local si el usuario abrió una carpeta ajena.
pub fn ensure_project_cache(project_root: &Path) -> Result<ProjectDb, AppError> {
    if !project_root.is_dir() {
        return Err(AppError::new("error.project.not_found"));
    }

    let narralith = project_root.join(NARRALITH_DIR);
    fs::create_dir_all(&narralith).map_err(|e| AppError::database(e.to_string()))?;

    let taxonomy_path = narralith.join("taxonomy.json");
    if !taxonomy_path.exists() {
        fs::write(&taxonomy_path, DEFAULT_TAXONOMY_JSON.as_bytes())
            .map_err(|e| AppError::database(e.to_string()))?;
    }

    init_repository(project_root)?;
    ensure_calendar_config(project_root)?;
    ensure_maps_dir(project_root)?;

    let db = ProjectDb::open(project_root)?;

    if db.get_meta("id")?.is_none() {
        db.set_meta("id", &stable_project_id(project_root))?;
    }

    if db.get_meta("name")?.is_none() {
        let folder_name = project_root
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Project");
        db.set_meta("name", folder_name)?;
    }

    if db.get_meta("template_id")?.is_none() {
        db.set_meta("template_id", "adopted")?;
    }

    let now = unix_ms_now();
    if db.get_meta("created_at")?.is_none() {
        db.set_meta("created_at", &now.to_string())?;
    }
    db.set_meta("updated_at", &now.to_string())?;

    if db.get_meta("locale")?.is_none() {
        db.set_meta("locale", "en")?;
    }

    Ok(db)
}

fn unix_ms_now() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
