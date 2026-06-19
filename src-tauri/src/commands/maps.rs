//! IPC mapas Era III (esquema v2).

use tauri::State;

use crate::error::AppError;
use crate::fs::maps_store::{
    create_blank_map, create_map, create_map_secondary, crop_map_canvas, delete_map_secondary,
    expand_map_canvas, get_map_document, get_map_drawing, get_map_secondary, get_maps_session,
    list_map_secondaries, list_maps, read_project_image_data_url, record_map_viewed,
    save_map_document, save_map_drawing, save_map_secondary, set_default_on_open,
    set_open_preference, update_map_secondary_meta, MapCreateMode, MapDocumentV1, MapDrawingV2,
    MapSecondaryDrawingFileV1, MapSecondaryMetaPatch, MapSessionV2, MapSummaryV2, OpenPreference,
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
pub fn create_map_cmd(
    state: State<'_, ProjectState>,
    name: String,
    mode: MapCreateMode,
    width: Option<u32>,
    height: Option<u32>,
    source_path: Option<String>,
) -> Result<MapSummaryV2, AppError> {
    state.with_db(|_db, root| {
        create_map(
            root,
            &name,
            mode,
            width,
            height,
            source_path.as_deref(),
        )
    })
}

#[tauri::command]
pub fn expand_map_canvas_cmd(
    state: State<'_, ProjectState>,
    map_id: String,
    add_right: u32,
    add_bottom: u32,
) -> Result<MapDocumentV1, AppError> {
    state.with_db(|_db, root| expand_map_canvas(root, &map_id, add_right, add_bottom))
}

#[tauri::command]
pub fn crop_map_canvas_cmd(
    state: State<'_, ProjectState>,
    map_id: String,
    new_width: u32,
    new_height: u32,
) -> Result<MapDocumentV1, AppError> {
    state.with_db(|_db, root| crop_map_canvas(root, &map_id, new_width, new_height))
}

#[tauri::command]
pub fn read_project_image_cmd(
    state: State<'_, ProjectState>,
    relative_path: String,
) -> Result<String, AppError> {
    state.with_db(|_db, root| read_project_image_data_url(root, &relative_path))
}

#[tauri::command]
pub fn get_maps_session_cmd(state: State<'_, ProjectState>) -> Result<MapSessionV2, AppError> {
    state.with_db(|_db, root| get_maps_session(root))
}

#[tauri::command]
pub fn set_open_preference_cmd(
    state: State<'_, ProjectState>,
    open_preference: OpenPreference,
) -> Result<(), AppError> {
    state.with_db(|_db, root| set_open_preference(root, open_preference))
}

#[tauri::command]
pub fn set_default_on_open_cmd(
    state: State<'_, ProjectState>,
    map_id: String,
    enabled: bool,
) -> Result<(), AppError> {
    state.with_db(|_db, root| set_default_on_open(root, &map_id, enabled))
}

#[tauri::command]
pub fn record_map_viewed_cmd(
    state: State<'_, ProjectState>,
    map_id: String,
) -> Result<(), AppError> {
    state.with_db(|_db, root| record_map_viewed(root, &map_id))
}

#[tauri::command]
pub fn list_map_secondaries_cmd(
    state: State<'_, ProjectState>,
    map_id: String,
) -> Result<Vec<crate::fs::maps_store::MapSecondarySummaryV1>, AppError> {
    state.with_db(|_db, root| list_map_secondaries(root, &map_id))
}

#[tauri::command]
pub fn get_map_secondary_cmd(
    state: State<'_, ProjectState>,
    map_id: String,
    secondary_id: String,
) -> Result<MapSecondaryDrawingFileV1, AppError> {
    state.with_db(|_db, root| get_map_secondary(root, &map_id, &secondary_id))
}

#[tauri::command]
pub fn create_map_secondary_cmd(
    state: State<'_, ProjectState>,
    map_id: String,
    name: String,
    tiempo_inicio: String,
    tiempo_fin: Option<String>,
) -> Result<MapSecondaryDrawingFileV1, AppError> {
    state.with_db(|_db, root| {
        create_map_secondary(
            root,
            &map_id,
            &name,
            &tiempo_inicio,
            tiempo_fin.as_deref(),
        )
    })
}

#[tauri::command]
pub fn save_map_secondary_cmd(
    state: State<'_, ProjectState>,
    map_id: String,
    file: MapSecondaryDrawingFileV1,
) -> Result<(), AppError> {
    state.with_db(|_db, root| save_map_secondary(root, &map_id, &file))
}

#[tauri::command]
pub fn update_map_secondary_meta_cmd(
    state: State<'_, ProjectState>,
    map_id: String,
    secondary_id: String,
    name: Option<String>,
    tiempo_inicio: Option<String>,
    tiempo_fin: Option<String>,
    clear_tiempo_fin: Option<bool>,
) -> Result<crate::fs::maps_store::MapSecondarySummaryV1, AppError> {
    state.with_db(|_db, root| {
        update_map_secondary_meta(
            root,
            &map_id,
            &secondary_id,
            MapSecondaryMetaPatch {
                name,
                tiempo_inicio,
                tiempo_fin,
                clear_tiempo_fin,
            },
        )
    })
}

#[tauri::command]
pub fn delete_map_secondary_cmd(
    state: State<'_, ProjectState>,
    map_id: String,
    secondary_id: String,
) -> Result<(), AppError> {
    state.with_db(|_db, root| delete_map_secondary(root, &map_id, &secondary_id))
}
