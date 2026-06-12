use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::audit::paths::{ensure_debug_dirs, logs_dir, settings_path};
use crate::audit::types::{AuditDebugSettings, AuditEntry};
use crate::error::AppError;

pub fn load_settings(root: &Path) -> Result<AuditDebugSettings, AppError> {
    let path = settings_path(root);
    if !path.is_file() {
        return Ok(AuditDebugSettings::default());
    }
    let raw = fs::read_to_string(&path).map_err(|e| AppError::database(e.to_string()))?;
    serde_json::from_str(&raw).map_err(|e| AppError::database(e.to_string()))
}

pub fn save_settings(root: &Path, settings: &AuditDebugSettings) -> Result<(), AppError> {
    ensure_debug_dirs(root)?;
    let path = settings_path(root);
    let json = serde_json::to_string_pretty(settings).map_err(|e| AppError::database(e.to_string()))?;
    fs::write(&path, json.as_bytes()).map_err(|e| AppError::database(e.to_string()))
}

pub fn clear_log_files(root: &Path) -> Result<(), AppError> {
    let dir = logs_dir(root);
    if !dir.is_dir() {
        return Ok(());
    }
    for entry in fs::read_dir(&dir).map_err(|e| AppError::database(e.to_string()))? {
        let entry = entry.map_err(|e| AppError::database(e.to_string()))?;
        let path = entry.path();
        if path.is_file() {
            fs::remove_file(&path).map_err(|e| AppError::database(e.to_string()))?;
        }
    }
    Ok(())
}

pub fn new_session_log_path(root: &Path) -> Result<PathBuf, AppError> {
    ensure_debug_dirs(root)?;
    let boot_id = format!("{}-{}", unix_ms_now(), std::process::id());
    Ok(logs_dir(root).join(format!("session-{boot_id}.ndjson")))
}

pub fn append_entry(log_path: &Path, entry: &AuditEntry) -> Result<(), AppError> {
    let line = serde_json::to_string(entry).map_err(|e| AppError::database(e.to_string()))?;
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
        .map_err(|e| AppError::database(e.to_string()))?;
    writeln!(file, "{line}").map_err(|e| AppError::database(e.to_string()))?;
    Ok(())
}

fn unix_ms_now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn one_shot_clear_removes_log_files() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        ensure_debug_dirs(root).unwrap();
        let log = new_session_log_path(root).unwrap();
        fs::write(&log, b"{}\n").unwrap();
        assert!(log.is_file());

        clear_log_files(root).unwrap();
        assert_eq!(fs::read_dir(logs_dir(root)).unwrap().count(), 0);
    }

    #[test]
    fn settings_round_trip() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        let mut settings = AuditDebugSettings::default();
        settings.clear_logs_on_next_boot = true;
        save_settings(root, &settings).unwrap();
        let loaded = load_settings(root).unwrap();
        assert!(loaded.clear_logs_on_next_boot);
    }

    #[test]
    fn append_entry_writes_ndjson_line() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        let log = new_session_log_path(root).unwrap();
        let entry = AuditEntry {
            id: "be-1".into(),
            ts: 1,
            level: crate::audit::types::AuditLevel::Info,
            domain: "system".into(),
            event: "obs.test".into(),
            message: None,
            correlation_id: None,
            payload: None,
            source: "backend".into(),
            duration_ms: None,
        };
        append_entry(&log, &entry).unwrap();
        let content = fs::read_to_string(&log).unwrap();
        assert!(content.contains("\"event\":\"obs.test\""));
    }
}
