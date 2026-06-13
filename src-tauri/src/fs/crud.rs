//! Operaciones CRUD del explorador (solo Rust, Fase 1.3).

use std::fs;
use std::path::Path;

use crate::db::blocks;
use crate::db::ProjectDb;
use crate::error::AppError;
use crate::fs::paths::{self, directory_has_entries, resolve_new_child, resolve_under_root, to_relative};
use crate::fs::reconcile::{self, upsert_file};
use crate::parser::{
    ensure_manuscript_title_on_disk, is_manuscript_path, manuscript_initial_file_content,
    parse_file, title_from_stem,
};
use crate::refactor::refactor_wikilinks_if_stem_changed;

const EMPTY_MD_TEMPLATE: &str = "---\n---\n\n";

fn same_path_on_disk(a: &Path, b: &Path) -> bool {
    match (a.canonicalize(), b.canonicalize()) {
        (Ok(ca), Ok(cb)) => ca == cb,
        _ => a == b,
    }
}

fn parent_is_manuscript(parent_path: &str) -> bool {
    let normalized = parent_path.replace('\\', "/");
    normalized == "Manuscrito" || normalized.starts_with("Manuscrito/")
}

/// Resultado de `rename_path` (ruta nueva + archivos cuyo contenido se refactorizó).
pub struct PathRenameOutcome {
    pub new_path: String,
    pub from_path: String,
    pub refactored_paths: Vec<String>,
}

pub fn create_folder(
    _db: &ProjectDb,
    project_root: &Path,
    parent_path: String,
    name: String,
) -> Result<String, AppError> {
    let full = resolve_new_child(project_root, &parent_path, &name)?;
    if full.exists() {
        return Err(AppError::new("error.fs.path_exists"));
    }
    fs::create_dir_all(&full).map_err(|e| AppError::database(e.to_string()))?;
    to_relative(project_root, &full)
}

pub fn create_file(
    db: &ProjectDb,
    project_root: &Path,
    parent_path: String,
    name: String,
) -> Result<String, AppError> {
    let file_name = paths::resolve_new_file_name(&name)?;
    if file_name.to_lowercase().ends_with(".md") {
        let stem = file_name
            .strip_suffix(".md")
            .or_else(|| file_name.strip_suffix(".MD"))
            .unwrap_or(&file_name);
        paths::validate_name(stem)?;
    } else {
        paths::validate_name(&file_name)?;
    }

    let full = resolve_new_child(project_root, &parent_path, &file_name)?;
    if full.exists() {
        return Err(AppError::new("error.fs.path_exists"));
    }
    if let Some(parent) = full.parent() {
        fs::create_dir_all(parent).map_err(|e| AppError::database(e.to_string()))?;
    }

    let rel = to_relative(project_root, &full)?;
    let content = if parent_is_manuscript(&parent_path) {
        let stem = file_name
            .strip_suffix(".md")
            .or_else(|| file_name.strip_suffix(".MD"))
            .unwrap_or(&file_name);
        manuscript_initial_file_content(&title_from_stem(stem))?
    } else {
        EMPTY_MD_TEMPLATE.to_string()
    };

    fs::write(&full, content.as_bytes()).map_err(|e| AppError::database(e.to_string()))?;
    upsert_file(db, project_root, &full)?;
    Ok(rel)
}

pub fn rename_path(
    db: &ProjectDb,
    project_root: &Path,
    path: String,
    new_name: String,
) -> Result<PathRenameOutcome, AppError> {
    let from_full = resolve_under_root(project_root, &path)?;
    if !from_full.exists() {
        return Err(AppError::new("error.fs.not_found"));
    }
    if reconcile::should_ignore(&from_full) {
        return Err(AppError::new("error.fs.invalid_path"));
    }

    let new_name = if from_full.is_file() {
        paths::resolve_new_file_name(&new_name)?
    } else {
        new_name.trim().to_string()
    };

    if from_full.is_file() {
        if new_name.to_lowercase().ends_with(".md") {
            let stem = new_name
                .strip_suffix(".md")
                .or_else(|| new_name.strip_suffix(".MD"))
                .unwrap_or(&new_name);
            paths::validate_name(stem)?;
        } else {
            paths::validate_name(&new_name)?;
        }
    } else {
        paths::validate_name(&new_name)?;
    }

    let parent = from_full
        .parent()
        .ok_or_else(|| AppError::new("error.fs.invalid_path"))?;
    let to_full = parent.join(&new_name);

    let from_rel = to_relative(project_root, &from_full)?;
    let to_rel = to_relative(project_root, &to_full)?;

    if paths::normalize_relative(&from_rel).ok()
        == paths::normalize_relative(&to_rel).ok()
    {
        return Ok(PathRenameOutcome {
            new_path: to_rel,
            from_path: from_rel,
            refactored_paths: Vec::new(),
        });
    }

    if to_full.exists() {
        if same_path_on_disk(&from_full, &to_full) {
            return Ok(PathRenameOutcome {
                new_path: to_rel,
                from_path: from_rel,
                refactored_paths: Vec::new(),
            });
        }
        return Err(AppError::new("error.fs.path_exists"));
    }

    fs::rename(&from_full, &to_full).map_err(|e| AppError::database(e.to_string()))?;

    if from_rel.ends_with(".md") {
        blocks::rename_file_path(db, &from_rel, &to_rel)?;
    }

    reconcile::rename_paths(db, &from_rel, &to_rel)?;

    let refactored_paths =
        refactor_wikilinks_if_stem_changed(db, project_root, &from_rel, &to_rel)?;

    if to_full.is_file() && is_manuscript_path(&to_rel) && to_rel.to_lowercase().ends_with(".md") {
        let mut doc = parse_file(project_root, &to_rel)?;
        let _ = ensure_manuscript_title_on_disk(project_root, &to_rel, &mut doc, true)?;
    }

    if to_full.is_file() {
        upsert_file(db, project_root, &to_full)?;
    }

    Ok(PathRenameOutcome {
        new_path: to_rel,
        from_path: from_rel,
        refactored_paths,
    })
}

pub fn move_path(
    db: &ProjectDb,
    project_root: &Path,
    source_path: String,
    dest_parent_path: String,
) -> Result<String, AppError> {
    let from_full = resolve_under_root(project_root, &source_path)?;
    if !from_full.exists() {
        return Err(AppError::new("error.fs.not_found"));
    }
    if reconcile::should_ignore(&from_full) {
        return Err(AppError::new("error.fs.invalid_path"));
    }

    let file_name = from_full
        .file_name()
        .ok_or_else(|| AppError::new("error.fs.invalid_path"))?
        .to_string_lossy()
        .to_string();

    let dest_parent = if dest_parent_path.is_empty() {
        project_root.to_path_buf()
    } else {
        resolve_under_root(project_root, &dest_parent_path)?
    };
    if !dest_parent.is_dir() {
        return Err(AppError::new("error.fs.not_found"));
    }

    let to_full = dest_parent.join(&file_name);
    if to_full.exists() {
        return Err(AppError::new("error.fs.path_exists"));
    }
    if to_full.starts_with(&from_full) && from_full.is_dir() {
        return Err(AppError::new("error.fs.invalid_path"));
    }

    let moving_dir = from_full.is_dir();
    fs::rename(&from_full, &to_full).map_err(|e| AppError::database(e.to_string()))?;

    let from_rel = to_relative(project_root, &from_full)?;
    let to_rel = to_relative(project_root, &to_full)?;
    if moving_dir {
        blocks::rename_blocks_after_move(db, &from_rel, &to_rel)?;
    } else {
        blocks::rename_file_path(db, &from_rel, &to_rel)?;
    }
    reconcile::rename_paths(db, &from_rel, &to_rel)?;

    if to_full.is_file() {
        upsert_file(db, project_root, &to_full)?;
    }

    Ok(to_rel)
}

pub fn delete_path(
    db: &ProjectDb,
    project_root: &Path,
    path: String,
    force: bool,
) -> Result<(), AppError> {
    let full = resolve_under_root(project_root, &path)?;
    if !full.exists() {
        return Err(AppError::new("error.fs.not_found"));
    }
    if reconcile::should_ignore(&full) {
        return Err(AppError::new("error.fs.invalid_path"));
    }

    if full.is_dir() && directory_has_entries(&full)? && !force {
        return Err(AppError::new("error.fs.not_empty"));
    }

    let rel = to_relative(project_root, &full)?;
    let is_dir = full.is_dir();

    if is_dir {
        fs::remove_dir_all(&full).map_err(|e| AppError::database(e.to_string()))?;
    } else {
        fs::remove_file(&full).map_err(|e| AppError::database(e.to_string()))?;
    }

    if is_dir {
        blocks::delete_blocks_under_path(db, &rel)?;
    } else {
        blocks::delete_blocks_for_file(db, &rel)?;
    }
    reconcile::mark_path_removed(db, &rel)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::Path;

    use tempfile::TempDir;

    use crate::parser::parse_file_and_persist;

    use super::*;

    fn seed_manuscript(
        root: &Path,
        db: &ProjectDb,
        rel: &str,
        content: &str,
    ) -> Result<(), AppError> {
        let full = root.join(rel.replace('/', std::path::MAIN_SEPARATOR_STR));
        if let Some(parent) = full.parent() {
            fs::create_dir_all(parent).map_err(|e| AppError::database(e.to_string()))?;
        }
        fs::write(&full, content).map_err(|e| AppError::database(e.to_string()))?;
        parse_file_and_persist(db, root, rel)?;
        Ok(())
    }

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
    fn move_path_syncs_blocks_without_watcher() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path().canonicalize().unwrap();
        let db = ProjectDb::open(&root).unwrap();
        fs::create_dir_all(root.join("Manuscrito/Carpeta")).unwrap();

        let rel = "Manuscrito/Escena.md";
        seed_manuscript(
            &root,
            &db,
            rel,
            "---\ntitle: Escena\n---\n\n+++\n---\ntime: \"1.1.0\"\n---\nBody",
        )
        .unwrap();
        assert_eq!(count_blocks_at(&db, rel), 2);

        let new_rel = move_path(
            &db,
            &root,
            rel.to_string(),
            "Manuscrito/Carpeta".to_string(),
        )
        .unwrap();
        assert_eq!(new_rel, "Manuscrito/Carpeta/Escena.md");
        assert_eq!(count_blocks_at(&db, rel), 0);
        assert_eq!(count_blocks_at(&db, &new_rel), 2);

        let markers: i64 = db
            .connection()
            .query_row("SELECT COUNT(*) FROM time_markers", [], |row| row.get(0))
            .unwrap();
        assert_eq!(markers, 1);
    }

    #[test]
    fn create_manuscript_file_uses_event_segment_format() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path().canonicalize().unwrap();
        let db = ProjectDb::open(&root).unwrap();
        fs::create_dir_all(root.join("Manuscrito")).unwrap();

        let rel = create_file(
            &db,
            &root,
            "Manuscrito".to_string(),
            "Nueva Escena".to_string(),
        )
        .unwrap();

        let full = resolve_under_root(&root, &rel).unwrap();
        let raw = fs::read_to_string(&full).unwrap();
        assert!(raw.contains("title:"));
        assert!(!raw.contains("+++"));
        let doc = parse_file(&root, &rel).unwrap();
        assert_eq!(doc.blocks.len(), 1);
        assert_eq!(doc.blocks[0].metadata["title"], "Nueva Escena");
    }

    #[test]
    fn create_file_respects_txt_extension() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path().canonicalize().unwrap();
        let db = ProjectDb::open(&root).unwrap();
        fs::create_dir_all(root.join("Manuscrito")).unwrap();

        let rel = create_file(
            &db,
            &root,
            "Manuscrito".to_string(),
            "notas.txt".to_string(),
        )
        .unwrap();

        assert_eq!(rel, "Manuscrito/notas.txt");
        assert!(root.join("Manuscrito/notas.txt").is_file());
        assert!(!root.join("Manuscrito/notas.txt.md").exists());
    }

    #[test]
    fn create_file_adds_md_when_no_extension() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path().canonicalize().unwrap();
        let db = ProjectDb::open(&root).unwrap();
        fs::create_dir_all(root.join("Manuscrito")).unwrap();

        let rel = create_file(
            &db,
            &root,
            "Manuscrito".to_string(),
            "Prueba".to_string(),
        )
        .unwrap();

        assert_eq!(rel, "Manuscrito/Prueba.md");
    }

    #[test]
    fn create_file_explicit_md_unchanged() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path().canonicalize().unwrap();
        let db = ProjectDb::open(&root).unwrap();
        fs::create_dir_all(root.join("Manuscrito")).unwrap();

        let rel = create_file(
            &db,
            &root,
            "Manuscrito".to_string(),
            "Escena.md".to_string(),
        )
        .unwrap();

        assert_eq!(rel, "Manuscrito/Escena.md");
    }

    #[test]
    fn rename_manuscript_file_without_extension_gets_md() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path().canonicalize().unwrap();
        let db = ProjectDb::open(&root).unwrap();
        fs::create_dir_all(root.join("Manuscrito")).unwrap();

        let rel = create_file(
            &db,
            &root,
            "Manuscrito".to_string(),
            "Escena.md".to_string(),
        )
        .unwrap();
        let outcome = rename_path(&db, &root, rel, "Capitulo".to_string()).unwrap();
        assert_eq!(outcome.new_path, "Manuscrito/Capitulo.md");
        assert!(root.join("Manuscrito/Capitulo.md").is_file());
    }

    #[test]
    fn rename_manuscript_file_preserves_txt() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path().canonicalize().unwrap();
        let db = ProjectDb::open(&root).unwrap();
        fs::create_dir_all(root.join("Manuscrito")).unwrap();

        let rel = create_file(
            &db,
            &root,
            "Manuscrito".to_string(),
            "notas.txt".to_string(),
        )
        .unwrap();
        let outcome = rename_path(&db, &root, rel, "apuntes.txt".to_string()).unwrap();
        assert_eq!(outcome.new_path, "Manuscrito/apuntes.txt");
    }

    #[test]
    fn rename_folder_unchanged() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path().canonicalize().unwrap();
        let db = ProjectDb::open(&root).unwrap();
        fs::create_dir_all(root.join("Manuscrito")).unwrap();

        let rel = create_folder(
            &db,
            &root,
            "Manuscrito".to_string(),
            "carp".to_string(),
        )
        .unwrap();
        let outcome = rename_path(&db, &root, rel, "carpea".to_string()).unwrap();
        assert_eq!(outcome.new_path, "Manuscrito/carpea");
        assert!(root.join("Manuscrito/carpea").is_dir());
    }

    #[test]
    fn delete_path_removes_blocks_without_watcher() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path().canonicalize().unwrap();
        let db = ProjectDb::open(&root).unwrap();

        let rel = "Manuscrito/Borrar.md";
        seed_manuscript(&root, &db, rel, "---\ntime: \"2.0.0\"\n---\nText").unwrap();
        assert_eq!(count_blocks_at(&db, rel), 1);

        delete_path(&db, &root, rel.to_string(), false).unwrap();

        assert_eq!(count_blocks_at(&db, rel), 0);
        let markers: i64 = db
            .connection()
            .query_row("SELECT COUNT(*) FROM time_markers", [], |row| row.get(0))
            .unwrap();
        assert_eq!(markers, 0);
    }
}
