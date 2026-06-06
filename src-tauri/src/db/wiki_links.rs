//! Persistencia de `wiki_links` y `backlinks` (Fase 3.2).

use rusqlite::Connection;

use crate::db::ProjectDb;
use crate::entity::EntityResolver;
use crate::error::AppError;
use crate::wikilink::scan_wiki_links;

fn snippet_around(body: &str, start: usize, end: usize) -> String {
    let len = body.len();
    let from = start.saturating_sub(40);
    let to = (end + 40).min(len);
    body[from..to].replace('\n', " ")
}

fn resolve_target_path(conn: &Connection, target_name: &str) -> Option<String> {
    EntityResolver::from_conn(conn)
        .ok()
        .and_then(|r| r.resolve_name(target_name))
}

/// Actualiza `target_path` en enlaces creados antes de que existiera la entidad destino.
pub fn refresh_unresolved_wiki_link_targets(db: &ProjectDb) -> Result<(), AppError> {
    let conn = db.connection();
    let resolver = EntityResolver::from_conn(conn)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, target_name FROM wiki_links
             WHERE target_path IS NULL OR target_path = ''",
        )
        .map_err(|e| AppError::database(e.to_string()))?;

    let rows: Vec<(String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| AppError::database(e.to_string()))?
        .filter_map(|r| r.ok())
        .collect();

    for (id, target_name) in rows {
        if let Some(path) = resolver.resolve_name(&target_name) {
            conn.execute(
                "UPDATE wiki_links SET target_path = ?1 WHERE id = ?2",
                rusqlite::params![path, id],
            )
            .map_err(|e| AppError::database(e.to_string()))?;
        }
    }
    Ok(())
}

fn delete_links_for_source(conn: &Connection, source_path: &str) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM backlinks WHERE source_path = ?1",
        [source_path],
    )
    .map_err(|e| AppError::database(e.to_string()))?;
    conn.execute(
        "DELETE FROM wiki_links WHERE source_path = ?1",
        [source_path],
    )
    .map_err(|e| AppError::database(e.to_string()))?;
    Ok(())
}

/// Reindexa wiki-links y backlinks de un archivo a partir de los cuerpos de sus bloques.
pub fn sync_wiki_links_for_file(
    db: &ProjectDb,
    source_path: &str,
    blocks: &[(i32, String)],
) -> Result<(), AppError> {
    let conn = db.connection();
    delete_links_for_source(conn, source_path)?;

    for (block_index, body) in blocks {
        for link in scan_wiki_links(body) {
            let target_path = resolve_target_path(conn, &link.target_name);
            let link_id = format!("wl_{:x}", {
                use std::collections::hash_map::DefaultHasher;
                use std::hash::{Hash, Hasher};
                let mut h = DefaultHasher::new();
                source_path.hash(&mut h);
                block_index.hash(&mut h);
                link.start.hash(&mut h);
                link.end.hash(&mut h);
                h.finish()
            });

            conn.execute(
                "INSERT INTO wiki_links (id, source_path, target_name, target_path, alias, block_index)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                rusqlite::params![
                    link_id,
                    source_path,
                    link.target_name,
                    target_path,
                    link.alias,
                    block_index,
                ],
            )
            .map_err(|e| AppError::database(e.to_string()))?;

            if let Some(entity_path) = target_path {
                let snippet = snippet_around(body, link.start, link.end);
                let back_id = format!("bl_{link_id}");
                conn.execute(
                    "INSERT INTO backlinks (id, entity_path, source_path, block_index, snippet)
                     VALUES (?1, ?2, ?3, ?4, ?5)",
                    rusqlite::params![back_id, entity_path, source_path, block_index, snippet],
                )
                .map_err(|e| AppError::database(e.to_string()))?;
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::ProjectDb;
    use tempfile::TempDir;

    #[test]
    fn sync_twice_is_idempotent() {
        let tmp = TempDir::new().unwrap();
        let db = ProjectDb::open(tmp.path()).unwrap();
        let now = 1_i64;

        db.connection()
            .execute(
                "INSERT INTO entities (id, name, path, category, color, aliases, created_at, updated_at, status)
                 VALUES ('e1', 'Hero', 'Worldbuilding/Personajes/Hero.md', 'character', NULL, '[]', ?1, ?1, 'active')",
                rusqlite::params![now],
            )
            .unwrap();

        let blocks = vec![
            (0, "Text [[Hero]] here.".to_string()),
            (1, "Other [[Villain]].".to_string()),
        ];

        sync_wiki_links_for_file(&db, "Manuscrito/A.md", &blocks).unwrap();
        let count1: i64 = db
            .connection()
            .query_row("SELECT COUNT(*) FROM wiki_links", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count1, 2);

        sync_wiki_links_for_file(&db, "Manuscrito/A.md", &blocks).unwrap();
        let count2: i64 = db
            .connection()
            .query_row("SELECT COUNT(*) FROM wiki_links", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count2, 2);

        let resolved: i64 = db
            .connection()
            .query_row(
                "SELECT COUNT(*) FROM wiki_links WHERE target_path IS NOT NULL",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(resolved, 1);
    }

    #[test]
    fn sync_indexes_wikilink_in_event_block_body() {
        let tmp = TempDir::new().unwrap();
        let db = ProjectDb::open(tmp.path()).unwrap();
        let now = 1_i64;

        db.connection()
            .execute(
                "INSERT INTO entities (id, name, path, category, color, aliases, created_at, updated_at, status)
                 VALUES ('e1', 'Hero', 'Worldbuilding/Personajes/Hero.md', 'character', NULL, '[]', ?1, ?1, 'active')",
                rusqlite::params![now],
            )
            .unwrap();

        let blocks = vec![(1, "En el evento [[Hero]] aparece.".to_string())];
        sync_wiki_links_for_file(&db, "Manuscrito/Escena.md", &blocks).unwrap();

        let (block_index, target): (i32, String) = db
            .connection()
            .query_row(
                "SELECT block_index, target_name FROM wiki_links WHERE source_path = 'Manuscrito/Escena.md'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!(block_index, 1);
        assert_eq!(target, "Hero");
    }
}
