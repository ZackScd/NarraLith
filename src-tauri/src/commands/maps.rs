//! IPC mapas Era III (esquema v2).

use tauri::State;

use crate::error::AppError;
use crate::fs::maps_store::{
    create_blank_map, get_map_document, get_map_drawing, list_maps, read_project_image_data_url,
    save_map_document, save_map_drawing, MapDocumentV1, MapDrawingV2, MapSummaryV2,
};
use crate::state::ProjectState;

#[tauri::command]
pub fn list_project_maps(state: State<'_, ProjectState>) -> Result<Vec<MapSummaryV2>, AppError> {
    state.with_db(|_db, root| list_maps(root))
}

#[tauri::command]
pub fn get_map_document_cmd(
    state: State<'_, ProjectState>,
    map_id: String,
) -> Result<MapDocumentV1, AppError> {
    state.with_db(|_db, root| get_map_document(root, &map_id))
}

#[tauri::command]
pub fn save_map_document_cmd(
    state: State<'_, ProjectState>,
    document: MapDocumentV1,
) -> Result<(), AppError> {
    state.with_db(|_db, root| save_map_document(root, &document))
}

#[tauri::command]
pub fn get_map_drawing_cmd(
    state: State<'_, ProjectState>,
    map_id: String,
) -> Result<MapDrawingV2, AppError> {
    state.with_db(|_db, root| get_map_drawing(root, &map_id))
}

#[tauri::command]
pub fn save_map_drawing_cmd(
    state: State<'_, ProjectState>,
    map_id: String,
    drawing: MapDrawingV2,
) -> Result<(), AppError> {
    state.with_db(|_db, root| save_map_drawing(root, &map_id, &drawing))
}

#[tauri::command]
pub fn create_blank_map_cmd(
    state: State<'_, ProjectState>,
    name: String,
    width: u32,
    height: u32,
) -> Result<MapSummaryV2, AppError> {
    state.with_db(|_db, root| create_blank_map(root, &name, width, height))
}

#[tauri::command]
pub fn read_project_image_cmd(
    state: State<'_, ProjectState>,
    relative_path: String,
) -> Result<String, AppError> {
    state.with_db(|_db, root| read_project_image_data_url(root, &relative_path))
}
