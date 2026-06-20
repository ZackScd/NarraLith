//! Ocurrencias ubicación manuscrito §4bis.1 (MAP-011).

use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::error::AppError;
use crate::fs::reconcile::list_md_relative_paths;
use crate::parser::{
    parse_manuscript_str, scan_inline_tags, EventSegment, ManuscriptSegment, ParsedManuscript,
};

const MAX_OCCURRENCES: usize = 5000;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProjectLocationOccurrenceV1 {
    pub id: String,
    pub location_key: String,
    pub label: String,
    pub effective_time_raw: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub effective_timestamp: Option<String>,
    pub source_path: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub segment_id: Option<String>,
    pub tag_kind: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub char_offset: Option<u32>,
}

pub fn normalize_location_key(raw: &str) -> String {
    raw.split_whitespace().collect::<Vec<_>>().join(" ").to_lowercase()
}

pub fn list_project_location_occurrences(
    project_root: &Path,
) -> Result<Vec<ProjectLocationOccurrenceV1>, AppError> {
    let mut out = Vec::new();
    let paths = list_md_relative_paths(project_root)?;
    for rel in paths {
        if !rel.replace('\\', "/").starts_with("Manuscrito/") {
            continue;
        }
        let full = project_root.join(&rel);
        let raw = match std::fs::read_to_string(&full) {
            Ok(content) => content,
            Err(_) => continue,
        };
        let manuscript = match parse_manuscript_str(&rel, &raw) {
            Ok(doc) => doc,
            Err(_) => continue,
        };
        extract_from_manuscript(&manuscript, &mut out);
        if out.len() >= MAX_OCCURRENCES {
            out.truncate(MAX_OCCURRENCES);
            break;
        }
    }
    Ok(out)
}

fn extract_from_manuscript(manuscript: &ParsedManuscript, out: &mut Vec<ProjectLocationOccurrenceV1>) {
    for segment in &manuscript.segments {
        if let ManuscriptSegment::Event(event) = segment {
            extract_from_event(event, &manuscript.file_path, out);
        }
    }
}

fn extract_from_event(event: &EventSegment, file_path: &str, out: &mut Vec<ProjectLocationOccurrenceV1>) {
    let mut effective_time: Option<String> = None;

    for (bar_index, tag) in event.bar_tags.iter().enumerate() {
        apply_tag(
            &tag.tag_type,
            &tag.value,
            "bar",
            file_path,
            &event.id,
            event.segment_index,
            Some(bar_index as u32),
            None,
            &mut effective_time,
            out,
        );
    }

    let inline_tags = if event.inline_tags.is_empty() {
        scan_inline_tags(&event.body)
    } else {
        event.inline_tags.clone()
    };

    for tag in inline_tags {
        apply_tag(
            &tag.tag_type,
            &tag.value,
            "inline",
            file_path,
            &event.id,
            event.segment_index,
            None,
            Some(tag.char_offset),
            &mut effective_time,
            out,
        );
    }
}

#[allow(clippy::too_many_arguments)]
fn apply_tag(
    tag_type: &str,
    value: &str,
    tag_kind: &str,
    file_path: &str,
    segment_id: &str,
    segment_index: i32,
    bar_index: Option<u32>,
    char_offset: Option<u32>,
    effective_time: &mut Option<String>,
    out: &mut Vec<ProjectLocationOccurrenceV1>,
) {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return;
    }
    if tag_type == "time" {
        *effective_time = Some(trimmed.to_string());
        return;
    }
    if tag_type != "location" {
        return;
    }
    let Some(time_raw) = effective_time.clone() else {
        return;
    };
    let id = match tag_kind {
        "bar" => format!(
            "{file_path}::seg::{segment_index}::bar::{}",
            bar_index.unwrap_or(0)
        ),
        "inline" => format!(
            "{file_path}::seg::{segment_index}::inline::{}",
            char_offset.unwrap_or(0)
        ),
        _ => format!("{file_path}::seg::{segment_index}::metadata"),
    };
    out.push(ProjectLocationOccurrenceV1 {
        id,
        location_key: normalize_location_key(trimmed),
        label: trimmed.to_string(),
        effective_time_raw: time_raw,
        effective_timestamp: None,
        source_path: file_path.to_string(),
        segment_id: Some(segment_id.to_string()),
        tag_kind: tag_kind.to_string(),
        char_offset,
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::BarTag;

    fn sample_event() -> EventSegment {
        EventSegment {
            id: "Manuscrito/A.md::seg::0".to_string(),
            segment_index: 0,
            name: "E".to_string(),
            description: String::new(),
            entity_path: "Manuscrito/A.md".to_string(),
            bar_tags: vec![
                BarTag {
                    tag_type: "time".to_string(),
                    value: "10.1.2020".to_string(),
                    hour: None,
                    calendar_reconciled: false,
                },
                BarTag {
                    tag_type: "location".to_string(),
                    value: "A".to_string(),
                    hour: None,
                    calendar_reconciled: false,
                },
                BarTag {
                    tag_type: "location".to_string(),
                    value: "B".to_string(),
                    hour: None,
                    calendar_reconciled: false,
                },
                BarTag {
                    tag_type: "time".to_string(),
                    value: "15.7.2025".to_string(),
                    hour: None,
                    calendar_reconciled: false,
                },
                BarTag {
                    tag_type: "location".to_string(),
                    value: "C".to_string(),
                    hour: None,
                    calendar_reconciled: false,
                },
            ],
            body: String::new(),
            inline_tags: Vec::new(),
            closed: true,
        }
    }

    #[test]
    fn spec_example_a_b_at_x_c_at_y() {
        let mut out = Vec::new();
        extract_from_event(&sample_event(), "Manuscrito/A.md", &mut out);
        assert_eq!(out.len(), 3);
        assert_eq!(out[0].label, "A");
        assert_eq!(out[0].effective_time_raw, "10.1.2020");
        assert_eq!(out[2].label, "C");
        assert_eq!(out[2].effective_time_raw, "15.7.2025");
    }

    #[test]
    fn normalize_key_casefold() {
        assert_eq!(normalize_location_key("  Castillo "), "castillo");
    }
}
