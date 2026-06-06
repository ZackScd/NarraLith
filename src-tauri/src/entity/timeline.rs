//! Línea de tiempo de ficha evento WB desde `time_markers` (§1.5, Fase 5.3).

use rusqlite::Connection;
use serde::Serialize;
use serde_json::Value;

use crate::error::AppError;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelineEntry {
    pub source_path: String,
    pub block_index: i32,
    pub snippet: Option<String>,
    pub time_label: Option<String>,
    pub sort_key: String,
    pub segment_id: Option<String>,
    pub tag_kind: Option<String>,
    pub char_offset: Option<u32>,
}

/// Trayectoria temporal de un evento WB (`entity_path` en `time_markers`).
pub fn list_entity_timeline(
    conn: &Connection,
    entity_path: &str,
) -> Result<Vec<TimelineEntry>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT b.file_path, b.block_index, b.metadata, tm.raw_time, tm.timestamp, tm.label,
                    tm.segment_id, tm.tag_kind, tm.char_offset
             FROM time_markers tm
             INNER JOIN blocks b ON b.id = tm.block_id
             WHERE tm.entity_path = ?1
               AND tm.raw_time IS NOT NULL AND trim(tm.raw_time) != ''
             ORDER BY
               CASE WHEN tm.timestamp IS NULL OR trim(tm.timestamp) = '' THEN 1 ELSE 0 END,
               CAST(tm.timestamp AS INTEGER) ASC,
               b.file_path ASC,
               b.block_index ASC,
               COALESCE(tm.segment_id, '') ASC,
               CASE COALESCE(tm.tag_kind, 'bar') WHEN 'bar' THEN 0 WHEN 'inline' THEN 1 ELSE 2 END,
               COALESCE(tm.char_offset, 0) ASC,
               tm.raw_time ASC",
        )
        .map_err(|e| AppError::database(e.to_string()))?;

    let rows = stmt
        .query_map([entity_path], |row| {
            let metadata_str: Option<String> = row.get(2)?;
            let raw_time: String = row.get(3)?;
            let timestamp: Option<String> = row.get(4)?;
            let tm_label: Option<String> = row.get(5)?;
            let segment_id: Option<String> = row.get(6)?;
            let tag_kind: Option<String> = row.get(7)?;
            let char_offset: Option<i64> = row.get(8)?;

            let meta_time = metadata_str
                .as_deref()
                .and_then(parse_metadata_time);
            let time_label = pick_time_label(Some(raw_time.clone()), tm_label, meta_time);

            let sort_key = timestamp
                .as_deref()
                .filter(|s| !s.trim().is_empty())
                .map(str::to_string)
                .unwrap_or_else(|| time_label.clone().unwrap_or_else(|| {
                    let path = row.get::<_, String>(0).unwrap_or_default();
                    let idx = row.get::<_, i32>(1).unwrap_or(0);
                    format!("{path}:{idx:04}")
                }));

            let snippet = metadata_str
                .as_deref()
                .and_then(|s| serde_json::from_str::<Value>(s).ok())
                .and_then(|meta| {
                    meta.get("event")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string())
                });

            Ok(TimelineEntry {
                source_path: row.get(0)?,
                block_index: row.get(1)?,
                snippet,
                time_label,
                sort_key,
                segment_id,
                tag_kind,
                char_offset: char_offset.map(|n| n as u32),
            })
        })
        .map_err(|e| AppError::database(e.to_string()))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::database(e.to_string()))
}

fn parse_metadata_time(raw: &str) -> Option<String> {
    let value: Value = serde_json::from_str(raw).ok()?;
    value
        .get("time")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

fn pick_time_label(
    raw_time: Option<String>,
    tm_label: Option<String>,
    meta_time: Option<String>,
) -> Option<String> {
    raw_time
        .filter(|s| !s.trim().is_empty())
        .or(tm_label.filter(|s| !s.trim().is_empty()))
        .or(meta_time)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::blocks::upsert_blocks_for_file;
    use crate::db::ProjectDb;
    use crate::parser::{manuscript_to_document, parse_manuscript_str};
    use tempfile::TempDir;

    #[test]
    fn timeline_lists_markers_by_entity_path_in_trajectory_order() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path().canonicalize().unwrap();
        let path = "Manuscrito/Escena.md";
        let entity = "Worldbuilding/Eventos/guerra.md";
        let raw = format!(
            "---\ntitle: Escena\n---\n\n\
             +++event\n---\nevent: guerra\nentity: {entity}\n\
             barTags:\n  - type: time\n    value: \"1.1.1\"\n---\n\
             cuerpo {{{{time:2.2.2}}}}\n+++end-event\n"
        );
        std::fs::create_dir_all(root.join("Manuscrito")).unwrap();
        std::fs::write(root.join(path), &raw).unwrap();

        let db = ProjectDb::open(&root).unwrap();
        let manuscript = parse_manuscript_str(path, &raw).unwrap();
        let doc = manuscript_to_document(&manuscript);
        upsert_blocks_for_file(&db, &doc).unwrap();

        let list = list_entity_timeline(db.connection(), entity).unwrap();
        assert_eq!(list.len(), 2);
        assert_eq!(list[0].time_label.as_deref(), Some("1.1.1"));
        assert_eq!(list[0].tag_kind.as_deref(), Some("bar"));
        assert_eq!(list[1].time_label.as_deref(), Some("2.2.2"));
        assert_eq!(list[1].tag_kind.as_deref(), Some("inline"));
    }

    #[test]
    fn timeline_empty_for_unknown_entity() {
        let tmp = TempDir::new().unwrap();
        let db = ProjectDb::open(tmp.path()).unwrap();
        let list = list_entity_timeline(db.connection(), "Worldbuilding/Eventos/Nobody.md")
            .unwrap();
        assert!(list.is_empty());
    }
}
