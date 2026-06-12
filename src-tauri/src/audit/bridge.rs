//! Puente dev-only: instrumentación Rust → NDJSON vía `AuditState`.

#[cfg(debug_assertions)]
use tauri::{AppHandle, Manager};

#[cfg(debug_assertions)]
use super::types::AuditLevel;
#[cfg(debug_assertions)]
use super::AuditState;

#[cfg(debug_assertions)]
pub fn log_event(app: &AppHandle, domain: &str, event: &str, payload: serde_json::Value) {
    if let Some(state) = app.try_state::<AuditState>() {
        state.log_backend(AuditLevel::Info, domain, event, Some(payload));
    }
}

#[cfg(debug_assertions)]
pub fn log_fs_changed(
    app: &AppHandle,
    kind: &str,
    paths: &[String],
    from_path: &Option<String>,
) {
    log_event(
        app,
        "fs",
        "obs.fs.reconcile.emit",
        serde_json::json!({
            "kind": kind,
            "paths": paths,
            "fromPath": from_path,
        }),
    );
}

#[cfg(debug_assertions)]
pub fn log_ghost(app: &AppHandle, path: &str, trigger: &str) {
    log_event(
        app,
        "fs",
        "obs.fs.reconcile.ghost",
        serde_json::json!({
            "path": path,
            "trigger": trigger,
        }),
    );
}

#[cfg(debug_assertions)]
pub fn log_watcher_raw(app: &AppHandle, path: &str, exists: bool) {
    if let Some(state) = app.try_state::<AuditState>() {
        state.log_backend(
            AuditLevel::Debug,
            "watcher",
            "obs.fs.watcher.raw",
            Some(serde_json::json!({
                "path": path,
                "exists": exists,
                "kind": if exists { "modify" } else { "remove" },
            })),
        );
    }
}

#[cfg(debug_assertions)]
pub fn log_save_manuscript(
    app: &AppHandle,
    path: &str,
    segment_count: usize,
    entity_paths: &[String],
) {
    log_event(
        app,
        "ipc",
        "obs.rust.save_manuscript",
        serde_json::json!({
            "path": path,
            "segmentCount": segment_count,
            "touchedEntityPaths": entity_paths,
        }),
    );
}

#[cfg(not(debug_assertions))]
pub fn log_fs_changed(
    _app: &tauri::AppHandle,
    _kind: &str,
    _paths: &[String],
    _from_path: &Option<String>,
) {
}

#[cfg(not(debug_assertions))]
pub fn log_ghost(_app: &tauri::AppHandle, _path: &str, _trigger: &str) {}

#[cfg(not(debug_assertions))]
pub fn log_watcher_raw(_app: &tauri::AppHandle, _path: &str, _exists: bool) {}

#[cfg(not(debug_assertions))]
pub fn log_save_manuscript(
    _app: &tauri::AppHandle,
    _path: &str,
    _segment_count: usize,
    _entity_paths: &[String],
) {}
