//! Reglas MVP de plothole: personaje en dos ubicaciones al mismo instante.

use std::collections::HashMap;

use rusqlite::Connection;
use serde::Serialize;
use serde_json::Value;

use crate::checker::dismissed::load_dismissed_ids;
use crate::error::AppError;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsistencyPathRef {
    pub path: String,
    pub block_index: i32,
    pub location: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsistencyIssue {
    pub id: String,
    pub kind: String,
    pub message_key: String,
    pub severity: String,
    pub character: String,
    pub timestamp: String,
    pub raw_time: String,
    pub paths: Vec<ConsistencyPathRef>,
}

#[derive(Debug, Clone)]
struct BlockPlacement {
    path: String,
    block_index: i32,
    location: Option<String>,
}

/// Escanea SQLite y devuelve issues no descartados.
pub fn scan_plothole_issues(
    conn: &Connection,
    project_root: &std::path::Path,
) -> Result<Vec<ConsistencyIssue>, AppError> {
    let dismissed = load_dismissed_ids(project_root)?;
    let mut issues = detect_dual_location_conflicts(conn)?;
    issues.retain(|issue| !dismissed.contains(&issue.id));
    Ok(issues)
}

fn detect_dual_location_conflicts(conn: &Connection) -> Result<Vec<ConsistencyIssue>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT b.file_path, b.block_index, b.metadata, tm.timestamp, tm.raw_time, tm.id
             FROM time_markers tm
             INNER JOIN blocks b ON b.id = tm.block_id
             WHERE tm.timestamp IS NOT NULL AND trim(tm.timestamp) != ''",
        )
        .map_err(|e| AppError::database(e.to_string()))?;

    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i32>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
            ))
        })
        .map_err(|e| AppError::database(e.to_string()))?;

    let mut groups: HashMap<(String, String), Vec<BlockPlacement>> = HashMap::new();

    for row in rows.flatten() {
        let (path, block_index, metadata_str, timestamp, raw_time, _marker_id) = row;
        let metadata = metadata_str
            .as_deref()
            .and_then(|s| serde_json::from_str::<Value>(s).ok())
            .unwrap_or(Value::Null);

        let location = metadata
            .get("location")
            .and_then(|v| v.as_str())
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());

        let Some(location) = location else {
            continue;
        };

        for character in extract_characters(&metadata) {
            groups
                .entry((timestamp.clone(), character))
                .or_default()
                .push(BlockPlacement {
                    path: path.clone(),
                    block_index,
                    location: Some(location.clone()),
                });
        }
        let _ = raw_time;
    }

    let mut issues = Vec::new();

    for ((timestamp, character), placements) in groups {
        let distinct_locations: Vec<String> = placements
            .iter()
            .filter_map(|p| p.location.as_ref())
            .map(|l| l.to_lowercase())
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();

        if distinct_locations.len() < 2 {
            continue;
        }

        let mut path_refs: Vec<ConsistencyPathRef> = placements
            .iter()
            .map(|p| ConsistencyPathRef {
                path: p.path.clone(),
                block_index: p.block_index,
                location: p.location.clone(),
            })
            .collect();
        path_refs.sort_by(|a, b| a.path.cmp(&b.path).then(a.block_index.cmp(&b.block_index)));
        path_refs.dedup_by(|a, b| {
            a.path == b.path && a.block_index == b.block_index
        });

        let raw_time = conn
            .query_row(
                "SELECT raw_time FROM time_markers WHERE timestamp = ?1 LIMIT 1",
                [&timestamp],
                |row| row.get::<_, String>(0),
            )
            .unwrap_or_else(|_| timestamp.clone());

        let id = stable_issue_id(&timestamp, &character, &path_refs);

        issues.push(ConsistencyIssue {
            id,
            kind: "dual_location".into(),
            message_key: "consistency.dualLocation".into(),
            severity: "warning".into(),
            character,
            timestamp,
            raw_time,
            paths: path_refs,
        });
    }

    issues.sort_by(|a, b| {
        a.timestamp
            .parse::<i64>()
            .unwrap_or(0)
            .cmp(&b.timestamp.parse::<i64>().unwrap_or(0))
            .then_with(|| a.character.cmp(&b.character))
    });

    Ok(issues)
}

fn extract_characters(metadata: &Value) -> Vec<String> {
    match metadata.get("characters") {
        Some(Value::Array(items)) => items
            .iter()
            .filter_map(|v| v.as_str().map(|s| s.trim().to_string()))
            .filter(|s| !s.is_empty())
            .collect(),
        Some(Value::String(s)) if !s.trim().is_empty() => vec![s.trim().to_string()],
        _ => Vec::new(),
    }
}

fn stable_issue_id(
    timestamp: &str,
    character: &str,
    paths: &[ConsistencyPathRef],
) -> String {
    let mut key = format!("dual_location:{timestamp}:{}", character.to_lowercase());
    for p in paths {
        key.push('|');
        key.push_str(&p.path);
        key.push(':');
        key.push_str(&p.block_index.to_string());
    }
    key
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
    fn detects_character_in_two_locations_same_timestamp() {
        let tmp = TempDir::new().unwrap();
        let db = ProjectDb::open(tmp.path()).unwrap();

        let doc_a = ParsedDocument {
            file_path: "Manuscrito/A.md".into(),
            blocks: vec![ParsedBlock {
                id: ParsedDocument::stable_block_id("Manuscrito/A.md", 0),
                index: 0,
                body: "a".into(),
                metadata: json!({
                    "time": "1.1.1",
                    "location": "Castle",
                    "characters": ["Hero"]
                }),
                content_hash: None,
                parse_error_key: None,
                time_timestamp: Some("100".into()),
            }],
        };
        let doc_b = ParsedDocument {
            file_path: "Manuscrito/B.md".into(),
            blocks: vec![ParsedBlock {
                id: ParsedDocument::stable_block_id("Manuscrito/B.md", 0),
                index: 0,
                body: "b".into(),
                metadata: json!({
                    "time": "1.1.1",
                    "location": "Forest",
                    "characters": ["Hero"]
                }),
                content_hash: None,
                parse_error_key: None,
                time_timestamp: Some("100".into()),
            }],
        };

        upsert_blocks_for_file(&db, &doc_a).unwrap();
        upsert_blocks_for_file(&db, &doc_b).unwrap();

        let issues = scan_plothole_issues(db.connection(), tmp.path()).unwrap();
        assert_eq!(issues.len(), 1);
        assert_eq!(issues[0].character, "Hero");
        assert_eq!(issues[0].paths.len(), 2);
    }

    #[test]
    fn dismiss_hides_issue() {
        let tmp = TempDir::new().unwrap();
        let db = ProjectDb::open(tmp.path()).unwrap();

        upsert_blocks_for_file(
            &db,
            &ParsedDocument {
                file_path: "Manuscrito/A.md".into(),
                blocks: vec![ParsedBlock {
                    id: ParsedDocument::stable_block_id("Manuscrito/A.md", 0),
                    index: 0,
                    body: "a".into(),
                    metadata: json!({
                        "time": "1.1.1",
                        "location": "Castle",
                        "characters": ["Hero"]
                    }),
                    content_hash: None,
                    parse_error_key: None,
                    time_timestamp: Some("100".into()),
                }],
            },
        )
        .unwrap();

        upsert_blocks_for_file(
            &db,
            &ParsedDocument {
                file_path: "Manuscrito/B.md".into(),
                blocks: vec![ParsedBlock {
                    id: ParsedDocument::stable_block_id("Manuscrito/B.md", 0),
                    index: 0,
                    body: "b".into(),
                    metadata: json!({
                        "time": "1.1.1",
                        "location": "Forest",
                        "characters": ["Hero"]
                    }),
                    content_hash: None,
                    parse_error_key: None,
                    time_timestamp: Some("100".into()),
                }],
            },
        )
        .unwrap();

        let issues = scan_plothole_issues(db.connection(), tmp.path()).unwrap();
        assert_eq!(issues.len(), 1);

        crate::checker::dismiss_issue(tmp.path(), &issues[0].id).unwrap();
        let filtered = scan_plothole_issues(db.connection(), tmp.path()).unwrap();
        assert!(filtered.is_empty());
    }
}
