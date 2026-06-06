//! Construcción del árbol de directorios del proyecto para el explorador (Fase 1.3).

use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;

use crate::error::AppError;
use crate::fs::taxonomy::TaxonomyMap;

const HIDDEN_NAMES: &[&str] = &[
    ".narralith",
    ".git",
    ".folder.md",
    "node_modules",
    "Thumbs.db",
    "desktop.ini",
];

/// Nodo del árbol para el frontend.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileTreeNode {
    pub name: String,
    /// Ruta relativa al proyecto con `/`.
    pub path: String,
    pub is_dir: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileTreeNode>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
}

/// Modos de filtro del explorador (solo presentación; no muta el FS).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TreeFilterMode {
    All,
    Manuscript,
    Worldbuilding,
}

impl TreeFilterMode {
    pub fn parse(raw: &str) -> Self {
        match raw {
            "manuscript" => Self::Manuscript,
            "worldbuilding" => Self::Worldbuilding,
            _ => Self::All,
        }
    }
}

pub fn list_tree(
    project_root: &Path,
    filter_mode: TreeFilterMode,
) -> Result<Vec<FileTreeNode>, AppError> {
    let taxonomy = TaxonomyMap::load_for_project(project_root)?;

    match filter_mode {
        TreeFilterMode::All => read_children(project_root, project_root, "", &taxonomy),
        TreeFilterMode::Manuscript => {
            let sub = project_root.join("Manuscrito");
            if sub.is_dir() {
                read_children(project_root, &sub, "Manuscrito", &taxonomy)
            } else {
                Ok(vec![])
            }
        }
        TreeFilterMode::Worldbuilding => {
            let name = "Worldbuilding";
            let sub = project_root.join(name);
            if sub.is_dir() {
                read_children(project_root, &sub, name, &taxonomy)
            } else {
                Ok(vec![])
            }
        }
    }
}

fn read_children(
    project_root: &Path,
    dir: &Path,
    relative: &str,
    taxonomy: &TaxonomyMap,
) -> Result<Vec<FileTreeNode>, AppError> {
    let entries = fs::read_dir(dir).map_err(|e| AppError::database(e.to_string()))?;

    let mut nodes: Vec<FileTreeNode> = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| AppError::database(e.to_string()))?;
        let file_name = entry.file_name().to_string_lossy().to_string();

        if is_hidden(&file_name) {
            continue;
        }

        let full_path = entry.path();
        let is_dir = full_path.is_dir();
        let rel_path = if relative.is_empty() {
            file_name.clone()
        } else {
            format!("{}/{}", relative, file_name)
        };

        let children = if is_dir {
            Some(read_children(project_root, &full_path, &rel_path, taxonomy)?)
        } else {
            None
        };

        let color = if is_dir {
            taxonomy.color_for_folder(&file_name, &rel_path)
        } else {
            None
        };

        nodes.push(FileTreeNode {
            name: file_name,
            path: rel_path.replace('\\', "/"),
            is_dir,
            children,
            color,
        });
    }

    Ok(nodes)
}

fn is_hidden(name: &str) -> bool {
    if name.starts_with('.') && name != "." {
        return true;
    }
    HIDDEN_NAMES.iter().any(|h| *h == name)
}

#[allow(dead_code)]
fn normalize_rel(path: PathBuf) -> String {
    path.to_string_lossy().replace('\\', "/")
}
