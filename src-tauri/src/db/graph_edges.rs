//! Persistencia de `graph_edges` (Fase 8).

use rusqlite::Connection;

use crate::error::AppError;

pub fn clear_graph_edges(conn: &Connection) -> Result<(), AppError> {
    conn.execute("DELETE FROM graph_edges", [])
        .map_err(|e| AppError::database(e.to_string()))?;
    Ok(())
}

pub fn insert_graph_edge(
    conn: &Connection,
    id: &str,
    source_id: &str,
    target_id: &str,
    weight: f64,
) -> Result<(), AppError> {
    conn.execute(
        "INSERT OR REPLACE INTO graph_edges (id, source_id, target_id, weight)
         VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![id, source_id, target_id, weight],
    )
    .map_err(|e| AppError::database(e.to_string()))?;
    Ok(())
}

pub fn count_graph_edges(conn: &Connection) -> Result<i64, AppError> {
    conn.query_row("SELECT COUNT(*) FROM graph_edges", [], |row| row.get(0))
        .map_err(|e| AppError::database(e.to_string()))
}
