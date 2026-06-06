//! Alertas marcadas como intencionales (`.narralith/dismissed_issues.json`).

use std::collections::HashSet;
use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::db::NARRALITH_DIR;
use crate::error::AppError;

const DISMISSED_FILENAME: &str = "dismissed_issues.json";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct DismissedStore {
    #[serde(default)]
    ids: Vec<String>,
}

pub fn dismissed_path(project_root: &Path) -> std::path::PathBuf {
    project_root.join(NARRALITH_DIR).join(DISMISSED_FILENAME)
}

pub fn load_dismissed_ids(project_root: &Path) -> Result<HashSet<String>, AppError> {
    let path = dismissed_path(project_root);
    if !path.exists() {
        return Ok(HashSet::new());
    }
    let json = fs::read_to_string(&path).map_err(|e| AppError::database(e.to_string()))?;
    let store: DismissedStore =
        serde_json::from_str(&json).map_err(|_| AppError::new("error.consistency.invalid_dismissed"))?;
    Ok(store.ids.into_iter().collect())
}

pub fn dismiss_issue(project_root: &Path, issue_id: &str) -> Result<(), AppError> {
    let path = dismissed_path(project_root);
    let mut ids = load_dismissed_ids(project_root)?;
    if !ids.insert(issue_id.to_string()) {
        return Ok(());
    }
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| AppError::database(e.to_string()))?;
    }
    let store = DismissedStore {
        ids: ids.into_iter().collect(),
    };
    let json = serde_json::to_string_pretty(&store)
        .map_err(|e| AppError::database(e.to_string()))?;
    fs::write(&path, json.as_bytes()).map_err(|e| AppError::database(e.to_string()))?;
    Ok(())
}
