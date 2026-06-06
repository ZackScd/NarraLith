//! Documento de ficha: un frontmatter YAML + cuerpo (sin bloques `+++`).

use serde::Serialize;
use serde_json::Value;

use crate::error::AppError;
use crate::parser::parse_segment;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EntityDocument {
    pub path: String,
    pub template_id: String,
    pub frontmatter: Value,
    pub body: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub yaml_error_key: Option<String>,
}

pub fn parse_entity_str(path: &str, raw: &str, template_id: &str) -> EntityDocument {
    let parts = parse_segment(raw);
    EntityDocument {
        path: path.to_string(),
        template_id: template_id.to_string(),
        frontmatter: parts.metadata,
        body: parts.body,
        yaml_error_key: parts.yaml_error.map(|e| e.key),
    }
}

pub fn serialize_entity(frontmatter: &Value, body: &str) -> Result<String, AppError> {
    let obj = match frontmatter.as_object() {
        Some(o) if !o.is_empty() => o,
        _ => {
            if body.trim().is_empty() {
                return Ok(String::new());
            }
            return Ok(body.to_string());
        }
    };

    let yaml = serde_yaml::to_string(obj).map_err(|e| AppError::database(e.to_string()))?;
    let yaml = yaml.trim_end();
    Ok(format!("---\n{yaml}\n---\n\n{body}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn round_trip_entity_file() {
        let meta = json!({ "title": "Hero", "role": "Protagonist" });
        let body = "A brave warrior.";
        let raw = serialize_entity(&meta, body).unwrap();
        let doc = parse_entity_str("Worldbuilding/Personajes/Hero.md", &raw, "character");
        assert_eq!(doc.frontmatter["title"], "Hero");
        assert_eq!(doc.body, body);
    }
}
