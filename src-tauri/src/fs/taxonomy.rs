//! Colores taxonómicos por carpeta (`.narralith/taxonomy.json`).

use std::collections::HashMap;
use std::fs;
use std::path::Path;

use crate::db::NARRALITH_DIR;
use crate::error::AppError;

const DEFAULT_TAXONOMY_JSON: &str = include_str!("../../resources/defaults/taxonomy.json");
const CUSTOM_FOLDER_COLOR: &str = "#6b7280";

#[derive(Debug, Clone, Default)]
pub struct TaxonomyMap {
    colors: HashMap<String, String>,
}

impl TaxonomyMap {
    pub fn load_for_project(project_root: &Path) -> Result<Self, AppError> {
        let path = project_root.join(NARRALITH_DIR).join("taxonomy.json");
        let json = if path.exists() {
            fs::read_to_string(&path).map_err(|e| AppError::database(e.to_string()))?
        } else {
            DEFAULT_TAXONOMY_JSON.to_string()
        };

        let colors: HashMap<String, String> =
            serde_json::from_str(&json).map_err(|e| AppError::database(e.to_string()))?;

        Ok(Self { colors })
    }

    /// Color para un directorio según su nombre de segmento o claves en la ruta.
    pub fn into_inner(self) -> HashMap<String, String> {
        self.colors
    }

    pub fn color_for_folder(&self, folder_name: &str, relative_path: &str) -> Option<String> {
        if let Some(c) = self.colors.get(folder_name) {
            return Some(c.clone());
        }

        for segment in relative_path.split(['/', '\\']) {
            if let Some(c) = self.colors.get(segment) {
                return Some(c.clone());
            }
        }

        Some(CUSTOM_FOLDER_COLOR.to_string())
    }
}
