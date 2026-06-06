//! Diff por palabras entre versiones de un archivo (Fase 5.3).

use std::path::Path;
use std::str::FromStr;

use git2::Oid;
use serde::Serialize;
use similar::{ChangeTag, TextDiff};

use crate::error::AppError;
use crate::fs::paths::{normalize_relative, resolve_under_root};

use super::snapshot::open_repo;

pub const DIFF_MAX_WORDS: usize = 10_000;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffChunk {
    pub kind: String,
    pub text: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileDiffResult {
    pub relative_path: String,
    pub snapshot_id_a: Option<String>,
    pub snapshot_id_b: Option<String>,
    pub word_count_old: usize,
    pub word_count_new: usize,
    pub chunks: Vec<DiffChunk>,
}

fn word_count(text: &str) -> usize {
    text.split_whitespace().count()
}

fn file_text_at_commit(
    repo: &git2::Repository,
    commit_oid: Oid,
    rel_path: &str,
) -> Result<String, AppError> {
    let commit = repo
        .find_commit(commit_oid)
        .map_err(|_| AppError::new("error.snapshot.not_found"))?;
    let tree = commit
        .tree()
        .map_err(|e| super::snapshot::git_err("error.snapshot.diff_failed", e))?;
    let entry = tree
        .get_path(Path::new(rel_path))
        .map_err(|_| AppError::new("error.snapshot.file_not_in_version"))?;
    let blob = repo
        .find_blob(entry.id())
        .map_err(|e| super::snapshot::git_err("error.snapshot.diff_failed", e))?;
    String::from_utf8(blob.content().to_vec()).map_err(|_| AppError::new("error.snapshot.diff_invalid"))
}

fn file_text_working_tree(project_root: &Path, rel_path: &str) -> Result<String, AppError> {
    let full = resolve_under_root(project_root, rel_path)?;
    if !full.is_file() {
        return Err(AppError::new("error.snapshot.file_not_in_version"));
    }
    std::fs::read_to_string(&full).map_err(|e| AppError::database(e.to_string()))
}

fn resolve_commit_oid(repo: &git2::Repository, snapshot_id: Option<&str>) -> Result<Oid, AppError> {
    match snapshot_id {
        Some(id) => Oid::from_str(id.trim())
            .map_err(|_| AppError::new("error.snapshot.not_found"))
            .and_then(|oid| {
                repo.find_commit(oid)
                    .map_err(|_| AppError::new("error.snapshot.not_found"))?;
                Ok(oid)
            }),
        None => repo
            .head()
            .map_err(|e| super::snapshot::git_err("error.git.not_initialized", e))?
            .peel_to_commit()
            .map_err(|e| super::snapshot::git_err("error.git.not_initialized", e))
            .map(|c| c.id()),
    }
}

pub fn word_diff_chunks(old: &str, new: &str) -> Vec<DiffChunk> {
    let diff = TextDiff::from_words(old, new);
    diff.iter_all_changes()
        .map(|change| {
            let kind = match change.tag() {
                ChangeTag::Equal => "equal",
                ChangeTag::Delete => "remove",
                ChangeTag::Insert => "add",
            };
            DiffChunk {
                kind: kind.to_string(),
                text: change.value().to_string(),
            }
        })
        .collect()
}

/// Compara texto en `snapshotIdA` (lado antiguo / eliminado) vs `snapshotIdB` o working tree.
pub fn get_file_diff(
    project_root: &Path,
    relative_path: &str,
    snapshot_id_a: Option<&str>,
    snapshot_id_b: Option<&str>,
) -> Result<FileDiffResult, AppError> {
    let rel = normalize_relative(relative_path)?;
    let repo = open_repo(project_root)?;

    let old_text = if let Some(id) = snapshot_id_a {
        file_text_at_commit(&repo, Oid::from_str(id).map_err(|_| AppError::new("error.snapshot.not_found"))?, &rel)?
    } else {
        let oid = resolve_commit_oid(&repo, None)?;
        file_text_at_commit(&repo, oid, &rel)?
    };

    let new_text = if let Some(id) = snapshot_id_b {
        file_text_at_commit(&repo, Oid::from_str(id).map_err(|_| AppError::new("error.snapshot.not_found"))?, &rel)?
    } else {
        file_text_working_tree(project_root, &rel)?
    };

    let wc_old = word_count(&old_text);
    let wc_new = word_count(&new_text);
    if wc_old.saturating_add(wc_new) > DIFF_MAX_WORDS {
        return Err(AppError::new("error.snapshot.diff_too_large"));
    }

    let chunks = word_diff_chunks(&old_text, &new_text);

    Ok(FileDiffResult {
        relative_path: rel,
        snapshot_id_a: snapshot_id_a.map(str::to_string),
        snapshot_id_b: snapshot_id_b.map(str::to_string),
        word_count_old: wc_old,
        word_count_new: wc_new,
        chunks,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn diff_handles_ten_thousand_words_within_time_budget() {
        let words: Vec<String> = (0..10_000).map(|i| format!("word{i}")).collect();
        let old_text = words.join(" ");
        let mut new_words = words;
        new_words[5000] = "CHANGED".to_string();
        let new_text = new_words.join(" ");

        let start = std::time::Instant::now();
        let chunks = word_diff_chunks(&old_text, &new_text);
        let elapsed = start.elapsed();

        assert!(!chunks.is_empty());
        assert!(
            elapsed.as_secs() < 5,
            "diff de 10k palabras tardó {:?}",
            elapsed
        );
    }

    #[test]
    fn word_diff_detects_replacement() {
        let chunks = word_diff_chunks("hello world", "hello brave world");
        assert!(chunks.iter().any(|c| c.kind == "add"));
        assert!(chunks.iter().any(|c| c.kind == "equal"));
    }

    #[test]
    fn get_file_diff_between_commit_and_disk() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        crate::git::init_repository(root).unwrap();
        let rel = "doc.md";
        fs::write(root.join(rel), "alpha beta").unwrap();
        crate::git::snapshot::ensure_initial_commit(root).unwrap();
        fs::write(root.join(rel), "alpha beta two").unwrap();
        let snap = crate::git::snapshot::create_snapshot(root, "con beta").unwrap();

        fs::write(root.join(rel), "alpha gamma").unwrap();

        let diff = get_file_diff(root, rel, Some(&snap.id), None).unwrap();
        let removed: String = diff
            .chunks
            .iter()
            .filter(|c| c.kind == "remove")
            .map(|c| c.text.as_str())
            .collect();
        let added: String = diff
            .chunks
            .iter()
            .filter(|c| c.kind == "add")
            .map(|c| c.text.as_str())
            .collect();
        assert!(removed.contains("beta") || removed.contains("two"));
        assert!(added.contains("gamma"));
    }
}
