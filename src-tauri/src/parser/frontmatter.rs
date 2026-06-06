//! Extracción de frontmatter YAML (`---` … `---`) por segmento de bloque.

use serde_json::{json, Value};

use crate::error::AppError;
use crate::parser::types::BarTag;

/// Resultado de parsear un segmento: metadata JSON y cuerpo limpio.
pub struct SegmentParts {
    pub metadata: Value,
    pub body: String,
    pub yaml_error: Option<AppError>,
}

/// Separa frontmatter opcional del cuerpo. YAML inválido → metadata `{}` y `yaml_error` con detalles.
pub fn parse_segment(segment: &str) -> SegmentParts {
    let trimmed = segment.trim_start();
    if !trimmed.starts_with("---") {
        return SegmentParts {
            metadata: json!({}),
            body: segment.trim().to_string(),
            yaml_error: None,
        };
    }

    let after_open = &trimmed[3..];
    let after_open = after_open
        .strip_prefix('\n')
        .or_else(|| after_open.strip_prefix("\r\n"))
        .unwrap_or(after_open);

    let Some((yaml_end, body_start)) = find_closing_fence(after_open) else {
        return SegmentParts {
            metadata: json!({}),
            body: segment.trim().to_string(),
            yaml_error: None,
        };
    };

    let yaml_str = &after_open[..yaml_end];
    let body = after_open[body_start..].trim().to_string();

    if yaml_str.trim().is_empty() {
        return SegmentParts {
            metadata: json!({}),
            body,
            yaml_error: None,
        };
    }

    match serde_yaml::from_str::<serde_yaml::Value>(yaml_str) {
        Ok(yaml_value) => {
            let meta = serde_json::to_value(yaml_value).unwrap_or(json!({}));
            SegmentParts {
                metadata: normalize_metadata(meta),
                body,
                yaml_error: None,
            }
        }
        Err(e) => SegmentParts {
            metadata: json!({}),
            body,
            yaml_error: Some(AppError::with_details(
                "error.parser.invalid_yaml",
                e.to_string(),
            )),
        },
    }
}

fn find_closing_fence(text: &str) -> Option<(usize, usize)> {
    let mut offset = 0;
    for line in text.split_inclusive('\n') {
        let line_trim = line.trim_end_matches(['\r', '\n']);
        if line_trim == "---" {
            let yaml_end = offset;
            let body_start = offset + line.len();
            return Some((yaml_end, body_start));
        }
        offset += line.len();
    }
    None
}

/// Campos YAML de apertura de un `+++event` (§1.4 / §1.5).
#[derive(Debug, Clone)]
pub struct EventOpening {
    pub name: String,
    pub description: String,
    pub entity_path: String,
    pub bar_tags: Vec<BarTag>,
    pub yaml_error: Option<AppError>,
}

/// Parsea el bloque tras `+++event`: frontmatter YAML + cuerpo del evento.
pub fn parse_event_opening(text: &str) -> (EventOpening, String) {
    let parts = parse_segment(text);
    let opening = event_opening_from_metadata(&parts.metadata, parts.yaml_error);
    (opening, parts.body)
}

fn event_opening_from_metadata(metadata: &Value, yaml_error: Option<AppError>) -> EventOpening {
    EventOpening {
        name: metadata_string(metadata, "event").unwrap_or_default(),
        description: metadata_string(metadata, "description").unwrap_or_default(),
        entity_path: metadata_string(metadata, "entity").unwrap_or_default(),
        bar_tags: bar_tags_from_metadata(metadata),
        yaml_error,
    }
}

fn metadata_string(metadata: &Value, key: &str) -> Option<String> {
    metadata.get(key).and_then(|v| match v {
        Value::String(s) => Some(s.clone()),
        Value::Number(n) => Some(n.to_string()),
        Value::Bool(b) => Some(b.to_string()),
        _ => None,
    })
}

fn bar_tags_from_metadata(metadata: &Value) -> Vec<BarTag> {
    metadata
        .get("barTags")
        .and_then(|v| serde_json::from_value::<Vec<BarTag>>(v.clone()).ok())
        .unwrap_or_default()
}

/// Convierte YAML a objeto JSON plano para IPC y SQLite.
fn normalize_metadata(value: Value) -> Value {
    match value {
        Value::Object(map) => Value::Object(map),
        Value::Null => json!({}),
        other => {
            let mut map = serde_json::Map::new();
            map.insert("_value".to_string(), other);
            Value::Object(map)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plain_text_without_frontmatter() {
        let parts = parse_segment("Just narrative text.");
        assert!(parts.metadata.as_object().unwrap().is_empty());
        assert_eq!(parts.body, "Just narrative text.");
        assert!(parts.yaml_error.is_none());
    }

    #[test]
    fn valid_yaml_frontmatter() {
        let raw = "---\ntime: \"Año 3\"\nlocation: \"Arath\"\n---\nBody here.";
        let parts = parse_segment(raw);
        assert_eq!(parts.body, "Body here.");
        assert_eq!(parts.metadata["time"], "Año 3");
        assert!(parts.yaml_error.is_none());
    }

    #[test]
    fn empty_frontmatter_fence() {
        let raw = "---\n---\n\nBody";
        let parts = parse_segment(raw);
        assert!(parts.metadata.as_object().unwrap().is_empty());
        assert_eq!(parts.body, "Body");
    }

    #[test]
    fn invalid_yaml_returns_error_handle() {
        let raw = "---\ntime: [unclosed\n---\nBody";
        let parts = parse_segment(raw);
        assert!(parts.yaml_error.is_some());
        assert_eq!(parts.body, "Body");
    }

    #[test]
    fn event_opening_parses_fields_and_bar_tags() {
        let raw = "---\nevent: guerra\n\
description: Ataque\n\
entity: Worldbuilding/Eventos/guerra.md\n\
barTags:\n  - type: time\n    value: \"10.1.0\"\n\
---\n\
cuerpo";
        let (opening, body) = parse_event_opening(raw);
        assert_eq!(opening.name, "guerra");
        assert_eq!(opening.description, "Ataque");
        assert_eq!(opening.entity_path, "Worldbuilding/Eventos/guerra.md");
        assert_eq!(opening.bar_tags.len(), 1);
        assert_eq!(opening.bar_tags[0].tag_type, "time");
        assert_eq!(opening.bar_tags[0].value, "10.1.0");
        assert_eq!(body, "cuerpo");
        assert!(opening.yaml_error.is_none());
    }

    #[test]
    fn event_opening_without_bar_tags() {
        let raw = "---\nevent: solo\n\
description:\n\
entity: Worldbuilding/Eventos/solo.md\n\
---\n\
prosa";
        let (opening, body) = parse_event_opening(raw);
        assert!(opening.bar_tags.is_empty());
        assert_eq!(opening.name, "solo");
        assert_eq!(body, "prosa");
    }
}
