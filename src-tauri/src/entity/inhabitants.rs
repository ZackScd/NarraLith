//! Entidades que referencian una ubicación (Fase 4.2.4).

use rusqlite::Connection;
use serde::Serialize;
use serde_json::Value;

use crate::error::AppError;
use crate::fs::indexer::entity_id_for_path;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InhabitantRow {
    pub path: String,
    pub name: String,
    pub category: String,
}

const DEFAULT_LIMIT: usize = 100;

/// Personajes/facciones/otras fichas que enlazan o mencionan la ubicación en metadatos o wiki-links.
pub fn list_location_inhabitants(
    conn: &Connection,
    location_path: &str,
    limit: usize,
) -> Result<Vec<InhabitantRow>, AppError> {
    let location_name = path_stem(location_path);
    let mut seen = std::collections::HashSet::new();
    let mut out = Vec::new();

    collect_from_wiki_links(conn, location_path, &mut seen, &mut out, limit)?;
    if out.len() >= limit {
        return Ok(truncate(out, limit));
    }

    collect_from_metadata(
        conn,
        location_path,
        &location_name,
        &mut seen,
        &mut out,
        limit,
    )?;

    Ok(truncate(out, limit))
}

fn collect_from_wiki_links(
    conn: &Connection,
    location_path: &str,
    seen: &mut std::collections::HashSet<String>,
    out: &mut Vec<InhabitantRow>,
    limit: usize,
) -> Result<(), AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT wl.source_path
             FROM wiki_links wl
             INNER JOIN entities e ON e.path = wl.source_path AND e.status = 'active'
             WHERE wl.target_path = ?1 AND wl.source_path != ?1",
        )
        .map_err(|e| AppError::database(e.to_string()))?;

    let paths = stmt
        .query_map([location_path], |row| row.get::<_, String>(0))
        .map_err(|e| AppError::database(e.to_string()))?;

    for path in paths.flatten() {
        if out.len() >= limit {
            break;
        }
        push_entity(conn, &path, seen, out)?;
    }
    Ok(())
}

fn collect_from_metadata(
    conn: &Connection,
    location_path: &str,
    location_name: &str,
    seen: &mut std::collections::HashSet<String>,
    out: &mut Vec<InhabitantRow>,
    limit: usize,
) -> Result<(), AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT path, name, category, metadata
             FROM entities
             WHERE status = 'active' AND path != ?1",
        )
        .map_err(|e| AppError::database(e.to_string()))?;

    let rows = stmt
        .query_map([location_path], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        })
        .map_err(|e| AppError::database(e.to_string()))?;

    for row in rows.flatten() {
        if out.len() >= limit {
            break;
        }
        let (path, name, category, metadata_raw) = row;
        let Some(meta) = parse_metadata(&metadata_raw) else {
            continue;
        };
        if metadata_references_location(&meta, location_path, location_name) {
            let id = entity_id_for_path(&path);
            if seen.insert(id) {
                out.push(InhabitantRow { path, name, category });
            }
        }
    }
    Ok(())
}

fn metadata_references_location(meta: &Value, location_path: &str, location_name: &str) -> bool {
    let path_lower = location_path.to_lowercase();
    let name_lower = location_name.to_lowercase();
    metadata_contains_match(meta, &path_lower, &name_lower)
}

fn metadata_contains_match(value: &Value, path_lower: &str, name_lower: &str) -> bool {
    match value {
        Value::String(s) => string_matches_location(s, path_lower, name_lower),
        Value::Array(arr) => arr
            .iter()
            .any(|v| metadata_contains_match(v, path_lower, name_lower)),
        Value::Object(map) => map
            .values()
            .any(|v| metadata_contains_match(v, path_lower, name_lower)),
        _ => false,
    }
}

fn string_matches_location(s: &str, path_lower: &str, name_lower: &str) -> bool {
    let t = s.trim().to_lowercase();
    if t.is_empty() {
        return false;
    }
    t == path_lower
        || t.ends_with(&format!("/{name_lower}.md"))
        || t == name_lower
        || t.contains(&format!("[[{name_lower}]]"))
        || t.contains(&format!("[[{name_lower}|"))
}

fn parse_metadata(raw: &str) -> Option<Value> {
    if raw.trim().is_empty() || raw == "{}" {
        return None;
    }
    serde_json::from_str(raw).ok()
}

fn push_entity(
    conn: &Connection,
    path: &str,
    seen: &mut std::collections::HashSet<String>,
    out: &mut Vec<InhabitantRow>,
) -> Result<(), AppError> {
    let id = entity_id_for_path(path);
    if !seen.insert(id) {
        return Ok(());
    }
    let row: InhabitantRow = conn
        .query_row(
            "SELECT path, name, category FROM entities WHERE path = ?1 AND status = 'active'",
            [path],
            |r| {
                Ok(InhabitantRow {
                    path: r.get(0)?,
                    name: r.get(1)?,
                    category: r.get(2)?,
                })
            },
        )
        .map_err(|e| AppError::database(e.to_string()))?;
    out.push(row);
    Ok(())
}

fn path_stem(path: &str) -> String {
    path.rsplit('/')
        .next()
        .unwrap_or(path)
        .strip_suffix(".md")
        .unwrap_or(path)
        .to_string()
}

fn truncate(mut rows: Vec<InhabitantRow>, limit: usize) -> Vec<InhabitantRow> {
    rows.truncate(limit);
    rows
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::ProjectDb;
    use tempfile::TempDir;

    #[test]
    fn finds_entity_with_location_in_metadata() {
        let tmp = TempDir::new().unwrap();
        let db = ProjectDb::open(tmp.path()).unwrap();
        let conn = db.connection();
        let now = 1_i64;

        conn.execute(
            "INSERT INTO entities (id, name, path, category, color, aliases, metadata, created_at, updated_at, status)
             VALUES ('e1', 'Hero', 'Worldbuilding/Personajes/Hero.md', 'character', NULL, '[]',
                     '{\"location\":\"Ciudad\"}', ?1, ?1, 'active'),
                    ('e2', 'Ciudad', 'Worldbuilding/Ubicaciones/Ciudad.md', 'location', NULL, '[]',
                     '{}', ?1, ?1, 'active')",
            rusqlite::params![now],
        )
        .unwrap();

        let list =
            list_location_inhabitants(conn, "Worldbuilding/Ubicaciones/Ciudad.md", 100).unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].name, "Hero");
    }
}
