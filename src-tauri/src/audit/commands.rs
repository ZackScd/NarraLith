use tauri::State;

use crate::audit::state::{AuditSettingsPatch, AuditState};
use crate::audit::types::{AuditConfigResponse, AuditEntry, AuditLogPathResponse};
use crate::error::AppError;

#[tauri::command]
pub fn audit_bootstrap(state: State<'_, AuditState>) -> Result<AuditConfigResponse, AppError> {
    state.bootstrap()
}

#[tauri::command]
pub fn audit_get_config(state: State<'_, AuditState>) -> Result<AuditConfigResponse, AppError> {
    state.get_config()
}

#[tauri::command]
pub fn audit_set_enabled(
    state: State<'_, AuditState>,
    enabled: bool,
) -> Result<AuditConfigResponse, AppError> {
    state.set_enabled(enabled)
}

#[tauri::command]
pub fn audit_patch_settings(
    state: State<'_, AuditState>,
    patch: AuditSettingsPatch,
) -> Result<AuditConfigResponse, AppError> {
    state.patch_settings(patch)
}

#[tauri::command]
pub fn audit_clear_logs(state: State<'_, AuditState>) -> Result<AuditConfigResponse, AppError> {
    state.clear_logs()
}

#[tauri::command]
pub fn audit_append_entry(
    state: State<'_, AuditState>,
    entry: AuditEntry,
) -> Result<(), AppError> {
    state.append_entry(entry)
}

#[tauri::command]
pub fn audit_get_log_path(state: State<'_, AuditState>) -> Result<AuditLogPathResponse, AppError> {
    state.log_path()
}
