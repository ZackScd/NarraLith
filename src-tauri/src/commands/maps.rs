//! IPC de mapas interactivos (Fase 7).

use tauri::State;

use crate::error::AppError;
use crate::fs::maps_store::{
    create_blank_map, create_map, get_map_data, get_map_drawing, get_map_sketch, get_map_state_at,
    import_map_image, import_overlay_image, list_maps, read_project_image_data_url,
    save_map_canvas_png, save_map_data, save_map_drawing, save_map_sketch, MapData, MapStateAt,
    MapSummary,
};
use crate::state::ProjectState;

#[tauri::command]
pub fn list_project_maps(state: State<'_, ProjectState>) -> Result<Vec<MapSummary>, AppError> {
    state.with_db(|_db, root| list_maps(root))
}

#[tauri::command]
pub fn get_map_data_cmd(state: State<'_, ProjectState>, map_id: String) -> Result<MapData, AppError> {
    state.with_db(|_db, root| get_map_data(root, &map_id))
}

#[tauri::command]
pub fn save_map_data_cmd(state: State<'_, ProjectState>, data: MapData) -> Result<(), AppError> {
    state.with_db(|_db, root| save_map_data(root, &data))
}

#[tauri::command]
pub fn create_blank_map_cmd(
    state: State<'_, ProjectState>,
    name: String,
    width: u32,
    height: u32,
) -> Result<MapSummary, AppError> {
    state.with_db(|_db, root| create_blank_map(root, &name, width, height))
}

#[tauri::command]
pub fn create_map_cmd(
    state: State<'_, ProjectState>,
    name: String,
    source_image_path: String,
) -> Result<MapSummary, AppError> {
    state.with_db(|_db, root| create_map(root, &name, &source_image_path))
}

#[tauri::command]
pub fn import_map_image_cmd(
    state: State<'_, ProjectState>,
    map_id: String,
    source_image_path: String,
) -> Result<MapSummary, AppError> {
    state.with_db(|_db, root| import_map_image(root, &map_id, &source_image_path))
}

#[tauri::command]
pub fn import_overlay_image_cmd(
    state: State<'_, ProjectState>,
    source_image_path: String,
) -> Result<(String, u32, u32), AppError> {
    state.with_db(|_db, root| import_overlay_image(root, &source_image_path))
}

#[tauri::command]
pub fn get_map_state_at_cmd(
    state: State<'_, ProjectState>,
    map_id: String,
    timestamp: Option<String>,
) -> Result<MapStateAt, AppError> {
    state.with_db(|_db, root| {
        get_map_state_at(
            root,
            &map_id,
            timestamp.as_deref(),
        )
    })
}

#[tauri::command]
pub fn read_project_image_cmd(
    state: State<'_, ProjectState>,
    relative_path: String,
) -> Result<String, AppError> {
    state.with_db(|_db, root| read_project_image_data_url(root, &relative_path))
}

#[tauri::command]
pub fn get_map_drawing_cmd(
    state: State<'_, ProjectState>,
    map_id: String,
) -> Result<Option<serde_json::Value>, AppError> {
    state.with_db(|_db, root| get_map_drawing(root, &map_id))
}

#[tauri::command]
pub fn save_map_drawing_cmd(
    state: State<'_, ProjectState>,
    map_id: String,
    drawing: serde_json::Value,
) -> Result<(), AppError> {
    state.with_db(|_db, root| save_map_drawing(root, &map_id, drawing))
}

#[tauri::command]
pub fn save_map_canvas_png_cmd(
    state: State<'_, ProjectState>,
    map_id: String,
    png_base64: String,
) -> Result<MapSummary, AppError> {
    state.with_db(|_db, root| save_map_canvas_png(root, &map_id, &png_base64))
}

#[tauri::command]
pub fn get_map_sketch_cmd(
    state: State<'_, ProjectState>,
    map_id: String,
) -> Result<Option<serde_json::Value>, AppError> {
    state.with_db(|_db, root| get_map_sketch(root, &map_id))
}

#[tauri::command]
pub fn save_map_sketch_cmd(
    state: State<'_, ProjectState>,
    map_id: String,
    sketch: serde_json::Value,
) -> Result<(), AppError> {
    state.with_db(|_db, root| save_map_sketch(root, &map_id, sketch))
}
