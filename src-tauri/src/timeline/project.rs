//! Consultas de línea de tiempo a nivel proyecto (Fase 6.2.1).

use rusqlite::Connection;
use rusqlite::OptionalExtension;
use serde::Serialize;
use serde_json::Value;

use crate::error::AppError;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelineEvent {
    pub path: String,
    pub block_index: i32,
    pub title: Option<String>,
    pub snippet: Option<String>,
    pub timestamp: Option<String>,
    pub raw_time: String,
    pub time_hour: Option<u32>,
    pub segment_id: Option<String>,
    pub tag_kind: Option<String>,
    pub char_offset: Option<u32>,
    pub is_parallel: bool,
    pub characters: Vec<String>,
    pub location: Option<String>,
    pub persisted_at: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LastAddedTimeMarker {
    pub path: String,
    pub block_index: i32,
    pub raw_time: String,
    pub persisted_at: i64,
}

#[derive(Debug, Clone, Default)]
pub struct TimelineFilters {
    pub entity_path: Option<String>,
    pub category: Option<String>,
    pub from_timestamp: Option<String>,
    pub to_timestamp: Option<String>,
    pub limit: Option<u32>,
}

pub fn list_timeline_events(
    conn: &Connection,
    filters: &TimelineFilters,
) -> Result<Vec<TimelineEvent>, AppError> {
    let fetch_limit = filters.limit.unwrap_or(500).min(2000).saturating_mul(4) as i64;

    let mut stmt = conn
        .prepare(
            "SELECT b.file_path, b.block_index, b.metadata, tm.raw_time, tm.timestamp, tm.label, tm.persisted_at,
                    tm.segment_id, tm.tag_kind, tm.char_offset
             FROM time_markers tm
             INNER JOIN blocks b ON b.id = tm.block_id
             WHERE tm.raw_time IS NOT NULL AND trim(tm.raw_time) != ''
             ORDER BY
               CASE WHEN tm.timestamp IS NULL OR trim(tm.timestamp) = '' THEN 1 ELSE 0 END,
               CAST(tm.timestamp AS INTEGER) ASC,
               b.file_path ASC,
               b.block_index ASC,
               COALESCE(tm.segment_id, '') ASC,
               CASE COALESCE(tm.tag_kind, 'bar') WHEN 'bar' THEN 0 WHEN 'inline' THEN 1 ELSE 2 END,
               COALESCE(tm.char_offset, 0) ASC,
               tm.raw_time ASC
             LIMIT ?1",
        )
        .map_err(|e| AppError::database(e.to_string()))?;

    let rows = stmt
        .query_map([fetch_limit], |row| {
            let metadata_str: Option<String> = row.get(2)?;
            let raw_time: String = row.get(3)?;
            let path: String = row.get(0)?;
            let block_index: i32 = row.get(1)?;
            let timestamp: Option<String> = row.get(4)?;
            let label: Option<String> = row.get(5)?;
            let persisted_at: i64 = row.get(6)?;
            let segment_id: Option<String> = row.get(7)?;
            let tag_kind: Option<String> = row.get(8)?;
            let char_offset: Option<i64> = row.get(9)?;

            let metadata = metadata_str
                .as_deref()
                .and_then(|s| serde_json::from_str::<Value>(s).ok())
                .unwrap_or(Value::Null);

            let characters = extract_string_list(&metadata, "characters");
            let location = metadata
                .get("location")
                .and_then(|v| v.as_str())
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty());

            let title = metadata
                .get("event")
                .and_then(|v| v.as_str())
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .or_else(|| label.filter(|s| !s.trim().is_empty()));

            let snippet = metadata
                .get("event")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            let is_parallel = path.replace('\\', "/").contains("Escenas_Paralelas");

            let time_hour = metadata
                .get("timeHour")
                .and_then(|v| v.as_u64().or_else(|| v.as_i64().map(|n| n as u64)))
                .map(|n| n as u32);

            Ok(TimelineEvent {
                path,
                block_index,
                title,
                snippet,
                timestamp,
                raw_time,
                time_hour,
                segment_id,
                tag_kind,
                char_offset: char_offset.map(|n| n as u32),
                is_parallel,
                characters,
                location,
                persisted_at,
            })
        })
        .map_err(|e| AppError::database(e.to_string()))?;

    let mut events: Vec<TimelineEvent> = rows
        .filter_map(|r| r.ok())
        .collect();

    if let Some(category) = filters.category.as_deref() {
        events.retain(|event| matches_category(event, category));
    }

    if let Some(entity_path) = filters.entity_path.as_deref() {
        events.retain(|event| matches_entity(conn, event, entity_path));
    }

    if let Some(from) = filters.from_timestamp.as_deref() {
        let from_n: i64 = from.parse().unwrap_or(i64::MIN);
        events.retain(|event| {
            event
                .timestamp
                .as_deref()
                .and_then(|ts| ts.parse::<i64>().ok())
                .is_some_and(|n| n >= from_n)
        });
    }

    if let Some(to) = filters.to_timestamp.as_deref() {
        let to_n: i64 = to.parse().unwrap_or(i64::MAX);
        events.retain(|event| {
            event
                .timestamp
                .as_deref()
                .and_then(|ts| ts.parse::<i64>().ok())
                .is_some_and(|n| n <= to_n)
        });
    }

    let limit = filters.limit.unwrap_or(500).min(2000) as usize;
    events.truncate(limit);

    Ok(events)
}

/// Marca temporal persistida más recientemente (para "última fecha añadida" global).
pub fn find_last_persisted_time_marker(
    conn: &Connection,
) -> Result<Option<LastAddedTimeMarker>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT b.file_path, b.block_index, tm.raw_time, tm.persisted_at
             FROM time_markers tm
             INNER JOIN blocks b ON b.id = tm.block_id
             WHERE tm.raw_time IS NOT NULL AND trim(tm.raw_time) != ''
             ORDER BY tm.persisted_at DESC,
                      b.file_path DESC,
                      b.block_index DESC,
                      COALESCE(tm.segment_id, '') DESC,
                      CASE COALESCE(tm.tag_kind, 'bar') WHEN 'inline' THEN 1 ELSE 0 END DESC,
                      COALESCE(tm.char_offset, 0) DESC
             LIMIT 1",
        )
        .map_err(|e| AppError::database(e.to_string()))?;

    let result = stmt
        .query_row([], |row| {
            Ok(LastAddedTimeMarker {
                path: row.get(0)?,
                block_index: row.get(1)?,
                raw_time: row.get(2)?,
                persisted_at: row.get(3)?,
            })
        })
        .optional()
        .map_err(|e| AppError::database(e.to_string()))?;

    Ok(result)
}

fn matches_category(event: &TimelineEvent, category: &str) -> bool {
    let path = event.path.replace('\\', "/");
    match category {
        "manuscript" => path.starts_with("Manuscrito/") && !path.contains("Escenas_Paralelas"),
        "worldbuilding" => path.starts_with("Worldbuilding/"),
        "parallel" => path.contains("Escenas_Paralelas"),
        _ => true,
    }
}

fn matches_entity(
    conn: &Connection,
    event: &TimelineEvent,
    entity_path: &str,
) -> bool {
    let backlink: bool = conn
        .query_row(
            "SELECT 1 FROM backlinks
             WHERE source_path = ?1 AND block_index = ?2 AND entity_path = ?3
             LIMIT 1",
            rusqlite::params![event.path, event.block_index, entity_path],
            |_| Ok(()),
        )
        .is_ok();

    if backlink {
        return true;
    }

    let entity_name: Option<String> = conn
        .query_row(
            "SELECT name FROM entities WHERE path = ?1 LIMIT 1",
            [entity_path],
            |row| row.get(0),
        )
        .ok();

    let Some(name) = entity_name else {
        return false;
    };

    event.characters.iter().any(|c| c == &name)
        || event.location.as_deref() == Some(name.as_str())
}

fn extract_string_list(metadata: &Value, key: &str) -> Vec<String> {
    let Some(value) = metadata.get(key) else {
        return Vec::new();
    };
    match value {
        Value::Array(items) => items
            .iter()
            .filter_map(|v| v.as_str().map(|s| s.trim().to_string()))
            .filter(|s| !s.is_empty())
            .collect(),
        Value::String(s) if !s.trim().is_empty() => vec![s.trim().to_string()],
        _ => Vec::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::blocks::upsert_blocks_for_file;
    use crate::db::ProjectDb;
    use crate::parser::{ParsedBlock, ParsedDocument};
    use serde_json::json;
    use tempfile::TempDir;

    #[test]
    fn timeline_events_ordered_by_timestamp() {
        let tmp = TempDir::new().unwrap();
        let db = ProjectDb::open(tmp.path()).unwrap();

        let doc = ParsedDocument {
            file_path: "Manuscrito/Scene.md".into(),
            blocks: vec![
                ParsedBlock {
                    id: ParsedDocument::stable_block_id("Manuscrito/Scene.md", 0),
                    index: 0,
                    body: "later".into(),
                    metadata: json!({"time": "2.1.1"}),
                    content_hash: None,
                    parse_error_key: None,
                    time_timestamp: Some("400".into()),
                },
                ParsedBlock {
                    id: ParsedDocument::stable_block_id("Manuscrito/Scene.md", 1),
                    index: 1,
                    body: "earlier".into(),
                    metadata: json!({"time": "1.1.1"}),
                    content_hash: None,
                    parse_error_key: None,
                    time_timestamp: Some("100".into()),
                },
            ],
        };
        upsert_blocks_for_file(&db, &doc).unwrap();

        let list = list_timeline_events(db.connection(), &TimelineFilters::default()).unwrap();
        assert_eq!(list.len(), 2);
        assert_eq!(list[0].raw_time, "1.1.1");
        assert_eq!(list[1].raw_time, "2.1.1");
    }

    #[test]
    fn parallel_scene_flagged() {
        let tmp = TempDir::new().unwrap();
        let db = ProjectDb::open(tmp.path()).unwrap();

        let path = "Manuscrito/Escenas_Paralelas/Offscreen.md";
        let doc = ParsedDocument {
            file_path: path.into(),
            blocks: vec![ParsedBlock {
                id: ParsedDocument::stable_block_id(path, 0),
                index: 0,
                body: "off".into(),
                metadata: json!({"time": "1.1.1"}),
                content_hash: None,
                parse_error_key: None,
                time_timestamp: None,
            }],
        };
        upsert_blocks_for_file(&db, &doc).unwrap();

        let list = list_timeline_events(db.connection(), &TimelineFilters::default()).unwrap();
        assert_eq!(list.len(), 1);
        assert!(list[0].is_parallel);
    }

    #[test]
    fn last_persisted_marker_prefers_recent_file_over_lex_path() {
        let tmp = TempDir::new().unwrap();
        let db = ProjectDb::open(tmp.path()).unwrap();

        let escena = ParsedDocument {
            file_path: "Manuscrito/carpeta/escena 1.md".into(),
            blocks: vec![ParsedBlock {
                id: ParsedDocument::stable_block_id("Manuscrito/carpeta/escena 1.md", 0),
                index: 0,
                body: "escena".into(),
                metadata: json!({"time": "9.3.2050"}),
                content_hash: None,
                parse_error_key: None,
                time_timestamp: None,
            }],
        };
        upsert_blocks_for_file(&db, &escena).unwrap();

        std::thread::sleep(std::time::Duration::from_millis(5));

        let other = ParsedDocument {
            file_path: "Manuscrito/carpeta/a.md".into(),
            blocks: vec![ParsedBlock {
                id: ParsedDocument::stable_block_id("Manuscrito/carpeta/a.md", 0),
                index: 0,
                body: "a".into(),
                metadata: json!({"time": "10.3.2056"}),
                content_hash: None,
                parse_error_key: None,
                time_timestamp: None,
            }],
        };
        upsert_blocks_for_file(&db, &other).unwrap();

        let last = find_last_persisted_time_marker(db.connection())
            .unwrap()
            .expect("marker");
        assert_eq!(last.raw_time, "10.3.2056");
        assert_eq!(last.path, "Manuscrito/carpeta/a.md");
    }
}
