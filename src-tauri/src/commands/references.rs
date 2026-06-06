//! Comandos IPC del diccionario de entidades y referencias (Fase 3.1–3.4).

use tauri::{AppHandle, State};

use crate::db::backlinks::{list_backlinks, BacklinkRow};
use crate::db::entities::{list_active_entities, EntitySearchRow};
use crate::error::AppError;
use crate::references::{
    convert_unlinked_mention as apply_convert_unlinked_mention,
    find_unlinked_mentions as scan_unlinked_mentions, UnlinkedMentionRow,
    DEFAULT_UNLINKED_LIMIT,
};
use crate::parser::ParsedDocument;
use crate::state::ProjectState;

#[tauri::command]
pub fn list_entities_for_search(
    state: State<'_, ProjectState>,
) -> Result<Vec<EntitySearchRow>, AppError> {
    state.with_db(|db, _root| list_active_entities(db.connection()))
}

#[tauri::command]
pub fn get_backlinks(
    state: State<'_, ProjectState>,
    entity_path: String,
) -> Result<Vec<BacklinkRow>, AppError> {
    state.with_db(|db, _root| list_backlinks(db.connection(), &entity_path))
}

#[tauri::command]
pub fn find_unlinked_mentions(
    state: State<'_, ProjectState>,
    entity_name: String,
    entity_path: String,
    limit: Option<usize>,
) -> Result<Vec<UnlinkedMentionRow>, AppError> {
    let cap = limit.unwrap_or(DEFAULT_UNLINKED_LIMIT);
    state.with_db(|_db, root| scan_unlinked_mentions(root, &entity_name, &entity_path, cap))
}

#[tauri::command]
pub fn convert_unlinked_mention(
    app: AppHandle,
    state: State<'_, ProjectState>,
    source_path: String,
    block_index: i32,
    start: usize,
    end: usize,
    entity_name: String,
) -> Result<ParsedDocument, AppError> {
    let doc = state.with_db(|db, root| {
        apply_convert_unlinked_mention(db, root, &source_path, block_index, start, end, &entity_name)
    })?;

    if let Ok(meta) = state.meta() {
        state.request_consistency_check(&app, std::path::Path::new(&meta.root_path));
    }

    Ok(doc)
}
