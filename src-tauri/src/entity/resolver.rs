//! Resolución de nombres de entidad → ruta relativa (wiki-links, grafo, backlinks).

use std::collections::HashMap;
use std::path::Path;

use rusqlite::Connection;

use crate::db::entities::list_active_entities;
use crate::error::AppError;

/// Mapa de nombres, alias, stems y rutas → entidad activa.
pub struct EntityResolver {
    path_to_id: HashMap<String, String>,
    name_to_path: HashMap<String, String>,
}

impl EntityResolver {
    pub fn from_conn(conn: &Connection) -> Result<Self, AppError> {
        let mut path_to_id = HashMap::new();
        let mut name_to_path = HashMap::new();

        for entity in list_active_entities(conn)? {
            path_to_id.insert(entity.path.clone(), entity.id.clone());
            register_lookup(&mut name_to_path, entity.name.trim().to_lowercase(), &entity.path);
            for alias in &entity.aliases {
                register_lookup(
                    &mut name_to_path,
                    alias.trim().to_lowercase(),
                    &entity.path,
                );
            }
            register_lookup(&mut name_to_path, entity.path.to_lowercase(), &entity.path);
            if let Some(stem) = path_stem(&entity.path) {
                register_lookup(&mut name_to_path, stem.to_lowercase(), &entity.path);
            }
        }

        Ok(Self {
            path_to_id,
            name_to_path,
        })
    }

    pub fn id_for_path(&self, path: &str) -> Option<String> {
        self.path_to_id.get(path).cloned()
    }

    /// Resuelve `[[target]]`, alias, stem o ruta relativa a path de entidad.
    pub fn resolve_name(&self, raw: &str) -> Option<String> {
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            return None;
        }
        let lower = trimmed.to_lowercase();
        if let Some(path) = self.name_to_path.get(&lower) {
            return Some(path.clone());
        }
        if self.path_to_id.contains_key(trimmed) {
            return Some(trimmed.to_string());
        }
        None
    }
}

fn path_stem(path: &str) -> Option<&str> {
    Path::new(path)
        .file_stem()
        .and_then(|s| s.to_str())
}

/// §1.10.2 — prioridad `Worldbuilding/Eventos/` sobre homónimos en `Manuscrito/`.
fn register_lookup(map: &mut HashMap<String, String>, key: String, path: &str) {
    if let Some(existing) = map.get(&key) {
        if should_prefer_path(path, existing) {
            map.insert(key, path.to_string());
        }
        return;
    }
    map.insert(key, path.to_string());
}

fn should_prefer_path(candidate: &str, current: &str) -> bool {
    let cand = candidate.replace('\\', "/").to_lowercase();
    let cur = current.replace('\\', "/").to_lowercase();
    let cand_event = cand.starts_with("worldbuilding/eventos/");
    let cur_manuscript = cur.starts_with("manuscrito/");
    if cand_event && cur_manuscript {
        return true;
    }
    let cur_event = cur.starts_with("worldbuilding/eventos/");
    let cand_manuscript = cand.starts_with("manuscrito/");
    if cur_event && cand_manuscript {
        return false;
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::ProjectDb;
    use tempfile::TempDir;

    #[test]
    fn resolves_name_alias_and_stem() {
        let tmp = TempDir::new().unwrap();
        let db = ProjectDb::open(tmp.path()).unwrap();
        let now = 1_i64;
        db.connection()
            .execute(
                "INSERT INTO entities (id, name, path, category, color, aliases, metadata, created_at, updated_at, status)
                 VALUES ('e1', 'Hero', 'Worldbuilding/Personajes/Hero.md', 'character', NULL, '[\"Apodo\"]', '{}', ?1, ?1, 'active'),
                        ('e2', 'escena 2', 'Manuscrito/Volumen 1/Capitulo 1/escena 2.md', 'manuscript', NULL, '[]', '{}', ?1, ?1, 'active')",
                rusqlite::params![now],
            )
            .unwrap();

        let resolver = EntityResolver::from_conn(db.connection()).unwrap();
        assert_eq!(
            resolver.resolve_name("Hero"),
            Some("Worldbuilding/Personajes/Hero.md".to_string())
        );
        assert_eq!(
            resolver.resolve_name("Apodo"),
            Some("Worldbuilding/Personajes/Hero.md".to_string())
        );
        assert_eq!(
            resolver.resolve_name("escena 2"),
            Some("Manuscrito/Volumen 1/Capitulo 1/escena 2.md".to_string())
        );
    }

    #[test]
    fn prefers_worldbuilding_event_over_manuscript_homonym() {
        let tmp = TempDir::new().unwrap();
        let db = ProjectDb::open(tmp.path()).unwrap();
        let now = 1_i64;
        db.connection()
            .execute(
                "INSERT INTO entities (id, name, path, category, color, aliases, metadata, created_at, updated_at, status)
                 VALUES
                 ('m1', 'Escena 1', 'Manuscrito/Cap1/Escena 1.md', 'manuscript', NULL, '[]', '{}', ?1, ?1, 'active'),
                 ('e1', 'Escena 1', 'Worldbuilding/Eventos/Escena 1.md', 'event', NULL, '[]', '{}', ?1, ?1, 'active')",
                rusqlite::params![now],
            )
            .unwrap();

        let resolver = EntityResolver::from_conn(db.connection()).unwrap();
        assert_eq!(
            resolver.resolve_name("Escena 1"),
            Some("Worldbuilding/Eventos/Escena 1.md".to_string())
        );
    }
}
