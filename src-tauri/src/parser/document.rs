//! Orquestación: split → frontmatter → `ParsedManuscript` / `ParsedDocument`.

use std::fs;
use std::path::Path;

use sha2::{Digest, Sha256};

use crate::db::blocks;
use crate::db::ProjectDb;
use crate::error::AppError;
use crate::fs::paths::{resolve_under_root, to_relative};
use crate::parser::block_splitter::{split_blocks, split_manuscript, RawManuscriptSegment};
use crate::parser::format::detect_manuscript_format;
use crate::parser::frontmatter::{parse_event_opening, parse_segment};
use crate::parser::inline_scanner::scan_inline_tags;
use crate::parser::manuscript_title::{
    ensure_manuscript_title_on_disk, is_manuscript_path,
};
use crate::parser::metadata_util::sanitize_metadata;
use crate::parser::serializer::{serialize_document, serialize_manuscript};
use crate::parser::types::{
    BarTag, EventSegment, FreeTextSegment, ManuscriptFileHeader, ManuscriptFormat,
    ManuscriptSegment, ParsedBlock, ParsedDocument, ParsedManuscript,
};

/// Última hora confirmada en `barTags` de tipo `time` (para `metadata.timeHour`).
fn last_time_bar_hour(bar_tags: &[BarTag]) -> Option<u32> {
    bar_tags
        .iter()
        .rev()
        .filter(|t| t.tag_type == "time" && !t.value.trim().is_empty())
        .find_map(|t| t.hour)
}

/// Solo rutas bajo `Manuscrito/` usan el parser `+++event` (A23).
pub fn should_parse_as_manuscript(relative_path: &str, raw: &str) -> bool {
    is_manuscript_path(relative_path)
        && detect_manuscript_format(raw) == ManuscriptFormat::EventSegments
}

/// Parsea un manuscrito en formato §1.4.
pub fn parse_manuscript_str(file_path: &str, raw: &str) -> Result<ParsedManuscript, AppError> {
    let split = split_manuscript(raw);
    let header_parts = parse_segment(&split.header_raw);
    let title = header_parts
        .metadata
        .get("title")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let file_header = ManuscriptFileHeader {
        title,
        body: header_parts.body,
    };

    let mut segments = Vec::new();
    let mut segment_index = 0i32;

    for raw_seg in split.segments {
        match raw_seg {
            RawManuscriptSegment::FreeText(body) => {
                let trimmed = body.trim().to_string();
                if trimmed.is_empty() {
                    continue;
                }
                segments.push(ManuscriptSegment::FreeText(FreeTextSegment::new(
                    file_path,
                    segment_index,
                    trimmed,
                )));
                segment_index += 1;
            }
            RawManuscriptSegment::Event { payload, closed } => {
                let (opening, body) = parse_event_opening(&payload);
                segments.push(ManuscriptSegment::Event(EventSegment {
                    id: ParsedManuscript::stable_segment_id(file_path, segment_index),
                    segment_index,
                    name: opening.name,
                    description: opening.description,
                    entity_path: opening.entity_path,
                    bar_tags: opening.bar_tags,
                    body: body.clone(),
                    inline_tags: scan_inline_tags(&body),
                    closed,
                }));
                segment_index += 1;
            }
        }
    }

    Ok(ParsedManuscript {
        file_path: file_path.to_string(),
        format: ManuscriptFormat::EventSegments,
        file_header,
        segments,
    })
}

/// Parsea formato legacy (`+++` genérico) a `ParsedDocument`.
pub fn parse_legacy_document_str(file_path: &str, raw: &str) -> Result<ParsedDocument, AppError> {
    let segments = split_blocks(raw);
    let mut blocks_out = Vec::with_capacity(segments.len());

    for seg in segments {
        let index = seg.index as i32;
        let parts = parse_segment(&seg.text);
        let body = parts.body;
        let content_hash = Some(hash_body(&body));

        blocks_out.push(ParsedBlock {
            id: ParsedDocument::stable_block_id(file_path, index),
            index,
            body,
            metadata: parts.metadata,
            content_hash,
            parse_error_key: parts.yaml_error.as_ref().map(|e| e.key.clone()),
            time_timestamp: None,
        });
    }

    Ok(ParsedDocument {
        file_path: file_path.to_string(),
        blocks: blocks_out,
    })
}

/// Parsea según formato detectado; devuelve `ParsedDocument` (puente IPC hasta Fase 3+).
pub fn parse_document_str(file_path: &str, raw: &str) -> Result<ParsedDocument, AppError> {
    if should_parse_as_manuscript(file_path, raw) {
        let manuscript = parse_manuscript_str(file_path, raw)?;
        return Ok(manuscript_to_document(&manuscript));
    }
    if detect_manuscript_format(raw) == ManuscriptFormat::LegacyBlocks {
        return parse_legacy_document_str(file_path, raw);
    }
    parse_legacy_document_str(file_path, raw)
}

/// Adaptador temporal: manuscrito §1.9 → bloques legacy para IPC existente.
pub fn manuscript_to_document(manuscript: &ParsedManuscript) -> ParsedDocument {
    let mut blocks = Vec::new();
    let mut index = 0i32;

    let mut header_meta = serde_json::json!({});
    if !manuscript.file_header.title.trim().is_empty() {
        header_meta["title"] = serde_json::json!(manuscript.file_header.title);
    }
    blocks.push(ParsedBlock {
        id: ParsedDocument::stable_block_id(&manuscript.file_path, index),
        index,
        body: manuscript.file_header.body.clone(),
        metadata: header_meta,
        content_hash: Some(hash_body(&manuscript.file_header.body)),
        parse_error_key: None,
        time_timestamp: None,
    });
    index += 1;

    for segment in &manuscript.segments {
        match segment {
            ManuscriptSegment::FreeText(seg) => {
                blocks.push(ParsedBlock {
                    id: ParsedDocument::stable_block_id(&manuscript.file_path, index),
                    index,
                    body: seg.body.clone(),
                    metadata: serde_json::json!({}),
                    content_hash: Some(hash_body(&seg.body)),
                    parse_error_key: None,
                    time_timestamp: None,
                });
            }
            ManuscriptSegment::Event(event) => {
                let mut meta = serde_json::json!({
                    "event": event.name,
                    "description": event.description,
                    "entity": event.entity_path,
                });
                if !event.bar_tags.is_empty() {
                    meta["barTags"] = serde_json::to_value(&event.bar_tags).unwrap_or_default();
                }
                if let Some(hour) = last_time_bar_hour(&event.bar_tags) {
                    meta["timeHour"] = serde_json::json!(hour);
                }
                blocks.push(ParsedBlock {
                    id: ParsedDocument::stable_block_id(&manuscript.file_path, index),
                    index,
                    body: event.body.clone(),
                    metadata: meta,
                    content_hash: Some(hash_body(&event.body)),
                    parse_error_key: None,
                    time_timestamp: None,
                });
            }
        }
        index += 1;
    }

    ParsedDocument {
        file_path: manuscript.file_path.clone(),
        blocks,
    }
}

/// Adaptador inverso: bloques IPC → manuscrito §1.4 (preserva `closed` / `barTags` del disco).
pub fn document_to_manuscript(
    file_path: &str,
    blocks: &[ParsedBlock],
    preserve: Option<&ParsedManuscript>,
) -> Result<ParsedManuscript, AppError> {
    let header_block = blocks
        .first()
        .ok_or_else(|| AppError::new("error.editor.empty_document"))?;

    let title = header_block
        .metadata
        .get("title")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let file_header = ManuscriptFileHeader {
        title,
        body: header_block.body.clone(),
    };

    let mut segments = Vec::new();
    let mut segment_index = 0i32;

    for block in blocks.iter().skip(1) {
        let preserved = preserve.and_then(|p| p.segments.get(segment_index as usize));

        if is_event_block(block) {
            let closed = match preserved {
                Some(ManuscriptSegment::Event(e)) => e.closed,
                _ => true,
            };
            let (name, description, entity_path, bar_tags) =
                event_fields_from_block(block, preserved);
            let body = block.body.clone();
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
            segment_index += 1;
        } else {
            let body = block.body.trim().to_string();
            if body.is_empty() {
                continue;
            }
            segments.push(ManuscriptSegment::FreeText(FreeTextSegment::new(
                file_path,
                segment_index,
                body,
            )));
            segment_index += 1;
        }
    }

    Ok(ParsedManuscript {
        file_path: file_path.to_string(),
        format: ManuscriptFormat::EventSegments,
        file_header,
        segments,
    })
}

/// Serializa bloques editados respetando el formato ya presente en disco.
pub fn serialize_blocks_to_disk(
    file_path: &str,
    blocks: &[ParsedBlock],
    raw_on_disk: &str,
) -> Result<String, AppError> {
    if should_parse_as_manuscript(file_path, raw_on_disk) {
        let preserve = parse_manuscript_str(file_path, raw_on_disk).ok();
        let manuscript = document_to_manuscript(file_path, blocks, preserve.as_ref())?;
        serialize_manuscript(&manuscript)
    } else {
        serialize_document(blocks)
    }
}

fn is_event_block(block: &ParsedBlock) -> bool {
    block
        .metadata
        .get("event")
        .and_then(|v| v.as_str())
        .is_some_and(|s| !s.is_empty())
}

fn event_fields_from_block(
    block: &ParsedBlock,
    preserved: Option<&ManuscriptSegment>,
) -> (String, String, String, Vec<BarTag>) {
    let name = block
        .metadata
        .get("event")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let description = block
        .metadata
        .get("description")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let entity_path = block
        .metadata
        .get("entity")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let bar_tags = block
        .metadata
        .get("barTags")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .or_else(|| match preserved {
            Some(ManuscriptSegment::Event(e)) => Some(e.bar_tags.clone()),
            _ => None,
        })
        .unwrap_or_default();
    (name, description, entity_path, bar_tags)
}

/// Lee un `.md` del disco y parsea (sin persistir).
pub fn parse_file(project_root: &Path, relative_path: &str) -> Result<ParsedDocument, AppError> {
    let rel = normalize_md_path(relative_path)?;
    let full = resolve_under_root(project_root, &rel)?;
    if !full.is_file() {
        return Err(AppError::new("error.editor.not_found"));
    }
    let raw = fs::read_to_string(&full).map_err(|e| AppError::database(e.to_string()))?;
    parse_document_str(&rel, &raw)
}

/// Lee y parsea manuscrito §1.4 (sin adaptador legacy).
pub fn parse_manuscript_file(
    project_root: &Path,
    relative_path: &str,
) -> Result<ParsedManuscript, AppError> {
    let rel = normalize_md_path(relative_path)?;
    let full = resolve_under_root(project_root, &rel)?;
    if !full.is_file() {
        return Err(AppError::new("error.editor.not_found"));
    }
    let raw = fs::read_to_string(&full).map_err(|e| AppError::database(e.to_string()))?;
    if !is_manuscript_path(&rel) {
        return Err(AppError::new("error.parser.unsupported_format"));
    }
    parse_manuscript_str(&rel, &raw)
}

/// Actualiza solo el frontmatter de un bloque legacy; no aplica a manuscritos §1.4.
pub fn update_block_metadata(
    db: &ProjectDb,
    project_root: &Path,
    relative_path: &str,
    block_index: i32,
    metadata: serde_json::Value,
    time_timestamp: Option<String>,
) -> Result<ParsedDocument, AppError> {
    let rel = normalize_md_path(relative_path)?;
    let full = resolve_under_root(project_root, &rel)?;
    let raw = fs::read_to_string(&full).map_err(|e| AppError::database(e.to_string()))?;
    if detect_manuscript_format(&raw) == ManuscriptFormat::EventSegments {
        return Err(AppError::new("error.parser.unsupported_format"));
    }

    let mut doc = parse_legacy_document_str(&rel, &raw)?;

    let block = doc
        .blocks
        .iter_mut()
        .find(|b| b.index == block_index)
        .ok_or_else(|| AppError::new("error.editor.block_not_found"))?;

    block.metadata = sanitize_metadata(metadata);
    block.time_timestamp = time_timestamp;
    block.parse_error_key = None;
    block.content_hash = Some(hash_body(&block.body));

    let content = serialize_document(&doc.blocks)?;
    fs::write(&full, content.as_bytes()).map_err(|e| AppError::database(e.to_string()))?;

    persist_parsed_document(db, &rel, &doc)
}

/// Parsea y sincroniza tablas `blocks` / `time_markers`.
pub fn parse_file_and_persist(
    db: &ProjectDb,
    project_root: &Path,
    relative_path: &str,
) -> Result<ParsedDocument, AppError> {
    let rel = normalize_md_path(relative_path)?;
    let full = resolve_under_root(project_root, &rel)?;
    let raw = fs::read_to_string(&full).map_err(|e| AppError::database(e.to_string()))?;

    let mut doc = if should_parse_as_manuscript(&rel, &raw) {
        let manuscript = parse_manuscript_str(&rel, &raw)?;
        manuscript_to_document(&manuscript)
    } else {
        parse_legacy_document_str(&rel, &raw)?
    };

    let _ = ensure_manuscript_title_on_disk(project_root, relative_path, &mut doc, false)?;
    persist_parsed_document(db, relative_path, &doc)
}

pub fn persist_parsed_document(
    db: &ProjectDb,
    relative_path: &str,
    doc: &ParsedDocument,
) -> Result<ParsedDocument, AppError> {
    blocks::upsert_blocks_for_file(db, doc)?;
    let block_bodies: Vec<(i32, String)> = doc
        .blocks
        .iter()
        .map(|b| (b.index, b.body.clone()))
        .collect();
    crate::db::wiki_links::sync_wiki_links_for_file(db, relative_path, &block_bodies)?;
    Ok(doc.clone())
}

/// Lee manuscrito §1.4, persiste bloques/marcas/wiki-links y devuelve contrato IPC completo.
pub fn parse_manuscript_and_persist(
    db: &ProjectDb,
    project_root: &Path,
    relative_path: &str,
) -> Result<ParsedManuscript, AppError> {
    let rel = normalize_md_path(relative_path)?;
    let manuscript = read_manuscript_on_disk(project_root, &rel)?;
    let mut doc = manuscript_to_document(&manuscript);
    let title_written = ensure_manuscript_title_on_disk(project_root, &rel, &mut doc, false)?;
    persist_parsed_document(db, &rel, &doc)?;
    if title_written {
        read_manuscript_on_disk(project_root, &rel)
    } else {
        Ok(manuscript)
    }
}

/// Escribe manuscrito §1.4, re-parsea disco y persiste (round-trip §2.3 plan).
pub fn save_manuscript_and_persist(
    db: &ProjectDb,
    project_root: &Path,
    relative_path: &str,
    manuscript: ParsedManuscript,
) -> Result<ParsedManuscript, AppError> {
    let rel = normalize_md_path(relative_path)?;
    write_manuscript_and_persist(db, project_root, &rel, &manuscript)
}

/// Actualiza apertura YAML de un evento (`barTags`, nombre, entidad).
pub fn update_event_segment_metadata(
    db: &ProjectDb,
    project_root: &Path,
    relative_path: &str,
    segment_index: i32,
    name: String,
    description: String,
    entity_path: String,
    bar_tags: Vec<BarTag>,
) -> Result<ParsedManuscript, AppError> {
    let rel = normalize_md_path(relative_path)?;
    let mut manuscript = read_manuscript_on_disk(project_root, &rel)?;
    let segment = find_segment_mut(&mut manuscript.segments, segment_index)?;
    let ManuscriptSegment::Event(event) = segment else {
        return Err(AppError::new("error.editor.segment_not_event"));
    };
    event.name = name;
    event.description = description;
    event.entity_path = entity_path;
    event.bar_tags = bar_tags;
    write_manuscript_and_persist(db, project_root, &rel, &manuscript)
}

/// Inserta un evento abierto tras `after_segment_index` (`None` = al final).
pub fn create_event_segment(
    db: &ProjectDb,
    project_root: &Path,
    relative_path: &str,
    after_segment_index: Option<i32>,
    name: String,
    description: String,
    entity_path: String,
    bar_tags: Vec<BarTag>,
    body: String,
) -> Result<ParsedManuscript, AppError> {
    let rel = normalize_md_path(relative_path)?;
    let mut manuscript = read_manuscript_on_disk(project_root, &rel)?;
    let insert_pos = match after_segment_index {
        None => manuscript.segments.len(),
        Some(idx) => manuscript
            .segments
            .iter()
            .position(|s| s.segment_index() == idx)
            .map(|p| p + 1)
            .ok_or_else(|| AppError::new("error.editor.segment_not_found"))?,
    };
    let event = EventSegment {
        id: ParsedManuscript::stable_segment_id(&rel, insert_pos as i32),
        segment_index: insert_pos as i32,
        name,
        description,
        entity_path,
        bar_tags,
        body: body.clone(),
        inline_tags: scan_inline_tags(&body),
        closed: false,
    };
    manuscript
        .segments
        .insert(insert_pos, ManuscriptSegment::Event(event));
    reindex_segments(&rel, &mut manuscript.segments);
    write_manuscript_and_persist(db, project_root, &rel, &manuscript)
}

/// Cierra un evento (`+++end-event`) por `segment_index`.
pub fn close_event_segment(
    db: &ProjectDb,
    project_root: &Path,
    relative_path: &str,
    segment_index: i32,
) -> Result<ParsedManuscript, AppError> {
    let rel = normalize_md_path(relative_path)?;
    let mut manuscript = read_manuscript_on_disk(project_root, &rel)?;
    let segment = find_segment_mut(&mut manuscript.segments, segment_index)?;
    let ManuscriptSegment::Event(event) = segment else {
        return Err(AppError::new("error.editor.segment_not_event"));
    };
    if event.closed {
        return Ok(manuscript);
    }
    event.closed = true;
    write_manuscript_and_persist(db, project_root, &rel, &manuscript)
}

/// Inserta `{{type:value}}` en el cuerpo de un segmento (offset UTF-8).
pub fn insert_inline_tag_in_segment(
    db: &ProjectDb,
    project_root: &Path,
    relative_path: &str,
    segment_index: i32,
    char_offset: u32,
    tag_type: String,
    value: String,
) -> Result<ParsedManuscript, AppError> {
    let rel = normalize_md_path(relative_path)?;
    let mut manuscript = read_manuscript_on_disk(project_root, &rel)?;
    let segment = find_segment_mut(&mut manuscript.segments, segment_index)?;
    let offset = char_offset as usize;
    let token = format!("{{{{{tag_type}:{value}}}}}");
    match segment {
        ManuscriptSegment::FreeText(free) => {
            if offset > free.body.len() {
                return Err(AppError::new("error.editor.invalid_offset"));
            }
            free.body.insert_str(offset, &token);
        }
        ManuscriptSegment::Event(event) => {
            if offset > event.body.len() {
                return Err(AppError::new("error.editor.invalid_offset"));
            }
            event.body.insert_str(offset, &token);
            event.inline_tags = scan_inline_tags(&event.body);
        }
    }
    write_manuscript_and_persist(db, project_root, &rel, &manuscript)
}

fn read_manuscript_on_disk(project_root: &Path, rel: &str) -> Result<ParsedManuscript, AppError> {
    let full = resolve_under_root(project_root, rel)?;
    if !full.is_file() {
        return Err(AppError::new("error.editor.not_found"));
    }
    let raw = fs::read_to_string(&full).map_err(|e| AppError::database(e.to_string()))?;
    ensure_manuscript_event_format(&raw)?;
    parse_manuscript_str(rel, &raw)
}

fn ensure_manuscript_event_format(raw: &str) -> Result<(), AppError> {
    if detect_manuscript_format(raw) == ManuscriptFormat::LegacyBlocks {
        return Err(AppError::new("error.parser.unsupported_format"));
    }
    Ok(())
}

fn write_manuscript_and_persist(
    db: &ProjectDb,
    project_root: &Path,
    rel: &str,
    manuscript: &ParsedManuscript,
) -> Result<ParsedManuscript, AppError> {
    let mut manuscript = manuscript.clone();
    crate::entity::sync_event::sync_manuscript_event_entities(db, project_root, rel, &mut manuscript)?;

    let full = resolve_under_root(project_root, rel)?;
    let content = serialize_manuscript(&manuscript)?;
    fs::write(&full, content.as_bytes()).map_err(|e| AppError::database(e.to_string()))?;
    let reparsed = parse_manuscript_str(rel, &content)?;
    let mut doc = manuscript_to_document(&reparsed);
    let _ = ensure_manuscript_title_on_disk(project_root, rel, &mut doc, false)?;
    persist_parsed_document(db, rel, &doc)?;
    Ok(reparsed)
}

fn find_segment_mut<'a>(
    segments: &'a mut [ManuscriptSegment],
    segment_index: i32,
) -> Result<&'a mut ManuscriptSegment, AppError> {
    segments
        .iter_mut()
        .find(|s| s.segment_index() == segment_index)
        .ok_or_else(|| AppError::new("error.editor.segment_not_found"))
}

fn reindex_segments(file_path: &str, segments: &mut [ManuscriptSegment]) {
    for (i, segment) in segments.iter_mut().enumerate() {
        let idx = i as i32;
        match segment {
            ManuscriptSegment::FreeText(s) => {
                s.segment_index = idx;
                s.id = ParsedManuscript::stable_segment_id(file_path, idx);
            }
            ManuscriptSegment::Event(s) => {
                s.segment_index = idx;
                s.id = ParsedManuscript::stable_segment_id(file_path, idx);
            }
        }
    }
}

fn normalize_md_path(relative_path: &str) -> Result<String, AppError> {
    let rel = crate::fs::paths::normalize_relative(relative_path)?;
    if !rel.to_lowercase().ends_with(".md") {
        return Err(AppError::new("error.editor.not_md"));
    }
    Ok(rel)
}

fn hash_body(body: &str) -> String {
    let digest = Sha256::digest(body.as_bytes());
    format!("{:x}", digest)
}

/// Parsea desde ruta absoluta ya validada (watcher / reconciliación).
pub fn parse_full_path_and_persist(
    db: &ProjectDb,
    project_root: &Path,
    full_path: &Path,
) -> Result<(), AppError> {
    if full_path.extension().and_then(|e| e.to_str()) != Some("md") {
        return Ok(());
    }
    let rel = to_relative(project_root, full_path)?;
    let raw = fs::read_to_string(full_path).map_err(|e| AppError::database(e.to_string()))?;
    let mut doc = parse_document_str(&rel, &raw)?;
    let _ = ensure_manuscript_title_on_disk(project_root, &rel, &mut doc, false)?;
    blocks::upsert_blocks_for_file(db, &doc)?;
    let block_bodies: Vec<(i32, String)> = doc
        .blocks
        .iter()
        .map(|b| (b.index, b.body.clone()))
        .collect();
    crate::db::wiki_links::sync_wiki_links_for_file(db, &rel, &block_bodies)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn legacy_plus_in_manuscrito_stays_legacy_parser() {
        let raw = "---\ntitle: Escena\n---\n\n+++\n---\ntime: \"1.1.0\"\n---\nBody";
        assert!(!should_parse_as_manuscript("Manuscrito/Escena.md", raw));
        let doc = parse_document_str("Manuscrito/Escena.md", raw).unwrap();
        assert_eq!(doc.blocks.len(), 2);
    }

    #[test]
    fn worldbuilding_event_markers_do_not_use_manuscript_parser() {
        let raw = "---\ntitle: Ficha\n---\nintro\n\n\
                   +++event\n---\nevent: x\nentity: Worldbuilding/Eventos/x.md\n---\ncuerpo\n+++end-event\n";
        let wb = parse_document_str("Worldbuilding/Eventos/X.md", raw).unwrap();
        let ms = parse_document_str("Manuscrito/X.md", raw).unwrap();
        assert_eq!(wb.blocks.len(), 1);
        assert!(ms.blocks.len() >= 2);
    }

    #[test]
    fn default_single_block_without_plus() {
        let doc = parse_document_str("a.md", "Hello only.").unwrap();
        assert_eq!(doc.blocks.len(), 1);
        assert_eq!(doc.blocks[0].index, 0);
        assert_eq!(doc.blocks[0].body, "Hello only.");
    }

    #[test]
    fn three_blocks_metadata_independent() {
        let raw = "---\ntime: \"1\"\n---\nOne\n\n+++\n---\ntime: \"2\"\n---\nTwo\n\n+++\nThree";
        let doc = parse_document_str("x.md", raw).unwrap();
        assert_eq!(doc.blocks.len(), 3);
        assert_eq!(doc.blocks[0].metadata["time"], "1");
        assert_eq!(doc.blocks[1].metadata["time"], "2");
        assert_eq!(doc.blocks[2].body, "Three");
    }

    #[test]
    fn update_metadata_only_touches_target_block() {
        use crate::db::ProjectDb;
        use tempfile::TempDir;

        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        let rel = "scene.md";
        let raw = "---\ntime: \"A\"\n---\nFirst body.\n\n+++\n---\ntime: \"B\"\n---\nSecond body.";
        std::fs::write(root.join("scene.md"), raw).unwrap();

        let db = ProjectDb::open(root).unwrap();
        let updated = update_block_metadata(
            &db,
            root,
            rel,
            1,
            serde_json::json!({ "time": "B-updated", "location": "Castle" }),
            None,
        )
        .unwrap();

        assert_eq!(updated.blocks[0].metadata["time"], "A");
        assert_eq!(updated.blocks[1].metadata["time"], "B-updated");
    }

    #[test]
    fn parse_manuscript_empty_is_header_only() {
        let doc = parse_manuscript_str("Manuscrito/A.md", "").unwrap();
        assert!(doc.segments.is_empty());
        assert_eq!(doc.file_header.title, "");
    }

    #[test]
    fn parse_manuscript_prose_before_and_between_events() {
        let raw = "---\ntitle: T\n---\nantes\n\n\
                   +++event\n---\nevent: e1\nentity: p/e1.md\n---\ncuerpo1\n+++end-event\n\
                   entre\n\
                   +++event\n---\nevent: e2\nentity: p/e2.md\n---\ncuerpo2";
        let doc = parse_manuscript_str("Manuscrito/T.md", raw).unwrap();
        assert_eq!(doc.file_header.body, "antes");
        assert_eq!(doc.segments.len(), 3);
        assert!(matches!(doc.segments[1], ManuscriptSegment::FreeText(_)));
    }

    #[test]
    fn manuscript_adapter_exposes_blocks_for_ipc() {
        let raw = "---\ntitle: Escena\n---\nintro\n\n\
                   +++event\n---\nevent: ev\nentity: p/ev.md\n---\nhola";
        let manuscript = parse_manuscript_str("Manuscrito/Escena.md", raw).unwrap();
        let doc = manuscript_to_document(&manuscript);
        assert_eq!(doc.blocks.len(), 2);
        assert_eq!(doc.blocks[0].metadata["title"], "Escena");
        assert_eq!(doc.blocks[1].metadata["event"], "ev");
    }

    #[test]
    fn document_to_manuscript_round_trip_preserves_closed_state() {
        let raw = "---\ntitle: T\n---\nintro\n\n\
                   +++event\n---\nevent: e1\nentity: p/e1.md\n---\ncuerpo\n+++end-event\n\n\
                   +++event\n---\nevent: e2\nentity: p/e2.md\n---\nabierto";
        let manuscript = parse_manuscript_str("Manuscrito/T.md", raw).unwrap();
        let closed_first = matches!(
            &manuscript.segments[0],
            ManuscriptSegment::Event(e) if e.closed
        );
        let open_second = matches!(
            &manuscript.segments[1],
            ManuscriptSegment::Event(e) if !e.closed
        );
        assert!(closed_first);
        assert!(open_second);

        let doc = manuscript_to_document(&manuscript);
        let restored = document_to_manuscript("Manuscrito/T.md", &doc.blocks, Some(&manuscript))
            .unwrap();
        let serialized = serialize_manuscript(&restored).unwrap();
        let again = parse_manuscript_str("Manuscrito/T.md", &serialized).unwrap();

        assert!(matches!(
            &again.segments[0],
            ManuscriptSegment::Event(e) if e.closed
        ));
        assert!(matches!(
            &again.segments[1],
            ManuscriptSegment::Event(e) if !e.closed
        ));
        assert!(matches!(
            &again.segments[0],
            ManuscriptSegment::Event(e) if e.body == "cuerpo"
        ));
    }

    #[test]
    fn serialize_blocks_to_disk_keeps_legacy_for_worldbuilding_event_markers() {
        let raw = "---\ntitle: Ficha\n---\nintro\n\n\
                   +++event\n---\nevent: x\n---\ncuerpo\n+++end-event\n";
        let doc = parse_document_str("Worldbuilding/Eventos/X.md", raw).unwrap();
        let expected = serialize_document(&doc.blocks).unwrap();
        let out =
            serialize_blocks_to_disk("Worldbuilding/Eventos/X.md", &doc.blocks, raw).unwrap();
        assert_eq!(out, expected);
        assert_eq!(doc.blocks.len(), 1);
    }

    #[test]
    fn serialize_blocks_to_disk_uses_event_format_when_on_disk() {
        let raw = "---\ntitle: Escena\n---\nintro\n\n\
                   +++event\n---\nevent: ev\nentity: p/ev.md\n---\nhola\n+++end-event\n";
        let manuscript = parse_manuscript_str("Manuscrito/Escena.md", raw).unwrap();
        let doc = manuscript_to_document(&manuscript);
        let out = serialize_blocks_to_disk("Manuscrito/Escena.md", &doc.blocks, raw).unwrap();
        assert!(out.contains("+++event"));
        assert!(!out.contains("\n+++\n"));
        assert_eq!(
            detect_manuscript_format(&out),
            ManuscriptFormat::EventSegments
        );
    }

    #[test]
    fn save_manuscript_open_event_with_entity_round_trip() {
        use crate::db::ProjectDb;
        use crate::parser::types::{BarTag, ManuscriptFileHeader, ManuscriptFormat};
        use tempfile::TempDir;

        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        let rel = "Manuscrito/Volumen 1/Capitulo 1/shushah.md";
        std::fs::create_dir_all(root.join("Manuscrito/Volumen 1/Capitulo 1")).unwrap();
        std::fs::write(
            root.join(rel),
            "---\ntitle: shushah\n---\nwajaja\n",
        )
        .unwrap();
        std::fs::create_dir_all(root.join("Worldbuilding/Eventos")).unwrap();
        std::fs::write(
            root.join("Worldbuilding/Eventos/meowo.md"),
            "---\ntitle: meowo\ntype: event\n---\n",
        )
        .unwrap();

        let db = ProjectDb::open(root).unwrap();
        let entity_path = "Worldbuilding/Eventos/meowo.md".to_string();

        let manuscript = ParsedManuscript {
            file_path: rel.to_string(),
            format: ManuscriptFormat::EventSegments,
            file_header: ManuscriptFileHeader {
                title: "shushah".to_string(),
                body: "wajaja".to_string(),
            },
            segments: vec![ManuscriptSegment::Event(EventSegment {
                id: ParsedManuscript::stable_segment_id(rel, 0),
                segment_index: 0,
                name: "meowo".to_string(),
                description: "wajaija".to_string(),
                entity_path,
                bar_tags: Vec::<BarTag>::new(),
                body: String::new(),
                inline_tags: Vec::new(),
                closed: false,
            })],
        };

        let saved = save_manuscript_and_persist(&db, root, rel, manuscript).unwrap();
        assert_eq!(saved.segments.len(), 1);
        let ManuscriptSegment::Event(event) = &saved.segments[0] else {
            panic!("expected event");
        };
        assert_eq!(event.name, "meowo");
        assert!(root.join("Worldbuilding/Eventos/meowo.md").is_file());
    }

    #[test]
    fn save_manuscript_round_trip_persists_markers() {
        use crate::db::ProjectDb;
        use tempfile::TempDir;

        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        let rel = "Manuscrito/Escena.md";
        let raw = "---\ntitle: Escena\n---\n\n\
                   +++event\n---\nevent: ev\nentity: Worldbuilding/Eventos/ev.md\n\
                   barTags:\n  - type: time\n    value: \"1.0.0\"\n---\n\
                   texto {{time:2.0.0}}\n+++end-event\n";
        std::fs::create_dir_all(root.join("Manuscrito")).unwrap();
        std::fs::write(root.join(rel), raw).unwrap();

        let db = ProjectDb::open(root).unwrap();
        let manuscript = parse_manuscript_and_persist(&db, root, rel).unwrap();
        assert_eq!(manuscript.segments.len(), 1);

        let saved = save_manuscript_and_persist(&db, root, rel, manuscript).unwrap();
        assert!(matches!(&saved.segments[0], ManuscriptSegment::Event(e) if e.closed));

        let count: i64 = db
            .connection()
            .query_row("SELECT COUNT(*) FROM time_markers", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 2);
    }

    #[test]
    fn insert_inline_tag_and_close_event() {
        use crate::db::ProjectDb;
        use tempfile::TempDir;

        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        let rel = "Manuscrito/T.md";
        std::fs::create_dir_all(root.join("Manuscrito")).unwrap();
        std::fs::write(
            root.join(rel),
            "---\ntitle: T\n---\n+++event\n---\nevent: e\nentity: Worldbuilding/Eventos/e.md\n---\nabierto\n",
        )
        .unwrap();

        let db = ProjectDb::open(root).unwrap();
        let with_tag = insert_inline_tag_in_segment(
            &db,
            root,
            rel,
            0,
            0,
            "time".to_string(),
            "3.0.0".to_string(),
        )
        .unwrap();
        assert!(matches!(
            &with_tag.segments[0],
            ManuscriptSegment::Event(e) if e.inline_tags.len() == 1
        ));

        let closed = close_event_segment(&db, root, rel, 0).unwrap();
        assert!(matches!(
            &closed.segments[0],
            ManuscriptSegment::Event(e) if e.closed
        ));
    }
}
