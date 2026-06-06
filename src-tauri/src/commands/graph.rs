//! IPC del grafo de conocimiento (Fase 8).

use tauri::State;

use crate::error::AppError;
use crate::graph::{get_graph_data, rebuild_graph_edges, GraphData, GraphDataFilters};
use crate::state::ProjectState;

#[tauri::command]
pub fn get_graph_data_cmd(
    state: State<'_, ProjectState>,
    filters: GraphDataFilters,
) -> Result<GraphData, AppError> {
    state.with_db(|db, root| get_graph_data(db, root, filters))
}

#[tauri::command]
pub fn rebuild_graph_index_cmd(state: State<'_, ProjectState>) -> Result<(), AppError> {
    state.with_db(|db, root| rebuild_graph_edges(db, root))
}

#[tauri::command]
pub fn rebuild_graph_index_async_cmd(
    state: State<'_, ProjectState>,
    app: tauri::AppHandle,
) -> Result<(), AppError> {
    let root = state.project_root()?;
    state.graph_scheduler()?.request_rebuild(app, root);
    Ok(())
}
