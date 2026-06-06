//! IPC del plothole checker (Fase 6.3).

use tauri::{AppHandle, Emitter, State};

use crate::checker::{dismiss_issue, ConsistencyIssue, ConsistencyScheduler};
use crate::error::AppError;
use crate::state::ProjectState;

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ConsistencyUpdatedPayload {
    issues: Vec<ConsistencyIssue>,
}

#[tauri::command]
pub fn get_consistency_issues(
    state: State<'_, ProjectState>,
) -> Result<Vec<ConsistencyIssue>, AppError> {
    state.with_db(|_db, root| ConsistencyScheduler::run_now(root))
}

#[tauri::command]
pub fn dismiss_consistency_issue(
    app: AppHandle,
    state: State<'_, ProjectState>,
    issue_id: String,
) -> Result<Vec<ConsistencyIssue>, AppError> {
    let issues = state.with_db(|_db, root| {
        dismiss_issue(root, &issue_id)?;
        ConsistencyScheduler::run_now(root)
    })?;
    let _ = app.emit(
        "consistency-updated",
        ConsistencyUpdatedPayload {
            issues: issues.clone(),
        },
    );
    Ok(issues)
}
