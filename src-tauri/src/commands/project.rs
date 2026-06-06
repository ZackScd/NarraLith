//! Ciclo de vida del proyecto: crear, abrir, cerrar (Fase 1.1.5).

use std::path::{Path, PathBuf};

use tauri::AppHandle;
use tauri::State;

use crate::db::{ProjectDb, NARRALITH_DIR};
use crate::error::AppError;
use crate::fs::adopt::ensure_project_cache;
use crate::fs::calendar_config::ensure_calendar_config;
use crate::fs::reconcile::full_resync;
use crate::fs::recents::{self, RecentProjectEntry};
use crate::fs::{create_project_at, sanitize_folder_name};
use crate::models::ProjectMeta;
use crate::state::{project_meta_from_db, ProjectState};

fn open_project_session(
    app: &AppHandle,
    state: &ProjectState,
    project_root: PathBuf,
) -> Result<ProjectMeta, AppError> {
    if !project_root.is_dir() {
        return Err(AppError::new("error.project.not_found"));
    }

    if state.is_open().unwrap_or(false) {
        state.close(app)?;
    }

    let db = if project_root.join(NARRALITH_DIR).is_dir() {
        ensure_calendar_config(&project_root)?;
        ProjectDb::open(&project_root)?
    } else {
        ensure_project_cache(&project_root)?
    };

    full_resync(&db, &project_root)?;

    let now = unix_ms_now();
    db.set_meta("updated_at", &now.to_string())?;

    let meta = project_meta_from_db(&db, &project_root)?;

    state.open_session(app, project_root, db)?;

    Ok(meta)
}

fn register_recent(app: &AppHandle, meta: &ProjectMeta) -> Result<(), AppError> {
    recents::touch_recent(app, Path::new(&meta.root_path), &meta.name)
}

#[tauri::command]
pub fn create_project(
    app: AppHandle,
    state: State<'_, ProjectState>,
    parent_path: String,
    name: String,
    template_id: String,
    locale: Option<String>,
) -> Result<ProjectMeta, AppError> {
    let _folder = sanitize_folder_name(&name)?;
    let loc = locale
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| "es".to_string());
    let root = create_project_at(Path::new(&parent_path), &name, &template_id, &loc)?;
    let meta = open_project_session(&app, &state, root)?;
    let _ = register_recent(&app, &meta);
    Ok(meta)
}

#[tauri::command]
pub fn open_project(
    app: AppHandle,
    state: State<'_, ProjectState>,
    path: String,
) -> Result<ProjectMeta, AppError> {
    let root = PathBuf::from(path);
    let meta = open_project_session(&app, &state, root)?;
    let _ = register_recent(&app, &meta);
    Ok(meta)
}

#[tauri::command]
pub fn close_project(
    app: AppHandle,
    state: State<'_, ProjectState>,
) -> Result<(), AppError> {
    state.close(&app)
}

#[tauri::command]
pub fn get_active_project(state: State<'_, ProjectState>) -> Result<Option<ProjectMeta>, AppError> {
    if !state.is_open()? {
        return Ok(None);
    }
    Ok(Some(state.meta()?))
}

#[tauri::command]
pub fn list_recent_projects(app: AppHandle) -> Result<Vec<RecentProjectEntry>, AppError> {
    recents::list_recents(&app)
}

#[tauri::command]
pub fn remove_recent_project(app: AppHandle, path: String) -> Result<(), AppError> {
    recents::remove_recent(&app, &path)
}

fn unix_ms_now() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
