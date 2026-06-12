//! Comandos IPC del editor y parser (legacy `ParsedDocument` + manuscrito §1.9).

use std::collections::HashMap;
use std::fs;

use serde::Deserialize;
use tauri::State;

use crate::error::AppError;
use crate::fs::paths::resolve_under_root;
use crate::parser::{
    close_event_segment, create_event_segment, insert_inline_tag_in_segment,
    parse_file, parse_file_and_persist, parse_manuscript_and_persist,
    persist_parsed_document, sanitize_metadata, save_manuscript_and_persist,
    serialize_blocks_to_disk, update_block_metadata as apply_block_metadata,
    update_event_segment_metadata, BarTag, EventSegment, FreeTextSegment,
    ManuscriptFileHeader, ManuscriptFormat, ManuscriptSegment, ParsedBlock, ParsedDocument,
    ParsedManuscript, scan_inline_tags,
};
use crate::state::ProjectState;

// --- Legacy (Fase 2) — se mantiene hasta migrar Lexical (Fase 4) ---

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveBlockPayload {
    pub index: i32,
    pub body: String,
    pub metadata: serde_json::Value,
    #[serde(default)]
    pub time_timestamp: Option<String>,
}

#[tauri::command]
pub fn read_document(
    state: State<'_, ProjectState>,
    file_path: String,
) -> Result<ParsedDocument, AppError> {
    state.with_db(|db, root| parse_file_and_persist(db, root, &file_path))
}

#[tauri::command]
pub fn parse_document(
    state: State<'_, ProjectState>,
    file_path: String,
) -> Result<ParsedDocument, AppError> {
    state.with_db(|db, root| parse_file_and_persist(db, root, &file_path))
}

/// Serializa bloques editados, escribe en disco y reindexa SQLite.
#[tauri::command]
pub fn save_document(
    app: tauri::AppHandle,
    state: State<'_, ProjectState>,
    file_path: String,
    blocks: Vec<SaveBlockPayload>,
) -> Result<ParsedDocument, AppError> {
    let doc = state.with_db(|db, root| {
        let rel = crate::fs::paths::normalize_relative(&file_path)?;
        if !rel.to_lowercase().ends_with(".md") {
            return Err(AppError::new("error.editor.not_md"));
        }

        let mut parsed_blocks: Vec<ParsedBlock> = blocks
            .into_iter()
            .map(|b| ParsedBlock {
                id: ParsedDocument::stable_block_id(&rel, b.index),
                index: b.index,
                body: b.body,
                metadata: sanitize_metadata(b.metadata),
                content_hash: None,
                parse_error_key: None,
                time_timestamp: b.time_timestamp,
            })
            .collect();
        parsed_blocks.sort_by_key(|b| b.index);

        let full = resolve_under_root(root, &rel)?;
        let raw_on_disk = fs::read_to_string(&full).unwrap_or_default();
        let content = serialize_blocks_to_disk(&rel, &parsed_blocks, &raw_on_disk)?;
        fs::write(&full, content.as_bytes()).map_err(|e| AppError::database(e.to_string()))?;

        let timestamp_map: HashMap<i32, Option<String>> = parsed_blocks
            .iter()
            .map(|b| (b.index, b.time_timestamp.clone()))
            .collect();

        let mut doc = parse_file(root, &rel)?;
        for block in &mut doc.blocks {
            if let Some(ts) = timestamp_map.get(&block.index) {
                block.time_timestamp = ts.clone();
            }
        }

        persist_parsed_document(db, &rel, &doc)
    })?;

    if let Ok(meta) = state.meta() {
        state.request_consistency_check(&app, std::path::Path::new(&meta.root_path));
    }

    Ok(doc)
}

#[tauri::command]
pub fn update_block_metadata(
    app: tauri::AppHandle,
    state: State<'_, ProjectState>,
    file_path: String,
    block_index: i32,
    metadata: serde_json::Value,
    time_timestamp: Option<String>,
) -> Result<ParsedDocument, AppError> {
    let doc = state.with_db(|db, root| {
        apply_block_metadata(db, root, &file_path, block_index, metadata, time_timestamp)
    })?;

    if let Ok(meta) = state.meta() {
        state.request_consistency_check(&app, std::path::Path::new(&meta.root_path));
    }

    Ok(doc)
}

// --- Manuscrito §1.9 (Fase 3) ---

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveManuscriptPayload {
    pub file_header: ManuscriptFileHeader,
    pub segments: Vec<SaveManuscriptSegmentPayload>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "kind")]
pub enum SaveManuscriptSegmentPayload {
    #[serde(rename = "freeText")]
    FreeText {
        #[serde(rename = "segmentIndex")]
        segment_index: i32,
        body: String,
    },
    #[serde(rename = "event")]
    Event {
        #[serde(rename = "segmentIndex")]
        segment_index: i32,
        name: String,
        description: String,
        #[serde(rename = "entityPath")]
        entity_path: String,
        #[serde(rename = "barTags", default)]
        bar_tags: Vec<BarTag>,
        body: String,
        closed: bool,
    },
}

#[tauri::command]
pub fn read_manuscript(
    state: State<'_, ProjectState>,
    file_path: String,
) -> Result<ParsedManuscript, AppError> {
    state.with_db(|db, root| parse_manuscript_and_persist(db, root, &file_path))
}

#[tauri::command]
pub fn parse_manuscript(
    state: State<'_, ProjectState>,
    file_path: String,
) -> Result<ParsedManuscript, AppError> {
    state.with_db(|db, root| parse_manuscript_and_persist(db, root, &file_path))
}

#[tauri::command]
pub fn save_manuscript(
    app: tauri::AppHandle,
    state: State<'_, ProjectState>,
    file_path: String,
    manuscript: SaveManuscriptPayload,
) -> Result<ParsedManuscript, AppError> {
    let rel = crate::fs::paths::normalize_relative(&file_path)?;
    let parsed = build_manuscript_from_save(&rel, manuscript)?;
    let result = state.with_db(|db, root| save_manuscript_and_persist(db, root, &rel, parsed))?;

    if let Ok(meta) = state.meta() {
        state.request_consistency_check(&app, std::path::Path::new(&meta.root_path));
    }

    Ok(result)
}

#[tauri::command]
pub fn update_event_metadata(
    app: tauri::AppHandle,
    state: State<'_, ProjectState>,
    file_path: String,
    segment_index: i32,
    name: String,
    description: String,
    entity_path: String,
    bar_tags: Vec<BarTag>,
) -> Result<ParsedManuscript, AppError> {
    let result = state.with_db(|db, root| {
        update_event_segment_metadata(
            db,
            root,
            &file_path,
            segment_index,
            name,
            description,
            entity_path,
            bar_tags,
        )
    })?;

    if let Ok(meta) = state.meta() {
        state.request_consistency_check(&app, std::path::Path::new(&meta.root_path));
    }

    Ok(result)
}

#[tauri::command]
pub fn create_event_at_cursor(
    app: tauri::AppHandle,
    state: State<'_, ProjectState>,
    file_path: String,
    after_segment_index: Option<i32>,
    name: String,
    description: String,
    entity_path: String,
    bar_tags: Vec<BarTag>,
    body: String,
) -> Result<ParsedManuscript, AppError> {
    let result = state.with_db(|db, root| {
        create_event_segment(
            db,
            root,
            &file_path,
            after_segment_index,
            name,
            description,
            entity_path,
            bar_tags,
            body,
        )
    })?;

    if let Ok(meta) = state.meta() {
        state.request_consistency_check(&app, std::path::Path::new(&meta.root_path));
    }

    Ok(result)
}

#[tauri::command]
pub fn close_event_at_cursor(
    app: tauri::AppHandle,
    state: State<'_, ProjectState>,
    file_path: String,
    segment_index: i32,
) -> Result<ParsedManuscript, AppError> {
    let result = state.with_db(|db, root| {
        close_event_segment(db, root, &file_path, segment_index)
    })?;

    if let Ok(meta) = state.meta() {
        state.request_consistency_check(&app, std::path::Path::new(&meta.root_path));
    }

    Ok(result)
}

#[tauri::command]
pub fn insert_inline_tag(
    app: tauri::AppHandle,
    state: State<'_, ProjectState>,
    file_path: String,
    segment_index: i32,
    char_offset: u32,
    tag_type: String,
    value: String,
) -> Result<ParsedManuscript, AppError> {
    let result = state.with_db(|db, root| {
        insert_inline_tag_in_segment(
            db,
            root,
            &file_path,
            segment_index,
            char_offset,
            tag_type,
            value,
        )
    })?;

    if let Ok(meta) = state.meta() {
        state.request_consistency_check(&app, std::path::Path::new(&meta.root_path));
    }

    Ok(result)
}

fn build_manuscript_from_save(
    file_path: &str,
    payload: SaveManuscriptPayload,
) -> Result<ParsedManuscript, AppError> {
    let mut segments_input = payload.segments;
    segments_input.sort_by_key(|s| match s {
        SaveManuscriptSegmentPayload::FreeText { segment_index, .. } => *segment_index,
        SaveManuscriptSegmentPayload::Event { segment_index, .. } => *segment_index,
    });

    let mut segments = Vec::with_capacity(segments_input.len());
    for seg in segments_input {
        match seg {
            SaveManuscriptSegmentPayload::FreeText {
                segment_index,
                body,
            } => {
                if body.is_empty() {
                    continue;
                }
                segments.push(ManuscriptSegment::FreeText(FreeTextSegment::new(
                    file_path,
                    segment_index,
                    body,
                )));
            }
            SaveManuscriptSegmentPayload::Event {
                segment_index,
                name,
                description,
                entity_path,
                bar_tags,
                body,
                closed,
            } => {
                segments.push(ManuscriptSegment::Event(EventSegment {
                    id: ParsedManuscript::stable_segment_id(file_path, segment_index),
                    segment_index,
                    name,
                    description,
                    entity_path,
                    bar_tags,
                    inline_tags: scan_inline_tags(&body),
                    body,
                    closed,
                }));
            }
        }
    }

    Ok(ParsedManuscript {
        file_path: file_path.to_string(),
        format: ManuscriptFormat::EventSegments,
        file_header: payload.file_header,
        segments,
    })
}

#[cfg(test)]
mod save_payload_tests {
    use super::SaveManuscriptPayload;

    #[test]
    fn deserialize_frontend_save_manuscript_payload() {
        let raw = r#"{
            "fileHeader": { "title": "shushah", "body": "wajaja" },
            "segments": [{
                "kind": "event",
                "segmentIndex": 0,
                "name": "meowo",
                "description": "wajaija",
                "entityPath": "Worldbuilding/Eventos/meowo.md",
                "barTags": [],
                "body": "",
                "closed": false
            }]
        }"#;

        let payload: SaveManuscriptPayload = serde_json::from_str(raw).expect("IPC payload");
        assert_eq!(payload.segments.len(), 1);
        match &payload.segments[0] {
            super::SaveManuscriptSegmentPayload::Event {
                segment_index,
                name,
                entity_path,
                closed,
                ..
            } => {
                assert_eq!(*segment_index, 0);
                assert_eq!(name, "meowo");
                assert_eq!(entity_path, "Worldbuilding/Eventos/meowo.md");
                assert!(!*closed);
            }
            _ => panic!("expected event segment"),
        }
    }
}
