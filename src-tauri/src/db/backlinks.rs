//! Consultas de backlinks (Fase 3.4).

use rusqlite::Connection;
use serde::Serialize;

use crate::error::AppError;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BacklinkRow {
    pub id: String,
    pub source_path: String,
    pub block_index: i32,
    pub snippet: Option<String>,
}

/// Backlinks hacia `entity_path`, ordenados por archivo y bloque.
pub fn list_backlinks(conn: &Connection, entity_path: &str) -> Result<Vec<BacklinkRow>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, source_path, block_index, snippet
             FROM backlinks
             WHERE entity_path = ?1
             ORDER BY source_path ASC, block_index ASC",
        )
        .map_err(|e| AppError::database(e.to_string()))?;

    let rows = stmt
        .query_map([entity_path], |row| {
            Ok(BacklinkRow {
                id: row.get(0)?,
                source_path: row.get(1)?,
                block_index: row.get(2)?,
                snippet: row.get(3)?,
            })
        })
        .map_err(|e| AppError::database(e.to_string()))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::database(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::ProjectDb;
    use tempfile::TempDir;

    #[test]
    fn lists_backlinks_ordered() {
        let tmp = TempDir::new().unwrap();
        let db = ProjectDb::open(tmp.path()).unwrap();
        let conn = db.connection();

        conn.execute(
            "INSERT INTO backlinks (id, entity_path, source_path, block_index, snippet)
             VALUES ('b2', 'ent/b.md', 'a.md', 1, 's2'),
                    ('b1', 'ent/b.md', 'a.md', 0, 's1')",
            [],
        )
        .unwrap();

        let list = list_backlinks(conn, "ent/b.md").unwrap();
        assert_eq!(list.len(), 2);
        assert_eq!(list[0].block_index, 0);
        assert_eq!(list[1].block_index, 1);
    }
}
