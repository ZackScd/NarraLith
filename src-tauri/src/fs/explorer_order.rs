//! Orden de presentación del explorador (por carpeta padre), persistido en el proyecto.

use std::collections::HashMap;
use std::fs;
use std::path::Path;

use crate::db::NARRALITH_DIR;
use crate::error::AppError;
use crate::fs::templates::{ProjectTemplate, TemplateNode};

pub const EXPLORER_ORDER_FILE: &str = "explorer-order.json";

pub type ExplorerOrderMap = HashMap<String, Vec<String>>;

const ROOT_KEY: &str = "__root__";

/// Genera el mapa de orden a partir del árbol de la plantilla (mismo orden que REQUIREMENTS).
pub fn build_from_template(template: &ProjectTemplate) -> ExplorerOrderMap {
    let mut order = ExplorerOrderMap::new();
    let root_paths: Vec<String> = template
        .nodes
        .iter()
        .map(|node| node_relative_path(node, ""))
        .collect();
    order.insert(ROOT_KEY.to_string(), root_paths);

    for node in &template.nodes {
        collect_dir_orders(node, "", &mut order);
    }

    order
}

fn collect_dir_orders(node: &TemplateNode, parent_rel: &str, order: &mut ExplorerOrderMap) {
    let TemplateNode::Dir { name, children } = node else {
        return;
    };

    let dir_rel = join_rel(parent_rel, name);
    if !children.is_empty() {
        let child_paths: Vec<String> = children
            .iter()
            .map(|child| node_relative_path(child, &dir_rel))
            .collect();
        order.insert(dir_rel.clone(), child_paths);
        for child in children {
            collect_dir_orders(child, &dir_rel, order);
        }
    }
}

fn node_relative_path(node: &TemplateNode, parent_rel: &str) -> String {
    match node {
        TemplateNode::Dir { name, .. } | TemplateNode::File { name, .. } => {
            join_rel(parent_rel, name)
        }
    }
}

fn join_rel(parent: &str, name: &str) -> String {
    if parent.is_empty() {
        name.to_string()
    } else {
        format!("{}/{}", parent, name)
    }
}

pub fn order_file_path(project_root: &Path) -> std::path::PathBuf {
    project_root.join(NARRALITH_DIR).join(EXPLORER_ORDER_FILE)
}

pub fn write_order(project_root: &Path, order: &ExplorerOrderMap) -> Result<(), AppError> {
    let path = order_file_path(project_root);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| AppError::database(e.to_string()))?;
    }
    let json = serde_json::to_string_pretty(order)
        .map_err(|e| AppError::database(e.to_string()))?;
    fs::write(&path, json).map_err(|e| AppError::database(e.to_string()))?;
    Ok(())
}

pub fn write_order_from_template(
    project_root: &Path,
    template: &ProjectTemplate,
) -> Result<(), AppError> {
    let order = build_from_template(template);
    write_order(project_root, &order)
}

pub fn read_order(project_root: &Path) -> Result<ExplorerOrderMap, AppError> {
    let path = order_file_path(project_root);
    if !path.is_file() {
        return Ok(ExplorerOrderMap::new());
    }
    let raw = fs::read_to_string(&path).map_err(|e| AppError::database(e.to_string()))?;
    if raw.trim().is_empty() {
        return Ok(ExplorerOrderMap::new());
    }
    let order: ExplorerOrderMap =
        serde_json::from_str(&raw).map_err(|e| AppError::database(e.to_string()))?;
    Ok(order)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fs::templates;

    #[test]
    fn standard_template_root_order() {
        let template = templates::load_template("standard").unwrap();
        let order = build_from_template(&template);
        let root = order.get(ROOT_KEY).expect("root order");
        assert_eq!(
            root,
            &[
                "Manuscrito".to_string(),
                "Imagenes".to_string(),
                "Worldbuilding".to_string(),
            ]
        );
    }

    #[test]
    fn standard_worldbuilding_trunk_order() {
        let template = templates::load_template("standard").unwrap();
        let order = build_from_template(&template);
        let wb = order.get("Worldbuilding").expect("wb order");
        assert_eq!(
            wb,
            &[
                "Worldbuilding/Personajes".to_string(),
                "Worldbuilding/Eventos".to_string(),
                "Worldbuilding/Ubicaciones".to_string(),
                "Worldbuilding/Facciones".to_string(),
                "Worldbuilding/Lore_y_Mitos".to_string(),
                "Worldbuilding/Sistemas_de_Poder".to_string(),
                "Worldbuilding/Naturaleza".to_string(),
                "Worldbuilding/Objetos_y_Artefactos".to_string(),
                "Worldbuilding/Sociedad_y_Cultura".to_string(),
            ]
        );
    }

    #[test]
    fn standard_manuscript_scene_order() {
        let template = templates::load_template("standard").unwrap();
        let order = build_from_template(&template);
        let chapter = order
            .get("Manuscrito/Volumen 1/Capitulo 1")
            .expect("chapter order");
        assert_eq!(
            chapter,
            &["Manuscrito/Volumen 1/Capitulo 1/Escena_1.md".to_string()]
        );
    }

    #[test]
    fn roundtrip_write_read() {
        let dir = tempfile::TempDir::new().unwrap();
        let template = templates::load_template("blank").unwrap();
        write_order_from_template(dir.path(), &template).unwrap();
        let loaded = read_order(dir.path()).unwrap();
        let expected = build_from_template(&template);
        assert_eq!(loaded, expected);
    }
}
