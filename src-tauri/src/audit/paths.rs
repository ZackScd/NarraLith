use std::path::{Path, PathBuf};

use crate::error::AppError;

/// Raíz `{repo}/_debug` (compile-time: `src-tauri/../_debug`).
pub fn repo_debug_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..").join("_debug")
}

pub fn settings_path(root: &Path) -> PathBuf {
    root.join("settings.json")
}

pub fn logs_dir(root: &Path) -> PathBuf {
    root.join("logs")
}

pub fn render_logs_dir(root: &Path) -> PathBuf {
    root.join("render-logs")
}

pub fn ensure_debug_dirs(root: &Path) -> Result<(), AppError> {
    std::fs::create_dir_all(logs_dir(root)).map_err(|e| AppError::database(e.to_string()))?;
    std::fs::create_dir_all(render_logs_dir(root)).map_err(|e| AppError::database(e.to_string()))
}

pub fn normalize_for_ipc(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}
