//! Snapshots Git invisibles: crear, listar y restaurar puntos de control del proyecto.

use std::path::Path;
use std::str::FromStr;

use git2::{IndexAddOption, Oid, Repository, ResetType, Sort};
use serde::Serialize;

use crate::error::AppError;

/// Commit inicial silencioso (oculto en la UI principal).
pub const INIT_MESSAGE: &str = "narralith:init";
/// Prefijo de snapshots automáticos (Fase 5.2).
pub const AUTO_MESSAGE_PREFIX: &str = "narralith:auto:";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotSummary {
    pub id: String,
    pub message: String,
    pub created_at: i64,
    pub kind: SnapshotKind,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SnapshotKind {
    Manual,
    Auto,
    Init,
}

pub(crate) fn git_err(key: &str, err: git2::Error) -> AppError {
    AppError::with_details(key, err.message().to_string())
}

pub fn open_repo(project_root: &Path) -> Result<Repository, AppError> {
    Repository::open(project_root).map_err(|_| AppError::new("error.git.not_initialized"))
}

fn commit_signature() -> Result<git2::Signature<'static>, AppError> {
    git2::Signature::now("NarraLith", "narralith@local")
        .map_err(|e| git_err("error.git.not_initialized", e))
}

fn stage_all(repo: &Repository) -> Result<(), AppError> {
    let mut index = repo
        .index()
        .map_err(|e| git_err("error.git.not_initialized", e))?;
    index
        .add_all(["*"].iter(), IndexAddOption::DEFAULT, None)
        .map_err(|e| git_err("error.snapshot.stage_failed", e))?;
    index
        .write()
        .map_err(|e| git_err("error.snapshot.stage_failed", e))?;
    Ok(())
}

fn index_has_changes(repo: &Repository) -> Result<bool, AppError> {
    let mut index = repo
        .index()
        .map_err(|e| git_err("error.git.not_initialized", e))?;
    let head = match repo.head() {
        Ok(h) => h,
        Err(_) => return Ok(index.len() > 0),
    };
    let commit = head
        .peel_to_commit()
        .map_err(|e| git_err("error.git.not_initialized", e))?;
    let tree = commit
        .tree()
        .map_err(|e| git_err("error.git.not_initialized", e))?;
    let diff = repo
        .diff_tree_to_index(Some(&tree), Some(&mut index), None)
        .map_err(|e| git_err("error.snapshot.stage_failed", e))?;
    Ok(diff.deltas().len() > 0)
}

fn write_tree_and_commit(
    repo: &Repository,
    message: &str,
) -> Result<Oid, AppError> {
    let mut index = repo
        .index()
        .map_err(|e| git_err("error.git.not_initialized", e))?;
    let tree_id = index
        .write_tree()
        .map_err(|e| git_err("error.snapshot.commit_failed", e))?;
    let tree = repo
        .find_tree(tree_id)
        .map_err(|e| git_err("error.snapshot.commit_failed", e))?;
    let sig = commit_signature()?;

    let oid = if let Ok(head) = repo.head() {
        let parent = head
            .peel_to_commit()
            .map_err(|e| git_err("error.snapshot.commit_failed", e))?;
        repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &[&parent])
            .map_err(|e| git_err("error.snapshot.commit_failed", e))?
    } else {
        repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &[])
            .map_err(|e| git_err("error.snapshot.commit_failed", e))?
    };
    Ok(oid)
}

fn kind_from_message(message: &str) -> SnapshotKind {
    if message == INIT_MESSAGE {
        SnapshotKind::Init
    } else if message.starts_with(AUTO_MESSAGE_PREFIX) {
        SnapshotKind::Auto
    } else {
        SnapshotKind::Manual
    }
}

fn summary_from_commit(commit: &git2::Commit) -> Result<SnapshotSummary, AppError> {
    let message = commit
        .message()
        .unwrap_or("")
        .trim()
        .to_string();
    let created_at = commit.time().seconds() * 1000;
    let kind = kind_from_message(&message);
    Ok(SnapshotSummary {
        id: commit.id().to_string(),
        message,
        created_at,
        kind,
    })
}

fn is_visible_in_list(message: &str, include_auto: bool) -> bool {
    if message == INIT_MESSAGE {
        return false;
    }
    if message.starts_with(AUTO_MESSAGE_PREFIX) {
        return include_auto;
    }
    true
}

/// Si el repo no tiene commits, crea uno con el estado actual del disco.
pub fn ensure_initial_commit(project_root: &Path) -> Result<(), AppError> {
    let repo = open_repo(project_root)?;
    if repo.head().is_ok() {
        return Ok(());
    }
    stage_all(&repo)?;
    write_tree_and_commit(&repo, INIT_MESSAGE)?;
    Ok(())
}

/// Crea un snapshot manual con el mensaje del usuario.
pub fn create_snapshot(project_root: &Path, message: &str) -> Result<SnapshotSummary, AppError> {
    let trimmed = message.trim();
    if trimmed.is_empty() {
        return Err(AppError::new("error.snapshot.name_required"));
    }
    if trimmed.starts_with("narralith:") {
        return Err(AppError::new("error.snapshot.reserved_prefix"));
    }

    let repo = open_repo(project_root)?;
    ensure_initial_commit(project_root)?;
    stage_all(&repo)?;

    if !index_has_changes(&repo)? {
        return Err(AppError::new("error.snapshot.nothing_to_commit"));
    }

    let oid = write_tree_and_commit(&repo, trimmed)?;
    let commit = repo
        .find_commit(oid)
        .map_err(|e| git_err("error.snapshot.commit_failed", e))?;
    summary_from_commit(&commit)
}

/// Lista snapshots del historial (más recientes primero).
pub fn list_snapshots(
    project_root: &Path,
    include_auto: bool,
    limit: usize,
) -> Result<Vec<SnapshotSummary>, AppError> {
    let repo = open_repo(project_root)?;
    if repo.head().is_err() {
        return Ok(vec![]);
    }

    let mut revwalk = repo
        .revwalk()
        .map_err(|e| git_err("error.git.not_initialized", e))?;
    revwalk
        .push_head()
        .map_err(|e| git_err("error.git.not_initialized", e))?;
    revwalk.set_sorting(Sort::TIME).ok();

    let mut out = Vec::new();
    for oid in revwalk {
        if out.len() >= limit {
            break;
        }
        let oid = oid.map_err(|e| git_err("error.git.not_initialized", e))?;
        let commit = repo
            .find_commit(oid)
            .map_err(|e| git_err("error.git.not_initialized", e))?;
        let message = commit.message().unwrap_or("").trim().to_string();
        if !is_visible_in_list(&message, include_auto) {
            continue;
        }
        out.push(summary_from_commit(&commit)?);
    }
    Ok(out)
}

fn auto_snapshot_message() -> String {
    let ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    format!("{AUTO_MESSAGE_PREFIX}{ms}")
}

fn collect_history_oids(repo: &Repository) -> Result<Vec<Oid>, AppError> {
    let mut revwalk = repo
        .revwalk()
        .map_err(|e| git_err("error.git.not_initialized", e))?;
    revwalk
        .push_head()
        .map_err(|e| git_err("error.git.not_initialized", e))?;
    let mut oids = Vec::new();
    for oid in revwalk {
        oids.push(oid.map_err(|e| git_err("error.git.not_initialized", e))?);
    }
    oids.reverse();
    Ok(oids)
}

/// Reescribe el historial lineal conservando el árbol de cada commit indicado (sin cherry-pick).
fn replay_history(repo: &Repository, oids: &[Oid]) -> Result<(), AppError> {
    if oids.is_empty() {
        return Ok(());
    }
    let first = repo
        .find_commit(oids[0])
        .map_err(|e| git_err("error.snapshot.prune_failed", e))?;
    repo.reset(first.as_object(), ResetType::Hard, None)
        .map_err(|e| git_err("error.snapshot.prune_failed", e))?;

    for oid in oids.iter().skip(1) {
        let commit = repo
            .find_commit(*oid)
            .map_err(|e| git_err("error.snapshot.prune_failed", e))?;
        let tree = commit
            .tree()
            .map_err(|e| git_err("error.snapshot.prune_failed", e))?;
        let sig = commit_signature()?;
        let head = repo
            .head()
            .and_then(|r| r.peel_to_commit())
            .map_err(|e| git_err("error.snapshot.prune_failed", e))?;
        let msg = commit.message().unwrap_or("narralith:replay");
        repo.commit(Some("HEAD"), &sig, &sig, msg, &tree, &[&head])
            .map_err(|e| git_err("error.snapshot.prune_failed", e))?;
    }
    Ok(())
}

/// Elimina snapshots automáticos antiguos más allá de `retention` (reescritura lineal).
pub fn prune_auto_snapshots(project_root: &Path, retention: usize) -> Result<(), AppError> {
    if retention == 0 {
        return Ok(());
    }
    let repo = open_repo(project_root)?;
    if repo.head().is_err() {
        return Ok(());
    }

    let oids = collect_history_oids(&repo)?;
    let mut auto_indices: Vec<usize> = Vec::new();
    for (i, oid) in oids.iter().enumerate() {
        let commit = repo
            .find_commit(*oid)
            .map_err(|e| git_err("error.git.not_initialized", e))?;
        let msg = commit.message().unwrap_or("").trim();
        if msg.starts_with(AUTO_MESSAGE_PREFIX) {
            auto_indices.push(i);
        }
    }
    if auto_indices.len() <= retention {
        return Ok(());
    }
    let drop_count = auto_indices.len() - retention;
    let drop_positions: std::collections::HashSet<usize> =
        auto_indices.into_iter().take(drop_count).collect();

    let kept: Vec<Oid> = oids
        .iter()
        .enumerate()
        .filter(|(i, _)| !drop_positions.contains(i))
        .map(|(_, oid)| *oid)
        .collect();

    if kept.len() == oids.len() {
        return Ok(());
    }
    replay_history(&repo, &kept)
}

/// Snapshot automático si hay cambios; aplica retención configurada.
pub fn auto_snapshot(project_root: &Path) -> Result<Option<SnapshotSummary>, AppError> {
    use super::versioning_config::load_versioning_config;

    let config = load_versioning_config(project_root);
    ensure_initial_commit(project_root)?;
    let repo = open_repo(project_root)?;
    stage_all(&repo)?;

    if !index_has_changes(&repo)? {
        return Ok(None);
    }

    let message = auto_snapshot_message();
    let oid = write_tree_and_commit(&repo, &message)?;
    let commit = repo
        .find_commit(oid)
        .map_err(|e| git_err("error.snapshot.commit_failed", e))?;
    let summary = summary_from_commit(&commit)?;

    let retention = config.auto_retention as usize;
    prune_auto_snapshots(project_root, retention)?;

    Ok(Some(summary))
}

/// Antes de un guardado con borrado masivo, captura el estado actual.
pub fn auto_snapshot_if_risky_delete(
    project_root: &Path,
    previous_len: usize,
    next_len: usize,
) -> Result<(), AppError> {
    if crate::editor::risk::is_risky_mass_delete(previous_len, next_len) {
        let _ = auto_snapshot(project_root)?;
    }
    Ok(())
}

/// Restaura el working tree al commit indicado (reset duro).
pub fn restore_snapshot(project_root: &Path, snapshot_id: &str) -> Result<(), AppError> {
    let repo = open_repo(project_root)?;
    let oid = Oid::from_str(snapshot_id.trim())
        .map_err(|_| AppError::new("error.snapshot.not_found"))?;
    let commit = repo
        .find_commit(oid)
        .map_err(|_| AppError::new("error.snapshot.not_found"))?;
    repo.reset(commit.as_object(), ResetType::Hard, None)
        .map_err(|e| git_err("error.snapshot.restore_failed", e))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn ensure_initial_commit_then_list_excludes_init() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        crate::git::init_repository(root).unwrap();
        fs::write(root.join("chapter.md"), "v1").unwrap();
        ensure_initial_commit(root).unwrap();
        ensure_initial_commit(root).unwrap();

        let list = list_snapshots(root, false, 10).unwrap();
        assert!(list.is_empty());

        fs::write(root.join("chapter.md"), "v2").unwrap();
        let snap = create_snapshot(root, "Primera versión").unwrap();
        assert_eq!(snap.kind, SnapshotKind::Manual);
        assert_eq!(snap.message, "Primera versión");

        let list = list_snapshots(root, false, 10).unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].id, snap.id);
    }

    #[test]
    fn restore_recoveries_older_file_content() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        crate::git::init_repository(root).unwrap();
        let file = root.join("story.md");
        fs::write(&file, "alpha").unwrap();
        ensure_initial_commit(root).unwrap();

        fs::write(&file, "beta").unwrap();
        let snap = create_snapshot(root, "con beta").unwrap();
        fs::write(&file, "gamma").unwrap();
        assert_eq!(fs::read_to_string(&file).unwrap(), "gamma");

        restore_snapshot(root, &snap.id).unwrap();
        assert_eq!(fs::read_to_string(&file).unwrap(), "beta");
    }

    #[test]
    fn create_snapshot_rejects_empty_name() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        crate::git::init_repository(root).unwrap();
        fs::write(root.join("a.md"), "x").unwrap();
        ensure_initial_commit(root).unwrap();
        let err = create_snapshot(root, "   ").unwrap_err();
        assert_eq!(err.key, "error.snapshot.name_required");
    }

    #[test]
    fn auto_snapshot_skips_clean_tree() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        crate::git::init_repository(root).unwrap();
        fs::write(root.join("a.md"), "x").unwrap();
        ensure_initial_commit(root).unwrap();
        assert!(auto_snapshot(root).unwrap().is_none());
    }

    #[test]
    fn auto_snapshot_prunes_beyond_retention() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        crate::git::init_repository(root).unwrap();
        crate::git::versioning_config::save_versioning_config(
            root,
            &crate::git::versioning_config::VersioningConfig {
                auto_retention: 2,
                auto_interval_minutes: 5,
            },
        )
        .unwrap();
        let file = root.join("f.md");
        fs::write(&file, "1").unwrap();
        ensure_initial_commit(root).unwrap();

        for i in 2..=4 {
            fs::write(&file, format!("{i}")).unwrap();
            assert!(auto_snapshot(root).unwrap().is_some());
        }

        let autos: Vec<_> = list_snapshots(root, true, 100)
            .unwrap()
            .into_iter()
            .filter(|s| s.kind == SnapshotKind::Auto)
            .collect();
        assert!(autos.len() <= 2);
    }
}
