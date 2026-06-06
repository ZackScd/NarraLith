//! Rutas recientes en AppData del SO (preferencia de máquina, no parte de la obra).

use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri::Manager;

use crate::error::AppError;

const RECENTS_FILE: &str = "recents.json";
const MAX_RECENTS: usize = 10;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentProjectEntry {
    pub path: String,
    pub name: String,
    pub last_opened_at: i64,
    pub exists: bool,
}

#[derive(Debug, Default, Serialize, Deserialize)]
struct RecentsFile {
    entries: Vec<RecentEntryRaw>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct RecentEntryRaw {
    path: String,
    name: String,
    last_opened_at: i64,
}

fn recents_path(app: &AppHandle) -> Result<PathBuf, AppError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::database(e.to_string()))?;
    fs::create_dir_all(&dir).map_err(|e| AppError::database(e.to_string()))?;
    Ok(dir.join(RECENTS_FILE))
}

fn load_raw(path: &Path) -> Result<RecentsFile, AppError> {
    if !path.exists() {
        return Ok(RecentsFile::default());
    }
    let bytes = fs::read(path).map_err(|e| AppError::database(e.to_string()))?;
    serde_json::from_slice(&bytes).map_err(|e| AppError::database(e.to_string()))
}

fn save_raw(path: &Path, file: &RecentsFile) -> Result<(), AppError> {
    let json = serde_json::to_vec_pretty(file).map_err(|e| AppError::database(e.to_string()))?;
    fs::write(path, json).map_err(|e| AppError::database(e.to_string()))
}

fn normalize_path(path: &str) -> String {
    PathBuf::from(path)
        .canonicalize()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| path.replace('/', std::path::MAIN_SEPARATOR_STR))
}

/// Registra o actualiza una ruta tras abrir/crear proyecto explícitamente.
pub fn touch_recent(app: &AppHandle, project_path: &Path, display_name: &str) -> Result<(), AppError> {
    let file_path = recents_path(app)?;
    let mut data = load_raw(&file_path)?;

    let normalized = normalize_path(&project_path.to_string_lossy());
    let now = unix_ms_now();

    data.entries.retain(|e| normalize_path(&e.path) != normalized);
    data.entries.insert(
        0,
        RecentEntryRaw {
            path: normalized.clone(),
            name: display_name.to_string(),
            last_opened_at: now,
        },
    );
    data.entries.truncate(MAX_RECENTS);

    save_raw(&file_path, &data)
}

pub fn list_recents(app: &AppHandle) -> Result<Vec<RecentProjectEntry>, AppError> {
    let file_path = recents_path(app)?;
    let data = load_raw(&file_path)?;

    Ok(data
        .entries
        .into_iter()
        .map(|e| {
            let exists = Path::new(&e.path).is_dir();
            RecentProjectEntry {
                path: e.path,
                name: e.name,
                last_opened_at: e.last_opened_at,
                exists,
            }
        })
        .collect())
}

pub fn remove_recent(app: &AppHandle, path: &str) -> Result<(), AppError> {
    let file_path = recents_path(app)?;
    let mut data = load_raw(&file_path)?;
    let normalized = normalize_path(path);
    data.entries.retain(|e| normalize_path(&e.path) != normalized);
    save_raw(&file_path, &data)
}

fn unix_ms_now() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
