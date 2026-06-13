//! Serialización de documentos `.md` (legacy `ParsedDocument` y manuscrito §1.4).

use serde_json::{json, Map, Value};

use crate::error::AppError;
use crate::parser::types::{
    EventSegment, ManuscriptFileHeader, ManuscriptSegment, ParsedBlock, ParsedManuscript,
};

/// Reconstruye el archivo legacy con `+++` entre bloques.
pub fn serialize_document(blocks: &[ParsedBlock]) -> Result<String, AppError> {
    if blocks.is_empty() {
        return Ok(String::new());
    }

    let mut out = String::new();
    for (i, block) in blocks.iter().enumerate() {
        if i > 0 {
            if !out.is_empty() && !out.ends_with('\n') {
                out.push('\n');
            }
            out.push_str("+++\n");
        }
        out.push_str(&serialize_block_frontmatter(&block.metadata)?);
        out.push_str(&block.body);
    }
    Ok(out)
}

/// Emite formato §1.4 (`+++event` / `+++end-event`, sin `+++` genéricos).
pub fn serialize_manuscript(doc: &ParsedManuscript) -> Result<String, AppError> {
    let mut out = serialize_file_header(&doc.file_header)?;

    for (i, segment) in doc.segments.iter().enumerate() {
        if i > 0 || !doc.file_header.body.is_empty() {
            push_manuscript_segment_separator(&mut out, segment);
        }
        match segment {
            ManuscriptSegment::FreeText(seg) => {
                out.push_str(&seg.body);
            }
            ManuscriptSegment::Event(event) => {
                out.push_str(&serialize_event_segment(event)?);
            }
        }
    }

    Ok(out)
}

fn push_manuscript_segment_separator(out: &mut String, segment: &ManuscriptSegment) {
    if out.is_empty() {
        return;
    }
    if !out.ends_with('\n') {
        out.push('\n');
    }
    match segment {
        ManuscriptSegment::Event(_) => {
            if !out.ends_with("\n\n") {
                out.push('\n');
            }
        }
        ManuscriptSegment::FreeText(_) => {
            // Una sola newline tras el bloque anterior; el cuerpo conserva su whitespace.
        }
    }
}

fn serialize_file_header(header: &ManuscriptFileHeader) -> Result<String, AppError> {
    let mut out = String::new();
    let has_title = !header.title.trim().is_empty();
    if has_title {
        let mut map = Map::new();
        map.insert("title".to_string(), json!(header.title));
        out.push_str(&yaml_fence_from_map(&map)?);
    }
    out.push_str(&header.body);
    Ok(out)
}

fn serialize_event_segment(event: &EventSegment) -> Result<String, AppError> {
    let mut out = String::from("+++event\n");
    let mut map = Map::new();
    map.insert("event".to_string(), json!(event.name));
    map.insert("description".to_string(), json!(event.description));
    map.insert("entity".to_string(), json!(event.entity_path));
    if !event.bar_tags.is_empty() {
        let tags: Vec<Value> = event
            .bar_tags
            .iter()
            .map(|t| {
                let mut tag = json!({ "type": t.tag_type, "value": t.value });
                if let Some(hour) = t.hour {
                    tag["hour"] = json!(hour);
                }
                if t.calendar_reconciled {
                    tag["calendarReconciled"] = json!(true);
                }
                tag
            })
            .collect();
        map.insert("barTags".to_string(), Value::Array(tags));
    }
    out.push_str(&yaml_fence_from_map(&map)?);
    out.push_str(&event.body);
    if event.closed {
        if !out.ends_with('\n') {
            out.push('\n');
        }
        out.push_str("+++end-event");
    }
    Ok(out)
}

fn serialize_block_frontmatter(metadata: &Value) -> Result<String, AppError> {
    let obj = match metadata.as_object() {
        Some(o) if !o.is_empty() => o,
        _ => return Ok(String::new()),
    };

    yaml_fence_from_map(obj)
}

fn yaml_fence_from_map(map: &Map<String, Value>) -> Result<String, AppError> {
    let yaml = serde_yaml::to_string(map).map_err(|e| AppError::database(e.to_string()))?;
    let yaml = yaml.trim_end();
    Ok(format!("---\n{yaml}\n---\n"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::{
        parse_document_str, parse_manuscript_str, types::ParsedDocument, BarTag, EventSegment,
        FreeTextSegment,
    };
    use serde_json::json;

    fn block(index: i32, body: &str, meta: Value) -> ParsedBlock {
        ParsedBlock {
            id: ParsedDocument::stable_block_id("test.md", index),
            index,
            body: body.to_string(),
            metadata: meta,
            content_hash: None,
            parse_error_key: None,
            time_timestamp: None,
        }
    }

    #[test]
    fn round_trip_three_blocks() {
        let raw = "---\ntime: T0\n---\nFirst body.\n\n+++\n---\ntime: T1\n---\nSecond.\n\n+++\nThird only.";
        let doc = parse_document_str("scene.md", raw).expect("parse");
        let serialized = serialize_document(&doc.blocks).expect("serialize");
        let again = parse_document_str("scene.md", &serialized).expect("re-parse");
        assert_eq!(again.blocks.len(), doc.blocks.len());
        for (a, b) in again.blocks.iter().zip(doc.blocks.iter()) {
            assert_eq!(a.body, b.body);
            assert_eq!(a.metadata, b.metadata);
        }
    }

    #[test]
    fn single_block_without_frontmatter() {
        let blocks = vec![block(0, "Narrative only.", json!({}))];
        let s = serialize_document(&blocks).unwrap();
        assert_eq!(s, "Narrative only.");
    }

    #[test]
    fn manuscript_round_trip_plan_example() {
        let raw = "\
---\n\
title: Escena 1\n\
---\n\
texto fuera\n\n\
+++event\n\
---\n\
event: guerra de nosequé\n\
description: La coalición ataca al amanecer.\n\
entity: Worldbuilding/Eventos/guerra de nosequé.md\n\
barTags:\n  - type: time\n    value: \"10.1.0\"\n\
---\n\
texto del bloque {{time:10.1.0}}\n\
al día siguiente {{time:11.1.0}}\n\n\
+++end-event\n\n\
texto después\n\n\
+++event\n\
---\n\
event: otro evento\n\
description:\n\
entity: Worldbuilding/Eventos/otro evento.md\n\
---\n\
solo prosa\n\n\
+++end-event\n\n\
+++event\n\
---\n\
event: tercer evento\n\
description:\n\
entity: Worldbuilding/Eventos/tercer evento.md\n\
barTags:\n  - type: time\n    value: \"18.1.0\"\n\
---\n\
a la semana siguiente {{time:18.1.0}}";

        let doc = parse_manuscript_str("Manuscrito/Escena.md", raw).unwrap();
        assert_eq!(doc.file_header.title, "Escena 1");
        assert_eq!(doc.file_header.body, "texto fuera\n\n");
        assert_eq!(doc.segments.len(), 5);

        let events: Vec<_> = doc
            .segments
            .iter()
            .filter_map(|s| match s {
                ManuscriptSegment::Event(e) => Some(e),
                _ => None,
            })
            .collect();
        assert_eq!(events.len(), 3);
        assert!(events[0].closed);
        assert!(events[1].closed);
        assert!(!events[2].closed);
        assert_eq!(events[0].bar_tags.len(), 1);
        assert!(events[1].bar_tags.is_empty());
        assert_eq!(events[0].inline_tags.len(), 2);

        let serialized = serialize_manuscript(&doc).unwrap();
        let again = parse_manuscript_str("Manuscrito/Escena.md", &serialized).unwrap();
        assert_eq!(again.file_header.title, doc.file_header.title);
        assert_eq!(again.file_header.body, doc.file_header.body);
        assert_eq!(again.segments.len(), doc.segments.len());
        for (a, b) in again.segments.iter().zip(doc.segments.iter()) {
            assert_eq!(a.segment_index(), b.segment_index());
            assert_eq!(a.body(), b.body());
            if let (ManuscriptSegment::Event(ea), ManuscriptSegment::Event(eb)) = (a, b) {
                assert_eq!(ea.name, eb.name);
                assert_eq!(ea.description, eb.description);
                assert_eq!(ea.entity_path, eb.entity_path);
                assert_eq!(ea.bar_tags, eb.bar_tags);
                assert_eq!(ea.inline_tags, eb.inline_tags);
                assert_eq!(ea.closed, eb.closed);
            }
        }
    }

    #[test]
    fn manuscript_empty_file_header_only() {
        let doc = ParsedManuscript::header_only("Manuscrito/Nuevo.md", "Nuevo");
        let raw = serialize_manuscript(&doc).unwrap();
        let again = parse_manuscript_str("Manuscrito/Nuevo.md", &raw).unwrap();
        assert_eq!(again.file_header.title, "Nuevo");
        assert!(again.segments.is_empty());
    }

    #[test]
    fn event_without_bar_tags_serializes_without_key() {
        let path = "Manuscrito/A.md";
        let doc = ParsedManuscript {
            file_path: path.to_string(),
            format: crate::parser::types::ManuscriptFormat::EventSegments,
            file_header: ManuscriptFileHeader {
                title: "A".into(),
                body: String::new(),
            },
            segments: vec![ManuscriptSegment::Event(EventSegment::new(
                path,
                0,
                "evt",
                "",
                "Worldbuilding/Eventos/evt.md",
                "body",
                true,
            ))],
        };
        let raw = serialize_manuscript(&doc).unwrap();
        assert!(!raw.contains("barTags:"));
        let again = parse_manuscript_str(path, &raw).unwrap();
        match &again.segments[0] {
            ManuscriptSegment::Event(e) => assert!(e.bar_tags.is_empty()),
            _ => panic!("expected event"),
        }
    }
}
