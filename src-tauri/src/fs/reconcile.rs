//! Reconciliación FS → SQLite (el archivo en disco gana).

use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::db::blocks;
use crate::db::ProjectDb;
use crate::error::AppError;
use crate::fs::entity_aliases::{aliases_to_json, read_aliases_from_markdown};
use crate::fs::indexer::{self, infer_category};
use crate::parser::parse_full_path_and_persist;
use crate::refactor::refactor_wikilinks_if_stem_changed;

const SKIP_DIRS: &[&str] = &[".git", ".narralith", "node_modules"];

/// Evento emitido al frontend tras reconciliar cambios externos.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FsChangeEvent {
    pub kind: String,
    pub paths: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from_path: Option<String>,
}

/// Cambio normalizado del watcher.
#[derive(Debug, Clone)]
pub enum FsChange {
    Create(PathBuf),
    Modify(PathBuf),
    Remove(PathBuf),
    Rename { from: PathBuf, to: PathBuf },
}

/// Barrido completo al abrir proyecto: indexa `.md`, sincroniza `blocks` y marca fantasmas.
pub fn full_resync(db: &ProjectDb, project_root: &Path) -> Result<(), AppError> {
    indexer::index_markdown_files(db, project_root)?;
    resync_all_blocks(db, project_root)?;
    mark_missing_as_ghosts(db, project_root)?;
    Ok(())
}

/// Re-parsea todos los `.md` con el gate A23 (`parse_document_str` vía `parse_full_path_and_persist`).
fn resync_all_blocks(db: &ProjectDb, project_root: &Path) -> Result<(), AppError> {
    for rel in list_md_relative_paths(project_root)? {
        let full = project_root.join(&rel);
        if full.is_file() {
            let _ = parse_full_path_and_persist(db, project_root, &full);
        }
    }
    Ok(())
}

pub fn apply_changes(
    app: &AppHandle,
    db: &ProjectDb,
    project_root: &Path,
    changes: Vec<FsChange>,
) -> Result<(), AppError> {
    if changes.is_empty() {
        return Ok(());
    }

    let mut upsert_paths: Vec<String> = Vec::new();
    let mut remove_paths: Vec<String> = Vec::new();
    let mut rename_from: Option<String> = None;
    let mut rename_to: Option<String> = None;

    for change in changes {
        match change {
            FsChange::Create(path) | FsChange::Modify(path) => {
                if should_ignore(&path) {
                    continue;
                }
                if path.extension().and_then(|e| e.to_str()) == Some("md") {
                    upsert_file(db, project_root, &path)?;
                    let _ = parse_full_path_and_persist(db, project_root, &path);
                    let rel = relative_path(project_root, &path)?;
                    if !upsert_paths.contains(&rel) {
                        upsert_paths.push(rel);
                    }
                }
            }
            FsChange::Remove(path) => {
                if should_ignore(&path) {
                    continue;
                }
                let rel = relative_path(project_root, &path)?;
                let full = project_root.join(&rel);
                if full.exists() {
                    continue;
                }
                mark_ghost(db, &rel)?;
                mark_ghost_prefix(db, &rel)?;
                #[cfg(debug_assertions)]
                crate::audit::bridge::log_ghost(app, &rel, "watcher-remove");
                let _ = blocks::delete_blocks_under_path(db, &rel);
                if !remove_paths.contains(&rel) {
                    remove_paths.push(rel);
                }
            }
            FsChange::Rename { from, to } => {
                if should_ignore(&from) || should_ignore(&to) {
                    continue;
                }
                let from_rel = relative_path(project_root, &from)?;
                let to_rel = relative_path(project_root, &to)?;
                rename_paths(db, &from_rel, &to_rel)?;
                let _ = blocks::rename_blocks_after_move(db, &from_rel, &to_rel);
                if let Ok(refactored) =
                    refactor_wikilinks_if_stem_changed(db, project_root, &from_rel, &to_rel)
                {
                    for path in refactored {
                        if !upsert_paths.contains(&path) {
                            upsert_paths.push(path);
                        }
                    }
                }
                if to_rel.ends_with(".md") {
                    let _ = parse_full_path_and_persist(db, project_root, &to);
                } else if from_rel.ends_with(".md") {
                    let _ = blocks::delete_blocks_under_path(db, &from_rel);
                }
                rename_from = Some(from_rel);
                rename_to = Some(to_rel);
            }
        }
    }

    let mut emitted = false;

    if !upsert_paths.is_empty() {
        emit_fs_changed(app, "create", upsert_paths, None)?;
        emitted = true;
    }

    if !remove_paths.is_empty() {
        emit_fs_changed(app, "remove", remove_paths, None)?;
        emitted = true;
    }

    if let (Some(from_rel), Some(to_rel)) = (rename_from, rename_to) {
        emit_fs_changed(app, "rename", vec![to_rel], Some(from_rel))?;
        emitted = true;
    }

    if emitted {
        let state = app.state::<crate::state::ProjectState>();
        state.request_consistency_check(app, project_root);
    }

    Ok(())
}

/// Indexa o actualiza una entidad tras crear/modificar un `.md`.
pub fn upsert_file(db: &ProjectDb, project_root: &Path, full_path: &Path) -> Result<(), AppError> {
    let relative = relative_path(project_root, full_path)?;
    let entity_name = full_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Untitled")
        .to_string();
    let category = infer_category(&relative);
    let entity_id = indexer::entity_id_for_path(&relative);
    let now = unix_ms_now();
    let aliases_json = aliases_to_json(&read_aliases_from_markdown(full_path));

    db.connection()
        .execute(
            "INSERT INTO entities (id, name, path, category, color, aliases, metadata, created_at, updated_at, status)
             VALUES (?1, ?2, ?3, ?4, NULL, ?5, '{}', ?6, ?6, 'active')
             ON CONFLICT(path) DO UPDATE SET
               name = excluded.name,
               category = excluded.category,
               aliases = excluded.aliases,
               updated_at = excluded.updated_at,
               status = 'active'",
            rusqlite::params![entity_id, entity_name, relative, category, aliases_json, now],
        )
        .map_err(|e| AppError::database(e.to_string()))?;

    if crate::entity::is_entity_relative_path(&relative) {
        let _ = crate::entity::refresh_entity_row(db, project_root, &relative);
    }

    if relative.ends_with(".md") {
        let full = project_root.join(&relative);
        if full.is_file() {
            let _ = parse_full_path_and_persist(db, project_root, &full);
        }
    }

    Ok(())
}

/// Marca como fantasma la ruta eliminada y sus hijos en SQLite.
pub fn mark_path_removed(db: &ProjectDb, relative: &str) -> Result<(), AppError> {
    mark_ghost(db, relative)?;
    mark_ghost_prefix(db, relative)
}

fn mark_ghost_prefix(db: &ProjectDb, relative_prefix: &str) -> Result<(), AppError> {
    let prefix = format!("{}/%", relative_prefix.trim_end_matches('/'));
    let now = unix_ms_now();
    db.connection()
        .execute(
            "UPDATE entities SET status = 'ghost', updated_at = ?1 WHERE path LIKE ?2 ESCAPE '\\'",
            rusqlite::params![now, prefix],
        )
        .map_err(|e| AppError::database(e.to_string()))?;
    Ok(())
}

fn mark_ghost(db: &ProjectDb, relative: &str) -> Result<(), AppError> {
    db.connection()
        .execute(
            "UPDATE entities SET status = 'ghost', updated_at = ?1 WHERE path = ?2",
            rusqlite::params![unix_ms_now(), relative],
        )
        .map_err(|e| AppError::database(e.to_string()))?;
    Ok(())
}

/// Actualiza rutas en SQLite tras renombrar o mover en disco.
pub fn rename_paths(db: &ProjectDb, from_rel: &str, to_rel: &str) -> Result<(), AppError> {
    let conn = db.connection();
    let now = unix_ms_now();

    if from_rel == to_rel {
        return Ok(());
    }

    conn.execute(
        "UPDATE entities SET path = ?1, updated_at = ?2 WHERE path = ?3",
        rusqlite::params![to_rel, now, from_rel],
    )
    .map_err(|e| AppError::database(e.to_string()))?;

    let from_prefix = format!("{}/", from_rel.trim_end_matches('/'));
    let to_prefix = format!("{}/", to_rel.trim_end_matches('/'));

    let rows: Vec<String> = conn
        .prepare("SELECT path FROM entities WHERE path LIKE ?1 ESCAPE '\\'")
        .map_err(|e| AppError::database(e.to_string()))?
        .query_map([format!("{}%", from_prefix)], |row| row.get(0))
        .map_err(|e| AppError::database(e.to_string()))?
        .filter_map(|r| r.ok())
        .collect();

    for old_path in rows {
        if let Some(suffix) = old_path.strip_prefix(&from_prefix) {
            let new_path = format!("{}{}", to_prefix, suffix);
            conn.execute(
                "UPDATE entities SET path = ?1, updated_at = ?2 WHERE path = ?3",
                rusqlite::params![new_path, now, old_path],
            )
            .map_err(|e| AppError::database(e.to_string()))?;
        }
    }

    conn.execute(
        "UPDATE wiki_links SET source_path = ?1 WHERE source_path = ?2",
        rusqlite::params![to_rel, from_rel],
    )
    .map_err(|e| AppError::database(e.to_string()))?;

    conn.execute(
        "UPDATE wiki_links SET source_path = REPLACE(source_path, ?1, ?2)
         WHERE source_path LIKE ?3",
        rusqlite::params![from_prefix, to_prefix, format!("{}%", from_prefix)],
    )
    .map_err(|e| AppError::database(e.to_string()))?;

    conn.execute(
        "UPDATE wiki_links SET target_path = ?1 WHERE target_path = ?2",
        rusqlite::params![to_rel, from_rel],
    )
    .map_err(|e| AppError::database(e.to_string()))?;

    conn.execute(
        "UPDATE wiki_links SET target_path = REPLACE(target_path, ?1, ?2)
         WHERE target_path LIKE ?3",
        rusqlite::params![from_prefix, to_prefix, format!("{}%", from_prefix)],
    )
    .map_err(|e| AppError::database(e.to_string()))?;

    conn.execute(
        "UPDATE backlinks SET entity_path = ?1 WHERE entity_path = ?2",
        rusqlite::params![to_rel, from_rel],
    )
    .map_err(|e| AppError::database(e.to_string()))?;

    conn.execute(
        "UPDATE backlinks SET entity_path = REPLACE(entity_path, ?1, ?2)
         WHERE entity_path LIKE ?3",
        rusqlite::params![from_prefix, to_prefix, format!("{}%", from_prefix)],
    )
    .map_err(|e| AppError::database(e.to_string()))?;

    Ok(())
}

fn mark_missing_as_ghosts(db: &ProjectDb, project_root: &Path) -> Result<(), AppError> {
    let mut on_disk = HashSet::new();
    collect_md_paths(project_root, project_root, &mut on_disk)?;

    let conn = db.connection();
    let mut stmt = conn
        .prepare("SELECT path FROM entities WHERE status = 'active'")
        .map_err(|e| AppError::database(e.to_string()))?;

    let rows = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| AppError::database(e.to_string()))?;

    let now = unix_ms_now();
    for row in rows {
        let path = row.map_err(|e| AppError::database(e.to_string()))?;
        if !on_disk.contains(&path) {
            conn.execute(
                "UPDATE entities SET status = 'ghost', updated_at = ?1 WHERE path = ?2",
                rusqlite::params![now, path],
            )
            .map_err(|e| AppError::database(e.to_string()))?;
        }
    }

    Ok(())
}

/// Rutas relativas de todos los `.md` indexables del proyecto (orden estable).
pub fn list_md_relative_paths(project_root: &Path) -> Result<Vec<String>, AppError> {
    let mut set = HashSet::new();
    collect_md_paths(project_root, project_root, &mut set)?;
    let mut paths: Vec<String> = set.into_iter().collect();
    paths.sort();
    Ok(paths)
}

fn collect_md_paths(
    project_root: &Path,
    dir: &Path,
    out: &mut HashSet<String>,
) -> Result<(), AppError> {
    let entries = fs::read_dir(dir).map_err(|e| AppError::database(e.to_string()))?;
    for entry in entries {
        let entry = entry.map_err(|e| AppError::database(e.to_string()))?;
        let path = entry.path();
        let name = entry.file_name();
        let name_str = name.to_string_lossy();

        if path.is_dir() {
            if SKIP_DIRS.contains(&name_str.as_ref()) {
                continue;
            }
            collect_md_paths(project_root, &path, out)?;
            continue;
        }

        if path.extension().and_then(|e| e.to_str()) == Some("md") && !name_str.starts_with('.') {
            if let Ok(rel) = relative_path(project_root, &path) {
                out.insert(rel);
            }
        }
    }
    Ok(())
}

pub fn should_ignore(path: &Path) -> bool {
    if path
        .file_name()
        .and_then(|s| s.to_str())
        .is_some_and(|name| name.starts_with(".narralith-write-"))
    {
        return true;
    }

    path.components().any(|c| {
        if let std::path::Component::Normal(seg) = c {
            let s = seg.to_string_lossy();
            return SKIP_DIRS.iter().any(|skip| *skip == s.as_ref());
        }
        false
    })
}

fn relative_path(project_root: &Path, full_path: &Path) -> Result<String, AppError> {
    full_path
        .strip_prefix(project_root)
        .map(|p| p.to_string_lossy().replace('\\', "/"))
        .map_err(|e| AppError::database(e.to_string()))
}

/// Notifica al frontend tras operaciones CRUD que no pasan por el watcher.
pub fn emit_fs_changed(
    app: &AppHandle,
    kind: &str,
    paths: Vec<String>,
    from_path: Option<String>,
) -> Result<(), AppError> {
    let payload = FsChangeEvent {
        kind: kind.to_string(),
        paths: paths.clone(),
        from_path: from_path.clone(),
    };
    #[cfg(debug_assertions)]
    crate::audit::bridge::log_fs_changed(app, kind, &paths, &from_path);
    app.emit("fs-changed", payload)
        .map_err(|e| AppError::database(e.to_string()))
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::TempDir;

    use super::*;
    use crate::db::ProjectDb;

    fn count_blocks_at(db: &ProjectDb, file_path: &str) -> i64 {
        db.connection()
            .query_row(
                "SELECT COUNT(*) FROM blocks WHERE file_path = ?1",
                [file_path],
                |row| row.get(0),
            )
            .unwrap()
    }

    #[test]
    fn should_ignore_atomic_write_temp() {
        let path = Path::new("Worldbuilding/Eventos/.narralith-write-12345");
        assert!(should_ignore(path));
    }

    #[test]
    fn full_resync_indexes_worldbuilding_as_single_legacy_block() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        fs::create_dir_all(root.join("Worldbuilding/Eventos")).unwrap();
        let rel = "Worldbuilding/Eventos/Ficha.md";
        let raw = "---\ntitle: Ficha\n---\nintro\n\n\
                   +++event\n---\nevent: x\n---\ncuerpo\n+++end-event\n";
        fs::write(root.join(rel), raw).unwrap();

        let db = ProjectDb::open(root).unwrap();
        full_resync(&db, root).unwrap();

        assert_eq!(count_blocks_at(&db, rel), 1);
    }
}

fn unix_ms_now() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
