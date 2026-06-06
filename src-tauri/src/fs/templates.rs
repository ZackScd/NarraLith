//! Plantillas de estructura inicial del proyecto (Fase 1.1.1).
//! Los JSON viven en `resources/templates/` y se embeben en compilación.

use std::path::{Component, Path, PathBuf};

use serde::Deserialize;

use crate::error::AppError;

const STANDARD_JSON: &str = include_str!("../../resources/templates/standard.json");
const BLANK_JSON: &str = include_str!("../../resources/templates/blank.json");

/// Identificadores de plantilla disponibles en Fase 1.
pub const TEMPLATE_IDS: &[&str] = &["standard", "blank"];

/// Árbol de carpetas/archivos que define el andamiaje inicial (editable por el usuario después).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectTemplate {
    pub id: String,
    /// Clave i18n (ej. `project.template.standard`), nunca texto visible en UI desde Rust.
    pub label_key: String,
    pub nodes: Vec<TemplateNode>,
}

/// Nodo de plantilla: directorio anidado o archivo semilla.
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum TemplateNode {
    Dir {
        name: String,
        #[serde(default)]
        children: Vec<TemplateNode>,
    },
    File {
        name: String,
        #[serde(default)]
        content: String,
    },
}

/// Carga una plantilla por id (`standard` | `blank`).
pub fn load_template(template_id: &str) -> Result<ProjectTemplate, AppError> {
    let json = match template_id {
        "standard" => STANDARD_JSON,
        "blank" => BLANK_JSON,
        _ => {
            return Err(AppError::with_details(
                "error.project.template_not_found",
                template_id,
            ));
        }
    };

    let template: ProjectTemplate = serde_json::from_str(json).map_err(|e| {
        AppError::with_details("error.project.template_invalid", e.to_string())
    })?;

    if template.id != template_id {
        return Err(AppError::with_details(
            "error.project.template_invalid",
            format!("id mismatch: expected {}, got {}", template_id, template.id),
        ));
    }

    validate_template(&template)?;
    Ok(template)
}

/// Lista plantillas embebidas (para el launcher en fases posteriores).
pub fn list_templates() -> Result<Vec<ProjectTemplate>, AppError> {
    TEMPLATE_IDS
        .iter()
        .map(|id| load_template(id))
        .collect()
}

/// Comprueba que ningún segmento de ruta sea peligroso (`..`, absoluto, vacío).
pub fn validate_template(template: &ProjectTemplate) -> Result<(), AppError> {
    let mut paths = Vec::new();
    for node in &template.nodes {
        collect_paths(node, Path::new(""), &mut paths)?;
    }

    for rel in paths {
        if let Some(msg) = invalid_path_reason(&rel) {
            return Err(AppError::with_details(
                "error.project.template_invalid",
                format!("{}: {}", rel.display(), msg),
            ));
        }
    }
    Ok(())
}

/// Rutas relativas (archivos y directorios) que generará la plantilla.
pub fn collect_paths(
    node: &TemplateNode,
    prefix: &Path,
    out: &mut Vec<PathBuf>,
) -> Result<(), AppError> {
    match node {
        TemplateNode::Dir { name, children } => {
            validate_segment(name)?;
            let dir_path = prefix.join(name);
            out.push(dir_path.clone());
            for child in children {
                collect_paths(child, &dir_path, out)?;
            }
        }
        TemplateNode::File { name, .. } => {
            validate_segment(name)?;
            out.push(prefix.join(name));
        }
    }
    Ok(())
}

fn validate_segment(name: &str) -> Result<(), AppError> {
    if name.is_empty() {
        return Err(AppError::new("error.project.template_invalid"));
    }
    if name == "." || name == ".." {
        return Err(AppError::new("error.project.template_invalid"));
    }
    if name.contains('/') || name.contains('\\') {
        return Err(AppError::new("error.project.template_invalid"));
    }
    Ok(())
}

fn invalid_path_reason(path: &Path) -> Option<&'static str> {
    for component in path.components() {
        match component {
            Component::ParentDir => return Some("parent segment (..)"),
            Component::RootDir | Component::Prefix(_) => return Some("absolute path"),
            Component::Normal(seg) => {
                let s = seg.to_string_lossy();
                if s.is_empty() || s == "." || s == ".." {
                    return Some("invalid segment");
                }
            }
            _ => {}
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deserialize_standard_template() {
        let t = load_template("standard").expect("standard should parse");
        assert_eq!(t.id, "standard");
        assert_eq!(t.label_key, "project.template.standard");
        assert!(!t.nodes.is_empty());
    }

    #[test]
    fn deserialize_blank_template() {
        let t = load_template("blank").expect("blank should parse");
        assert_eq!(t.id, "blank");
        assert_eq!(t.label_key, "project.template.blank");
        let names: Vec<_> = t
            .nodes
            .iter()
            .filter_map(|n| match n {
                TemplateNode::Dir { name, .. } => Some(name.as_str()),
                _ => None,
            })
            .collect();
        assert!(names.contains(&"Manuscrito"));
        assert!(names.contains(&"Imagenes"));
        assert!(names.contains(&"Worldbuilding"));
    }

    #[test]
    fn standard_includes_seed_scene() {
        let t = load_template("standard").unwrap();
        let mut paths = Vec::new();
        for node in &t.nodes {
            collect_paths(node, Path::new(""), &mut paths).unwrap();
        }
        let scene = paths
            .iter()
            .any(|p| p.to_string_lossy().replace('\\', "/") == "Manuscrito/Volumen 1/Capitulo 1/Escena_1.md");
        assert!(scene, "standard template must include Escena_1.md");
    }

    #[test]
    fn blank_worldbuilding_is_trunk_only() {
        let t = load_template("blank").unwrap();
        let wb = t.nodes.iter().find_map(|n| match n {
            TemplateNode::Dir { name, children } if name == "Worldbuilding" => Some(children),
            _ => None,
        });
        let children = wb.expect("Worldbuilding root");
        assert_eq!(children.len(), 8);
        for node in children {
            match node {
                TemplateNode::Dir { children, .. } => assert!(children.is_empty()),
                TemplateNode::File { .. } => panic!("blank trunk should not have files"),
            }
        }
    }

    #[test]
    fn no_parent_dir_segments_in_paths() {
        for id in TEMPLATE_IDS {
            let t = load_template(id).unwrap();
            validate_template(&t).unwrap();
            let mut paths = Vec::new();
            for node in &t.nodes {
                collect_paths(node, Path::new(""), &mut paths).unwrap();
            }
            for p in paths {
                assert!(
                    invalid_path_reason(&p).is_none(),
                    "invalid path in {}: {}",
                    id,
                    p.display()
                );
            }
        }
    }

    #[test]
    fn unknown_template_returns_error() {
        let err = load_template("novel").unwrap_err();
        assert_eq!(err.key, "error.project.template_not_found");
    }
}
