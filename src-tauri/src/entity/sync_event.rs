//! Sincronización manuscrito ↔ ficha evento WB (§1.10.0, Fase 5.2).

use std::fs;
use std::path::Path;

use crate::commands::entity::ensure_event_entity_file;
use crate::db::ProjectDb;
use crate::entity::{parse_entity_str, refresh_entity_row, serialize_entity};
use crate::error::AppError;
use crate::fs::crud;
use crate::fs::paths::normalize_relative;
use crate::parser::{EventSegment, ManuscriptSegment, ParsedManuscript};

const EVENT_ENTITY_PREFIX: &str = "Worldbuilding/Eventos/";

/// Al guardar manuscrito: asegura fichas, renombra y actualiza `entity` + YAML (no en commit RAM).
pub fn sync_manuscript_event_entities(
    db: &ProjectDb,
    project_root: &Path,
    manuscript_path: &str,
    manuscript: &mut ParsedManuscript,
) -> Result<(), AppError> {
    for segment in &mut manuscript.segments {
        let ManuscriptSegment::Event(event) = segment else {
            continue;
        };
        sync_one_event_segment(db, project_root, manuscript_path, event)?;
    }
    Ok(())
}

fn sync_one_event_segment(
    db: &ProjectDb,
    project_root: &Path,
    manuscript_path: &str,
    event: &mut EventSegment,
) -> Result<(), AppError> {
    let name = event.name.trim();
    if name.is_empty() {
        return Ok(());
    }

    let description = event.description.trim();

    if event.entity_path.trim().is_empty() {
        event.entity_path = ensure_event_entity_file(
            db,
            project_root,
            name,
            description,
            Some(manuscript_path),
        )?;
    }

    if !is_manuscript_event_entity(&event.entity_path) {
        return Ok(());
    }

    let expected_rel = format!("{EVENT_ENTITY_PREFIX}{name}.md");
    let current_rel = normalize_entity_rel(&event.entity_path);

    if !rel_paths_equivalent(&current_rel, &expected_rel) {
        let old_full = entity_full_path(project_root, &current_rel);
        let new_full = entity_full_path(project_root, &expected_rel);

        if same_existing_file(&old_full, &new_full) {
            event.entity_path = expected_rel;
        } else if old_full.is_file() {
            let new_file_name = format!("{name}.md");
            let outcome =
                crud::rename_path(db, project_root, current_rel, new_file_name)?;
            event.entity_path = outcome.new_path;
        } else {
            event.entity_path = ensure_event_entity_file(
                db,
                project_root,
                name,
                description,
                Some(manuscript_path),
            )?;
        }
    } else {
        event.entity_path = expected_rel;
    }

    sync_event_entity_content(
        db,
        project_root,
        &event.entity_path,
        name,
        description,
        manuscript_path,
    )
}

fn normalize_entity_rel(path: &str) -> String {
    normalize_relative(path).unwrap_or_else(|_| path.replace('\\', "/"))
}

fn rel_paths_equivalent(a: &str, b: &str) -> bool {
    normalize_entity_rel(a).eq_ignore_ascii_case(&normalize_entity_rel(b))
}

fn same_existing_file(a: &Path, b: &Path) -> bool {
    if !a.is_file() || !b.is_file() {
        return false;
    }
    match (a.canonicalize(), b.canonicalize()) {
        (Ok(ca), Ok(cb)) => ca == cb,
        _ => false,
    }
}

fn entity_full_path(project_root: &Path, entity_rel: &str) -> std::path::PathBuf {
    project_root.join(entity_rel.replace('/', std::path::MAIN_SEPARATOR_STR))
}

fn sync_event_entity_content(
    db: &ProjectDb,
    project_root: &Path,
    entity_rel: &str,
    title: &str,
    description: &str,
    source_path: &str,
) -> Result<(), AppError> {
    let full = entity_full_path(project_root, entity_rel);
    if !full.is_file() {
        return Ok(());
    }

    let raw = fs::read_to_string(&full).map_err(|e| AppError::database(e.to_string()))?;
    let mut doc = parse_entity_str(entity_rel, &raw, "event");
    if let serde_json::Value::Object(ref mut map) = doc.frontmatter {
        map.insert("title".to_string(), serde_json::Value::String(title.to_string()));
        map.insert(
            "sourcePath".to_string(),
            serde_json::Value::String(source_path.to_string()),
        );
        if description.is_empty() {
            map.remove("description");
        } else {
            map.insert(
                "description".to_string(),
                serde_json::Value::String(description.to_string()),
            );
        }
    }

    let body = if description.is_empty() {
        doc.body
    } else {
        description.to_string()
    };

    let content = serialize_entity(&doc.frontmatter, &body)?;
    write_atomic(&full, content.as_bytes())?;
    refresh_entity_row(db, project_root, entity_rel)?;
    Ok(())
}

fn is_manuscript_event_entity(path: &str) -> bool {
    let normalized = path.replace('\\', "/");
    let lower = normalized.to_lowercase();
    lower.starts_with("worldbuilding/eventos/") && lower.ends_with(".md")
}

fn write_atomic(path: &Path, bytes: &[u8]) -> Result<(), AppError> {
    let parent = path
        .parent()
        .ok_or_else(|| AppError::new("error.fs.invalid_path"))?;
    let temp = parent.join(format!(".narralith-write-{}", std::process::id()));
    fs::write(&temp, bytes).map_err(|e| AppError::database(e.to_string()))?;
    fs::rename(&temp, path).map_err(|e| AppError::database(e.to_string()))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::entity::ensure_event_entity_file;
    use crate::parser::{ManuscriptFileHeader, ManuscriptFormat, ParsedManuscript};
    use tempfile::TempDir;

    fn open_test_root(tmp: &TempDir) -> (ProjectDb, std::path::PathBuf) {
        let root = tmp.path().canonicalize().unwrap();
        let eventos = root.join("Worldbuilding").join("Eventos");
        fs::create_dir_all(&eventos).unwrap();
        (ProjectDb::open(&root).unwrap(), root)
    }

    #[test]
    fn sync_accepts_entity_path_with_backslashes_when_same_file() {
        let tmp = TempDir::new().unwrap();
        let (db, root) = open_test_root(&tmp);
        let manuscript_path = "Manuscrito/Cap1.md";

        let entity_path =
            ensure_event_entity_file(&db, &root, "meowo", "desc", Some(manuscript_path))
                .unwrap();

        let mut manuscript = ParsedManuscript {
            file_path: manuscript_path.into(),
            format: ManuscriptFormat::EventSegments,
            file_header: ManuscriptFileHeader {
                title: "Cap1".to_string(),
                body: "prosa".to_string(),
            },
            segments: vec![ManuscriptSegment::Event(EventSegment::new(
                manuscript_path,
                0,
                "meowo",
                "desc",
                entity_path.replace('/', "\\"),
                String::new(),
                false,
            ))],
        };

        sync_manuscript_event_entities(&db, &root, manuscript_path, &mut manuscript).unwrap();

        let ManuscriptSegment::Event(event) = &manuscript.segments[0] else {
            panic!("expected event");
        };
        assert_eq!(event.entity_path, "Worldbuilding/Eventos/meowo.md");
    }

    #[test]
    fn sync_renames_entity_when_event_name_changes() {
        let tmp = TempDir::new().unwrap();
        let (db, root) = open_test_root(&tmp);
        let manuscript_path = "Manuscrito/Cap1.md";

        let entity_path =
            ensure_event_entity_file(&db, &root, "Antiguo", "desc", Some(manuscript_path))
                .unwrap();

        let mut manuscript = ParsedManuscript {
            file_path: manuscript_path.into(),
            format: ManuscriptFormat::EventSegments,
            file_header: ManuscriptFileHeader {
                title: "Cap1".to_string(),
                body: String::new(),
            },
            segments: vec![ManuscriptSegment::Event(EventSegment::new(
                manuscript_path,
                0,
                "Nuevo nombre",
                "nueva desc",
                entity_path,
                "prosa",
                false,
            ))],
        };

        sync_manuscript_event_entities(&db, &root, manuscript_path, &mut manuscript).unwrap();

        assert_eq!(
            manuscript.segments[0].segment_index(),
            0
        );
        let ManuscriptSegment::Event(event) = &manuscript.segments[0] else {
            panic!("expected event");
        };
        assert_eq!(
            event.entity_path,
            "Worldbuilding/Eventos/Nuevo nombre.md"
        );
        let full = root.join("Worldbuilding").join("Eventos").join("Nuevo nombre.md");
        assert!(full.is_file());
    }
}
