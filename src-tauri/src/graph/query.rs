//! Consulta de nodos y aristas para la vista GraphView.

use std::collections::{HashMap, HashSet};
use std::path::Path;

use rusqlite::Connection;
use serde::{Deserialize, Serialize};

use crate::db::ProjectDb;
use crate::error::AppError;
use crate::fs::taxonomy::TaxonomyMap;

pub const DEFAULT_NODE_LIMIT: usize = 2000;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GraphDataFilters {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub categories: Option<Vec<String>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub limit: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphNodeView {
    pub id: String,
    pub entity_id: String,
    pub label: String,
    pub path: String,
    pub category: String,
    pub degree: i32,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphLinkView {
    pub id: String,
    pub source_id: String,
    pub target_id: String,
    pub weight: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphData {
    pub nodes: Vec<GraphNodeView>,
    pub links: Vec<GraphLinkView>,
    pub truncated: bool,
}

pub fn get_graph_data(
    db: &ProjectDb,
    project_root: &Path,
    filters: GraphDataFilters,
) -> Result<GraphData, AppError> {
    let limit = filters.limit.unwrap_or(DEFAULT_NODE_LIMIT);
  if limit == 0 {
        return Err(AppError::new("error.graph.invalid_limit"));
    }

    let conn = db.connection();
    let taxonomy = TaxonomyMap::load_for_project(project_root)?;
    let category_filter = filters
        .categories
        .map(|c| c.into_iter().map(|s| s.to_lowercase()).collect::<HashSet<_>>());

    let mut nodes = load_nodes(conn, &taxonomy)?;
    if let Some(ref cats) = category_filter {
        nodes.retain(|n| cats.contains(&n.category.to_lowercase()));
    }

    if nodes.len() > limit {
        return Err(AppError::new("error.graph.too_many_nodes"));
    }

    let node_ids: HashSet<String> = nodes.iter().map(|n| n.id.clone()).collect();
    let links = load_links(conn, &node_ids)?;

    let mut degree: HashMap<String, i32> = HashMap::new();
    for link in &links {
        *degree.entry(link.source_id.clone()).or_insert(0) += 1;
        *degree.entry(link.target_id.clone()).or_insert(0) += 1;
    }
    for node in &mut nodes {
        node.degree = *degree.get(&node.id).unwrap_or(&0);
    }

    Ok(GraphData {
        nodes,
        links,
        truncated: false,
    })
}

fn load_nodes(conn: &Connection, taxonomy: &TaxonomyMap) -> Result<Vec<GraphNodeView>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, path, category, color
             FROM entities
             WHERE status = 'active'
             ORDER BY name COLLATE NOCASE ASC",
        )
        .map_err(|e| AppError::database(e.to_string()))?;

    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, Option<String>>(4)?,
            ))
        })
        .map_err(|e| AppError::database(e.to_string()))?;

    let mut out = Vec::new();
    for row in rows.flatten() {
        let (id, name, path, category, color) = row;
        let fill = color.unwrap_or_else(|| category_color(&category, &path, taxonomy));
        out.push(GraphNodeView {
            entity_id: id.clone(),
            id,
            label: name,
            path,
            category,
            degree: 0,
            color: fill,
        });
    }
    Ok(out)
}

fn load_links(conn: &Connection, node_ids: &HashSet<String>) -> Result<Vec<GraphLinkView>, AppError> {
    let mut stmt = conn
        .prepare("SELECT id, source_id, target_id, weight FROM graph_edges")
        .map_err(|e| AppError::database(e.to_string()))?;

    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, f64>(3)?,
            ))
        })
        .map_err(|e| AppError::database(e.to_string()))?;

    let mut out = Vec::new();
    for row in rows.flatten() {
        let (id, source_id, target_id, weight) = row;
        if node_ids.contains(&source_id) && node_ids.contains(&target_id) {
            out.push(GraphLinkView {
                id,
                source_id,
                target_id,
                weight,
            });
        }
    }
    Ok(out)
}

fn category_color(category: &str, path: &str, taxonomy: &TaxonomyMap) -> String {
    let folder_key = match category {
        "character" => "Personajes",
        "location" => "Ubicaciones",
        "faction" => "Facciones",
        "lore" => "Lore_y_Mitos",
        "powerSystem" | "power_system" => "Sistemas_de_Poder",
        "nature" => "Naturaleza",
        "object" => "Objetos_y_Artefactos",
        "society" => "Sociedad_y_Cultura",
        "manuscript" => "Manuscrito",
        _ => "",
    };

    if !folder_key.is_empty() {
        if let Some(c) = taxonomy.color_for_folder(folder_key, path) {
            return c;
        }
    }

    taxonomy
        .color_for_folder("Worldbuilding", path)
        .unwrap_or_else(|| "#6b7280".to_string())
}
