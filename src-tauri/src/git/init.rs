//! Repositorio Git local del proyecto (invisible para el usuario hasta Fase 5).

use std::fs;
use std::path::Path;

use git2::Repository;

use crate::error::AppError;

const DEFAULT_GITIGNORE: &str = include_str!("../../resources/defaults/gitignore.txt");

/// Inicializa `.git/` en la raíz del proyecto si aún no existe.
pub fn init_repository(project_root: &Path) -> Result<(), AppError> {
    let git_dir = project_root.join(".git");
    if git_dir.exists() {
        return Ok(());
    }

    Repository::init(project_root)
        .map_err(|e| AppError::with_details("error.git.init_failed", e.to_string()))?;

    let gitignore_path = project_root.join(".gitignore");
    if !gitignore_path.exists() {
        fs::write(&gitignore_path, DEFAULT_GITIGNORE.as_bytes())
            .map_err(|e| AppError::with_details("error.git.init_failed", e.to_string()))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn init_creates_git_directory() {
        let tmp = TempDir::new().unwrap();
        init_repository(tmp.path()).unwrap();
        assert!(tmp.path().join(".git").exists());
        assert!(tmp.path().join(".gitignore").exists());
    }

    #[test]
    fn init_is_idempotent() {
        let tmp = TempDir::new().unwrap();
        init_repository(tmp.path()).unwrap();
        init_repository(tmp.path()).unwrap();
    }
}
