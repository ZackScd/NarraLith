use tauri::State;

use crate::audit::state::{AuditSettingsPatch, AuditState};
use crate::audit::types::{
    ActionLogChannel, ActionLogClearTarget, AuditConfigResponse, AuditEntry, AuditLogPathResponse,
    RenderLogChannel, RenderLogClearTarget,
};
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
pub fn audit_set_render_log_enabled(
    state: State<'_, AuditState>,
    enabled: bool,
) -> Result<AuditConfigResponse, AppError> {
    state.set_render_log_enabled(enabled)
}

#[tauri::command]
pub fn audit_set_render_verbose_enabled(
    state: State<'_, AuditState>,
    enabled: bool,
) -> Result<AuditConfigResponse, AppError> {
    state.set_render_verbose_enabled(enabled)
}

#[tauri::command]
pub fn audit_set_action_log_enabled(
    state: State<'_, AuditState>,
    enabled: bool,
) -> Result<AuditConfigResponse, AppError> {
    state.set_action_log_enabled(enabled)
}

#[tauri::command]
pub fn audit_set_action_verbose_enabled(
    state: State<'_, AuditState>,
    enabled: bool,
) -> Result<AuditConfigResponse, AppError> {
    state.set_action_verbose_enabled(enabled)
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
pub fn audit_clear_all_logs(state: State<'_, AuditState>) -> Result<AuditConfigResponse, AppError> {
    state.clear_all_logs()
}

#[tauri::command]
pub fn audit_clear_render_logs(
    state: State<'_, AuditState>,
    target: RenderLogClearTarget,
) -> Result<AuditConfigResponse, AppError> {
    state.clear_render_logs(target)
}

#[tauri::command]
pub fn audit_append_entry(
    state: State<'_, AuditState>,
    entry: AuditEntry,
) -> Result<(), AppError> {
    state.append_entry(entry)
}

#[tauri::command]
pub fn audit_append_render_entry(
    state: State<'_, AuditState>,
    channel: RenderLogChannel,
    entry: AuditEntry,
) -> Result<(), AppError> {
    state.append_render_entry(channel, entry)
}

#[tauri::command]
pub fn audit_append_action_entry(
    state: State<'_, AuditState>,
    channel: ActionLogChannel,
    entry: AuditEntry,
) -> Result<(), AppError> {
    state.append_action_entry(channel, entry)
}

#[tauri::command]
pub fn audit_clear_action_logs(
    state: State<'_, AuditState>,
    target: ActionLogClearTarget,
) -> Result<AuditConfigResponse, AppError> {
    state.clear_action_logs(target)
}

#[tauri::command]
pub fn audit_get_log_path(state: State<'_, AuditState>) -> Result<AuditLogPathResponse, AppError> {
    state.log_path()
}
