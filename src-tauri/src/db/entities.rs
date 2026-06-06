//! Consultas a la tabla `entities` para el diccionario interno (Fase 3.1).

use rusqlite::{Connection, Row};
use serde::Serialize;

use crate::error::AppError;

/// Fila expuesta al frontend para MiniSearch (`list_entities_for_search`).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EntitySearchRow {
    pub id: String,
    pub name: String,
    pub path: String,
    pub category: String,
    pub aliases: Vec<String>,
}

/// Lista entidades activas del proyecto abierto.
pub fn list_active_entities(conn: &Connection) -> Result<Vec<EntitySearchRow>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, path, category, aliases
             FROM entities
             WHERE status = 'active'
             ORDER BY name COLLATE NOCASE ASC",
        )
        .map_err(|e| AppError::database(e.to_string()))?;

    let rows = stmt
        .query_map([], map_entity_row)
        .map_err(|e| AppError::database(e.to_string()))?;

    let mut out = Vec::new();
    for row in rows {
        out.push(row.map_err(|e| AppError::database(e.to_string()))?);
    }
    Ok(out)
}

fn map_entity_row(row: &Row<'_>) -> Result<EntitySearchRow, rusqlite::Error> {
    let aliases_json: String = row.get(4)?;
    let aliases = parse_aliases_json(&aliases_json);
    Ok(EntitySearchRow {
        id: row.get(0)?,
        name: row.get(1)?,
        path: row.get(2)?,
        category: row.get(3)?,
        aliases,
    })
}

fn parse_aliases_json(raw: &str) -> Vec<String> {
    serde_json::from_str::<Vec<String>>(raw).unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::ProjectDb;
    use tempfile::TempDir;

    #[test]
    fn list_active_entities_returns_inserted_rows() {
        let tmp = TempDir::new().unwrap();
        let db = ProjectDb::open(tmp.path()).unwrap();
        let now = 1_i64;

        db.connection()
            .execute(
                "INSERT INTO entities (id, name, path, category, color, aliases, created_at, updated_at, status)
                 VALUES ('e1', 'Hero', 'Worldbuilding/Personajes/Hero.md', 'character', NULL, '[\"El héroe\"]', ?1, ?1, 'active')",
                rusqlite::params![now],
            )
            .unwrap();

        let list = list_active_entities(db.connection()).unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].name, "Hero");
        assert_eq!(list[0].aliases, vec!["El héroe"]);
    }
}
