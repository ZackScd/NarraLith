//! Reconstruye `graph_edges` desde `wiki_links` y relaciones en metadatos de fichas.

use std::collections::{HashMap, HashSet};
use std::path::Path;

use rusqlite::Connection;
use serde_json::Value;

use crate::db::graph_edges::{clear_graph_edges, insert_graph_edge};
use crate::db::wiki_links::refresh_unresolved_wiki_link_targets;
use crate::db::ProjectDb;
use crate::entity::EntityResolver;
use crate::error::AppError;

/// Trunca y repuebla aristas del proyecto.
pub fn rebuild_graph_edges(db: &ProjectDb, _project_root: &Path) -> Result<(), AppError> {
    refresh_unresolved_wiki_link_targets(db)?;

    let conn = db.connection();
    let lookup = EntityResolver::from_conn(conn)?;
    let mut weights: HashMap<(String, String), f64> = HashMap::new();

    collect_wiki_link_edges(conn, &lookup, &mut weights)?;
    collect_metadata_edges(conn, &lookup, &mut weights)?;

    clear_graph_edges(conn)?;
    for ((source_id, target_id), weight) in weights {
        let id = edge_id(&source_id, &target_id);
        insert_graph_edge(conn, &id, &source_id, &target_id, weight)?;
    }
    Ok(())
}

fn collect_wiki_link_edges(
    conn: &Connection,
    lookup: &EntityResolver,
    weights: &mut HashMap<(String, String), f64>,
) -> Result<(), AppError> {
    let mut stmt = conn
        .prepare("SELECT source_path, target_name, target_path FROM wiki_links")
        .map_err(|e| AppError::database(e.to_string()))?;

    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
            ))
        })
        .map_err(|e| AppError::database(e.to_string()))?;

    for row in rows.flatten() {
        let (source_path, target_name, target_path_opt) = row;
        if source_path.is_empty() {
            continue;
        }
        let target_path = target_path_opt
            .filter(|p| !p.is_empty())
            .or_else(|| lookup.resolve_name(&target_name));
        let Some(target_path) = target_path else {
            continue;
        };
        if source_path == target_path {
            continue;
        }
        let Some(source_id) = lookup.id_for_path(&source_path) else {
            continue;
        };
        let Some(target_id) = lookup.id_for_path(&target_path) else {
            continue;
        };
        add_edge(weights, source_id, target_id, 1.0);
    }
    Ok(())
}

fn collect_metadata_edges(
    conn: &Connection,
    lookup: &EntityResolver,
    weights: &mut HashMap<(String, String), f64>,
) -> Result<(), AppError> {
    let mut stmt = conn
        .prepare("SELECT path, metadata FROM entities WHERE status = 'active'")
        .map_err(|e| AppError::database(e.to_string()))?;

    let rows = stmt
        .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
        .map_err(|e| AppError::database(e.to_string()))?;

    for row in rows.flatten() {
        let (source_path, metadata_raw) = row;
        let Some(source_id) = lookup.id_for_path(&source_path) else {
            continue;
        };
        let Some(meta) = parse_metadata(&metadata_raw) else {
            continue;
        };
        let mut refs = HashSet::new();
        collect_metadata_strings(&meta, &mut refs);
        if let Some(source_path) = meta
            .get("sourcePath")
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty())
        {
            if let Some(target_id) = lookup.id_for_path(source_path) {
                if target_id != source_id {
                    add_edge(weights, source_id.clone(), target_id, 0.75);
                }
            }
        }
        for reference in refs {
            let Some(target_path) = lookup.resolve_name(&reference) else {
                continue;
            };
            if target_path == source_path {
                continue;
            }
            let Some(target_id) = lookup.id_for_path(&target_path) else {
                continue;
            };
            add_edge(weights, source_id.clone(), target_id, 1.0);
        }
    }
    Ok(())
}

fn collect_metadata_strings(value: &Value, out: &mut HashSet<String>) {
    match value {
        Value::String(s) => {
            let t = s.trim();
            if !t.is_empty() {
                out.insert(t.to_string());
            }
        }
        Value::Array(arr) => {
            for item in arr {
                collect_metadata_strings(item, out);
            }
        }
        Value::Object(map) => {
            for v in map.values() {
                collect_metadata_strings(v, out);
            }
        }
        _ => {}
    }
}

fn parse_metadata(raw: &str) -> Option<Value> {
    if raw.trim().is_empty() || raw == "{}" {
        return None;
    }
    serde_json::from_str(raw).ok()
}

fn add_edge(weights: &mut HashMap<(String, String), f64>, a: String, b: String, delta: f64) {
    if a == b {
        return;
    }
    let key = ordered_pair(a, b);
    *weights.entry(key).or_insert(0.0) += delta;
}

fn ordered_pair(a: String, b: String) -> (String, String) {
    if a <= b {
        (a, b)
    } else {
        (b, a)
    }
}

fn edge_id(source_id: &str, target_id: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let (a, b) = if source_id <= target_id {
        (source_id, target_id)
    } else {
        (target_id, source_id)
    };
    let mut h = DefaultHasher::new();
    a.hash(&mut h);
    b.hash(&mut h);
    format!("ge_{:016x}", h.finish())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::ProjectDb;
    use tempfile::TempDir;

    fn seed_entities(conn: &Connection) {
        let now = 1_i64;
        for (id, name, path) in [
            ("ent_a", "Alpha", "Worldbuilding/Personajes/Alpha.md"),
            ("ent_b", "Beta", "Worldbuilding/Personajes/Beta.md"),
            ("ent_c", "Gamma", "Worldbuilding/Ubicaciones/Gamma.md"),
            (
                "ent_scene",
                "Escena_1",
                "Manuscrito/Volumen 1/Capitulo 1/Escena_1.md",
            ),
        ] {
            let category = if path.starts_with("Manuscrito/") {
                "manuscript"
            } else if path.contains("Ubicaciones") {
                "location"
            } else {
                "character"
            };
            conn.execute(
                "INSERT INTO entities (id, name, path, category, color, aliases, metadata, created_at, updated_at, status)
                 VALUES (?1, ?2, ?3, ?4, NULL, '[]', '{}', ?5, ?5, 'active')",
                rusqlite::params![id, name, path, category, now],
            )
            .unwrap();
        }
    }

    #[test]
    fn rebuild_creates_edges_from_wiki_links() {
        let tmp = TempDir::new().unwrap();
        let db = ProjectDb::open(tmp.path()).unwrap();
        seed_entities(db.connection());

        db.connection()
            .execute(
                "INSERT INTO wiki_links (id, source_path, target_name, target_path, alias, block_index)
                 VALUES ('wl1', 'Worldbuilding/Personajes/Alpha.md', 'Beta', 'Worldbuilding/Personajes/Beta.md', NULL, 0),
                        ('wl2', 'Worldbuilding/Personajes/Beta.md', 'Gamma', 'Worldbuilding/Ubicaciones/Gamma.md', NULL, 0)",
                [],
            )
            .unwrap();

        rebuild_graph_edges(&db, tmp.path()).unwrap();
        let count = crate::db::graph_edges::count_graph_edges(db.connection()).unwrap();
        assert_eq!(count, 2);
    }

    #[test]
    fn rebuild_creates_edge_from_event_source_path_metadata() {
        let tmp = TempDir::new().unwrap();
        let db = ProjectDb::open(tmp.path()).unwrap();
        let now = 1_i64;
        db.connection()
            .execute(
                "INSERT INTO entities (id, name, path, category, color, aliases, metadata, created_at, updated_at, status)
                 VALUES ('evt1', 'Batalla', 'Worldbuilding/Eventos/Batalla.md', 'event', NULL, '[]',
                         '{\"sourcePath\":\"Manuscrito/Volumen 1/Cap.md\"}', ?1, ?1, 'active'),
                        ('ms1', 'Capítulo', 'Manuscrito/Volumen 1/Cap.md', 'manuscript', NULL, '[]', '{}', ?1, ?1, 'active')",
                [now],
            )
            .unwrap();

        rebuild_graph_edges(&db, tmp.path()).unwrap();
        let count = crate::db::graph_edges::count_graph_edges(db.connection()).unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn rebuild_resolves_manuscript_links_with_null_target_path() {
        let tmp = TempDir::new().unwrap();
        let db = ProjectDb::open(tmp.path()).unwrap();
        seed_entities(db.connection());

        db.connection()
            .execute(
                "INSERT INTO wiki_links (id, source_path, target_name, target_path, alias, block_index)
                 VALUES ('wl_scene', 'Manuscrito/Volumen 1/Capitulo 1/Escena_1.md', 'Alpha', NULL, NULL, 0),
                        ('wl_scene2', 'Manuscrito/Volumen 1/Capitulo 1/Escena_1.md', 'Beta', NULL, NULL, 0)",
                [],
            )
            .unwrap();

        rebuild_graph_edges(&db, tmp.path()).unwrap();
        let count = crate::db::graph_edges::count_graph_edges(db.connection()).unwrap();
        assert_eq!(count, 2);

        let resolved: i64 = db
            .connection()
            .query_row(
                "SELECT COUNT(*) FROM wiki_links WHERE target_path IS NOT NULL",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(resolved, 2);
    }
}
