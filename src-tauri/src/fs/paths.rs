//! Validación de rutas bajo la raíz del proyecto (seguridad FS).

use std::path::{Path, PathBuf};

use crate::error::AppError;

const FORBIDDEN_SEGMENTS: &[&str] = &[".narralith", ".git", "node_modules"];

/// Resuelve una ruta relativa y comprueba que quede dentro del proyecto.
pub fn resolve_under_root(project_root: &Path, relative: &str) -> Result<PathBuf, AppError> {
    let rel = normalize_relative(relative)?;
    let joined = project_root.join(&rel);
    ensure_under_root(project_root, &joined)
}

/// Ruta para crear un hijo que aún no existe en disco.
pub fn resolve_new_child(
    project_root: &Path,
    parent_relative: &str,
    child_name: &str,
) -> Result<PathBuf, AppError> {
    validate_name(child_name)?;
    let parent = if parent_relative.is_empty() {
        project_root.to_path_buf()
    } else {
        resolve_under_root(project_root, parent_relative)?
    };
    if !parent.is_dir() {
        return Err(AppError::new("error.fs.not_found"));
    }
    let child = parent.join(child_name);
    ensure_under_root(project_root, &child)?;
    if is_forbidden_path(&child, project_root) {
        return Err(AppError::new("error.fs.invalid_path"));
    }
    Ok(child)
}

pub fn normalize_relative(relative: &str) -> Result<String, AppError> {
    let trimmed = relative
        .trim()
        .replace('\\', "/")
        .trim_end_matches('/')
        .to_string();
    if trimmed.is_empty() {
        return Ok(String::new());
    }
    if trimmed.contains("..") || trimmed.starts_with('/') {
        return Err(AppError::new("error.fs.invalid_path"));
    }
    for segment in trimmed.split('/') {
        if segment.is_empty() || segment == "." || segment == ".." {
            return Err(AppError::new("error.fs.invalid_path"));
        }
        if FORBIDDEN_SEGMENTS.contains(&segment) {
            return Err(AppError::new("error.fs.invalid_path"));
        }
    }
    Ok(trimmed)
}

pub fn validate_name(name: &str) -> Result<(), AppError> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(AppError::new("error.fs.invalid_name"));
    }
    if trimmed.contains('/') || trimmed.contains('\\') {
        return Err(AppError::new("error.fs.invalid_name"));
    }
    if trimmed == "." || trimmed == ".." {
        return Err(AppError::new("error.fs.invalid_name"));
    }
    Ok(())
}

pub fn ensure_under_root(project_root: &Path, candidate: &Path) -> Result<PathBuf, AppError> {
    let canonical_root = project_root
        .canonicalize()
        .map_err(|e| AppError::database(e.to_string()))?;

    let canonical = if candidate.exists() {
        candidate
            .canonicalize()
            .map_err(|e| AppError::database(e.to_string()))?
    } else if let Some(parent) = candidate.parent() {
        if !parent.exists() {
            return Err(AppError::new("error.fs.not_found"));
        }
        let canon_parent = parent
            .canonicalize()
            .map_err(|e| AppError::database(e.to_string()))?;
        let file_name = candidate
            .file_name()
            .ok_or_else(|| AppError::new("error.fs.invalid_path"))?;
        canon_parent.join(file_name)
    } else {
        return Err(AppError::new("error.fs.invalid_path"));
    };

    if !canonical.starts_with(&canonical_root) {
        return Err(AppError::new("error.fs.path_outside_project"));
    }

    Ok(canonical)
}

/// Quita el prefijo `\\?\` de rutas Windows extendidas (misma regla que IPC del proyecto).
fn strip_verbatim_prefix(path: &Path) -> PathBuf {
    let lossy = path.to_string_lossy();
    PathBuf::from(lossy.strip_prefix(r"\\?\").unwrap_or(&lossy))
}

fn canonicalize_for_compare(path: &Path) -> Option<PathBuf> {
    if path.exists() {
        return path
            .canonicalize()
            .ok()
            .as_deref()
            .map(strip_verbatim_prefix);
    }
    let parent = path.parent()?;
    if !parent.exists() {
        return None;
    }
    let file_name = path.file_name()?;
    let canon_parent = parent.canonicalize().ok()?;
    Some(strip_verbatim_prefix(&canon_parent.join(file_name)))
}

pub fn is_forbidden_path(full_path: &Path, project_root: &Path) -> bool {
    let Some(root) = project_root
        .canonicalize()
        .ok()
        .map(|p| strip_verbatim_prefix(&p))
    else {
        return true;
    };

    let Some(full) = canonicalize_for_compare(full_path) else {
        return true;
    };

    full.strip_prefix(&root)
        .ok()
        .and_then(|rel| rel.to_str())
        .map(|rel| {
            let normalized = rel.replace('\\', "/");
            normalized.starts_with(".narralith")
                || normalized.contains("/.narralith/")
                || normalized.starts_with(".git")
                || normalized.contains("/.git/")
        })
        .unwrap_or(true)
}

pub fn directory_has_entries(dir: &Path) -> Result<bool, AppError> {
    let mut entries = std::fs::read_dir(dir).map_err(|e| AppError::database(e.to_string()))?;
    Ok(entries.next().is_some())
}

pub fn to_relative(project_root: &Path, full: &Path) -> Result<String, AppError> {
    let canonical_full = ensure_under_root(project_root, full)?;
    let canonical_root = project_root
        .canonicalize()
        .map_err(|e| AppError::database(e.to_string()))?;
    canonical_full
        .strip_prefix(&canonical_root)
        .map(|p| p.to_string_lossy().replace('\\', "/"))
        .map_err(|_| AppError::new("error.fs.invalid_path"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn normalize_trims_trailing_slash() {
        assert_eq!(
            normalize_relative("Worldbuilding/Personajes/").unwrap(),
            "Worldbuilding/Personajes"
        );
    }

    #[test]
    fn to_relative_after_create_with_spaces_in_name() {
        let dir = tempfile::tempdir().unwrap();
        let sub = dir.path().join("Worldbuilding/Personajes");
        fs::create_dir_all(&sub).unwrap();
        let file = sub.join("pendejo 1.md");
        fs::write(&file, b"---\n---\n").unwrap();
        let rel = to_relative(dir.path(), &file).unwrap();
        assert_eq!(rel, "Worldbuilding/Personajes/pendejo 1.md");
    }

    #[test]
    fn resolve_new_child_under_worldbuilding_secundario() {
        let dir = tempfile::tempdir().unwrap();
        let sub = dir.path().join("Worldbuilding/Personajes/Secundario");
        fs::create_dir_all(&sub).unwrap();

        let child = resolve_new_child(
            dir.path(),
            "Worldbuilding/Personajes/Secundario",
            "test.md",
        )
        .expect("resolve_new_child should succeed for nested worldbuilding path");

        assert_eq!(child.file_name().and_then(|n| n.to_str()), Some("test.md"));
        assert!(!is_forbidden_path(&child, dir.path()));
    }

    #[test]
    fn is_forbidden_path_with_canonical_parent_and_noncanonical_root() {
        let dir = tempfile::tempdir().unwrap();
        let sub = dir.path().join("Worldbuilding/Personajes/Secundario");
        fs::create_dir_all(&sub).unwrap();

        let parent = resolve_under_root(dir.path(), "Worldbuilding/Personajes/Secundario")
            .expect("parent should resolve");
        let child = parent.join("hero.md");

        assert!(
            !is_forbidden_path(&child, dir.path()),
            "non-canonical project root must still allow valid child paths"
        );
    }
}
