//! Renombrado global de referencias `[[Nombre]]` al cambiar el stem de una entidad `.md`.

use std::fs;
use std::path::{Path, PathBuf};

use rayon::prelude::*;

use crate::db::ProjectDb;
use crate::error::AppError;
use crate::fs::reconcile;
use crate::parser::parse_full_path_and_persist;
use crate::wikilink::replace_entity_target_in_text;

#[derive(Debug, Clone)]
struct PendingWrite {
    rel: String,
    original: String,
    new_content: String,
}

/// Si el rename de un `.md` cambia el stem, dispara sustitución global de wiki-links.
pub fn refactor_wikilinks_if_stem_changed(
    db: &ProjectDb,
    project_root: &Path,
    from_rel: &str,
    to_rel: &str,
) -> Result<Vec<String>, AppError> {
    match (entity_stem_from_rel(from_rel), entity_stem_from_rel(to_rel)) {
        (Some(old_name), Some(new_name)) if old_name != new_name => {
            replace_wikilinks_for_entity_name(db, project_root, &old_name, &new_name)
        }
        _ => Ok(Vec::new()),
    }
}

fn entity_stem_from_rel(relative: &str) -> Option<String> {
    if !relative.to_lowercase().ends_with(".md") {
        return None;
    }
    std::path::Path::new(relative)
        .file_stem()
        .and_then(|s| s.to_str())
        .map(str::to_string)
}

/// Sustituye `[[old_name]]` / `[[old_name|alias]]` en todos los `.md` del proyecto.
/// Escritura atómica por archivo; rollback si falla una escritura.
pub fn replace_wikilinks_for_entity_name(
    db: &ProjectDb,
    project_root: &Path,
    old_name: &str,
    new_name: &str,
) -> Result<Vec<String>, AppError> {
    if old_name == new_name {
        return Ok(Vec::new());
    }

    let files = reconcile::list_md_relative_paths(project_root)?;

    let pending: Vec<PendingWrite> = files
        .par_iter()
        .map(|rel| {
            let full = project_root.join(rel);
            let original =
                fs::read_to_string(&full).map_err(|e| AppError::database(e.to_string()))?;
            Ok(replace_entity_target_in_text(&original, old_name, new_name).map(|new_content| {
                PendingWrite {
                    rel: rel.clone(),
                    original,
                    new_content,
                }
            }))
        })
        .collect::<Result<Vec<_>, AppError>>()?
        .into_iter()
        .flatten()
        .collect();

    if pending.is_empty() {
        return Ok(Vec::new());
    }

    let mut modified = Vec::with_capacity(pending.len());
    for (index, item) in pending.iter().enumerate() {
        let full = project_root.join(&item.rel);
        if let Err(err) = atomic_write(&full, &item.new_content) {
            rollback_writes(project_root, &pending[..index]);
            return Err(err);
        }
        modified.push(item.rel.clone());
    }

    if let Err(err) = update_wiki_link_target_names(db, old_name, new_name) {
        rollback_writes(project_root, &pending);
        return Err(err);
    }

    for rel in &modified {
        let full = project_root.join(rel);
        if let Err(err) = parse_full_path_and_persist(db, project_root, &full) {
            rollback_writes(project_root, &pending);
            return Err(err);
        }
    }

    Ok(modified)
}

fn update_wiki_link_target_names(
    db: &ProjectDb,
    old_name: &str,
    new_name: &str,
) -> Result<(), AppError> {
    db.connection()
        .execute(
            "UPDATE wiki_links SET target_name = ?1 WHERE target_name = ?2",
            rusqlite::params![new_name, old_name],
        )
        .map_err(|e| AppError::database(e.to_string()))?;
    Ok(())
}

fn rollback_writes(project_root: &Path, items: &[PendingWrite]) {
    for item in items {
        let full = project_root.join(&item.rel);
        let _ = fs::write(&full, &item.original);
    }
}

fn atomic_write(path: &Path, content: &str) -> Result<(), AppError> {
    let parent = path
        .parent()
        .ok_or_else(|| AppError::new("error.refactor.invalid_path"))?;
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| AppError::new("error.refactor.invalid_path"))?;
    let temp: PathBuf = parent.join(format!(".{file_name}.narralith-tmp"));

    fs::write(&temp, content.as_bytes()).map_err(|e| AppError::database(e.to_string()))?;
    fs::rename(&temp, path).map_err(|e| {
        let _ = fs::remove_file(&temp);
        AppError::database(e.to_string())
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::ProjectDb;
    use tempfile::TempDir;

    fn write_md(dir: &Path, rel: &str, body: &str) {
        let full = dir.join(rel);
        if let Some(parent) = full.parent() {
            fs::create_dir_all(parent).unwrap();
        }
        fs::write(full, body).unwrap();
    }

    #[test]
    fn preserves_event_markers_when_renaming_wikilinks_in_manuscript() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        write_md(root, "Worldbuilding/Personajes/Hero.md", "---\n---\n\n");
        write_md(
            root,
            "Manuscrito/Escena.md",
            "---\ntitle: Escena\n---\n\n\
             +++event\n---\nevent: ev\nentity: Worldbuilding/Eventos/ev.md\n---\n\
             Ve [[Hero]] y [[Hero|valiente]]\n+++end-event\n",
        );

        let db = ProjectDb::open(root).unwrap();
        let modified =
            replace_wikilinks_for_entity_name(&db, root, "Hero", "Rey").unwrap();
        assert_eq!(modified, vec!["Manuscrito/Escena.md"]);

        let saved = fs::read_to_string(root.join("Manuscrito/Escena.md")).unwrap();
        assert!(saved.contains("+++event"));
        assert!(saved.contains("+++end-event"));
        assert!(saved.contains("[[Rey]]"));
        assert!(saved.contains("[[Rey|valiente]]"));
        assert!(!saved.contains("[[Hero"));
    }

    #[test]
    fn updates_three_files_on_entity_rename() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        write_md(root, "Worldbuilding/Personajes/Hero.md", "---\n---\n\n");
        write_md(root, "Manuscrito/A.md", "Ve [[Hero]] aquí.\n");
        write_md(root, "Manuscrito/B.md", "Otro [[Hero|valiente]].\n");
        write_md(root, "Manuscrito/C.md", "Sin links.\n");

        let db = ProjectDb::open(root).unwrap();
        let modified =
            replace_wikilinks_for_entity_name(&db, root, "Hero", "Rey").unwrap();
        assert_eq!(modified.len(), 2);

        let a = fs::read_to_string(root.join("Manuscrito/A.md")).unwrap();
        assert!(a.contains("[[Rey]]"));
        let b = fs::read_to_string(root.join("Manuscrito/B.md")).unwrap();
        assert!(b.contains("[[Rey|valiente]]"));
    }
}
