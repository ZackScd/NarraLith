//! Carga de plantillas bundled + overrides de proyecto (Fase 4.1.2).

use std::fs;
use std::path::Path;

use serde::Deserialize;

use crate::db::NARRALITH_DIR;
use crate::entity::template::{EntityTemplate, TemplateSummary};
use crate::error::AppError;

const BUNDLED_TEMPLATES: &[(&str, &str)] = &[
    ("artifact", include_str!("../../resources/entity_templates/artifact.yaml")),
    ("biome", include_str!("../../resources/entity_templates/biome.yaml")),
    ("character", include_str!("../../resources/entity_templates/character.yaml")),
    ("civilization", include_str!("../../resources/entity_templates/civilization.yaml")),
    ("consumable", include_str!("../../resources/entity_templates/consumable.yaml")),
    ("cosmology", include_str!("../../resources/entity_templates/cosmology.yaml")),
    ("creature", include_str!("../../resources/entity_templates/creature.yaml")),
    ("culture", include_str!("../../resources/entity_templates/culture.yaml")),
    ("custom", include_str!("../../resources/entity_templates/custom.yaml")),
    ("economy", include_str!("../../resources/entity_templates/economy.yaml")),
    ("event", include_str!("../../resources/entity_templates/event.yaml")),
    ("faction", include_str!("../../resources/entity_templates/faction.yaml")),
    ("flora", include_str!("../../resources/entity_templates/flora.yaml")),
    ("geology", include_str!("../../resources/entity_templates/geology.yaml")),
    ("language", include_str!("../../resources/entity_templates/language.yaml")),
    ("location", include_str!("../../resources/entity_templates/location.yaml")),
    ("lore", include_str!("../../resources/entity_templates/lore.yaml")),
    ("material", include_str!("../../resources/entity_templates/material.yaml")),
    ("nature", include_str!("../../resources/entity_templates/nature.yaml")),
    ("object", include_str!("../../resources/entity_templates/object.yaml")),
    ("phenomenon", include_str!("../../resources/entity_templates/phenomenon.yaml")),
    ("politics", include_str!("../../resources/entity_templates/politics.yaml")),
    ("power_system", include_str!("../../resources/entity_templates/power_system.yaml")),
    ("religion", include_str!("../../resources/entity_templates/religion.yaml")),
    ("society", include_str!("../../resources/entity_templates/society.yaml")),
    ("vehicle", include_str!("../../resources/entity_templates/vehicle.yaml")),
    ("weapon", include_str!("../../resources/entity_templates/weapon.yaml")),
];

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TemplateMapFile {
    #[serde(default = "default_template_id")]
    default_template_id: String,
    #[serde(default)]
    rules: Vec<TemplateMapRule>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TemplateMapRule {
    pattern: String,
    template_id: String,
}

fn default_template_id() -> String {
    "custom".to_string()
}

pub fn list_template_summaries(project_root: &Path) -> Result<Vec<TemplateSummary>, AppError> {
    let mut ids: Vec<String> = BUNDLED_TEMPLATES.iter().map(|(id, _)| (*id).to_string()).collect();
    ids.sort();
    ids.dedup();

    let mut out = Vec::new();
    for id in ids {
        let template = load_template(project_root, &id)?;
        out.push(template.summary());
    }
    Ok(out)
}

pub fn load_template(project_root: &Path, template_id: &str) -> Result<EntityTemplate, AppError> {
    if let Some(project_yaml) = read_project_override(project_root, template_id) {
        return EntityTemplate::parse_yaml(&project_yaml)
            .map_err(|e| AppError::with_details("error.template.invalid", e));
    }

    let bundled = BUNDLED_TEMPLATES
        .iter()
        .find(|(id, _)| *id == template_id)
        .map(|(_, yaml)| *yaml)
        .ok_or_else(|| AppError::new("error.template.not_found"))?;

    EntityTemplate::parse_yaml(bundled)
        .map_err(|e| AppError::with_details("error.template.invalid", e))
}

pub fn resolve_template_id(project_root: &Path, relative_path: &str) -> String {
    let map = load_template_map(project_root);
    let normalized = relative_path.replace('\\', "/");

    for rule in &map.rules {
        if path_matches_pattern(&normalized, &rule.pattern) {
            return rule.template_id.clone();
        }
    }

    map.default_template_id
}

fn load_template_map(project_root: &Path) -> TemplateMapFile {
    let project_path = project_root
        .join(NARRALITH_DIR)
        .join("template_map.json");
    if let Ok(raw) = fs::read_to_string(&project_path) {
        if let Ok(map) = serde_json::from_str::<TemplateMapFile>(&raw) {
            return map;
        }
    }

    serde_json::from_str(include_str!("../../resources/defaults/template_map.json"))
        .unwrap_or(TemplateMapFile {
            default_template_id: "custom".to_string(),
            rules: vec![],
        })
}

fn read_project_override(project_root: &Path, template_id: &str) -> Option<String> {
    let path = project_root
        .join(NARRALITH_DIR)
        .join("entity_templates")
        .join(format!("{template_id}.yaml"));
    fs::read_to_string(path).ok()
}

fn path_matches_pattern(path: &str, pattern: &str) -> bool {
    let path_norm = path.replace('\\', "/");
    let pat_norm = pattern.replace('\\', "/");

    if let Some(prefix) = pat_norm.strip_suffix("/**") {
        let prefix_lower = prefix.to_lowercase();
        let path_lower = path_norm.to_lowercase();
        let with_slash = format!("{prefix_lower}/");
        return path_lower.starts_with(&with_slash) || path_lower == prefix_lower;
    }

    path_norm.eq_ignore_ascii_case(&pat_norm)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn resolves_character_from_path() {
        let tmp = TempDir::new().unwrap();
        let id = resolve_template_id(
            tmp.path(),
            "Worldbuilding/Personajes/Principal/Hero.md",
        );
        assert_eq!(id, "character");
    }

    #[test]
    fn bundled_templates_parse() {
        let tmp = TempDir::new().unwrap();
        let summaries = list_template_summaries(tmp.path()).unwrap();
        assert!(!summaries.is_empty());
        let character = load_template(tmp.path(), "character").unwrap();
        assert_eq!(character.id, "character");
    }

    #[test]
    fn resolves_creature_and_artifact_from_subfolders() {
        let tmp = TempDir::new().unwrap();
        assert_eq!(
            resolve_template_id(
                tmp.path(),
                "Worldbuilding/Naturaleza/Bestiario_y_Fauna/Dragon.md",
            ),
            "creature"
        );
        assert_eq!(
            resolve_template_id(
                tmp.path(),
                "Worldbuilding/Objetos_y_Artefactos/Reliquias_y_Artefactos_Magicos/Sword.md",
            ),
            "artifact"
        );
        assert_eq!(
            resolve_template_id(
                tmp.path(),
                "Worldbuilding/Sociedad_y_Cultura/Civilizaciones_y_Razas/Idiomas_y_Conlangs/Elvish.md",
            ),
            "language"
        );
    }
}
