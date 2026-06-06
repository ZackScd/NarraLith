//! Esquema de plantillas YAML para `EntityFormRenderer` (Fase 4.1.1).

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum FieldType {
    ShortText,
    LongText,
    MarkdownBody,
    Image,
    Relation,
    Date,
    Select,
    MultiSelect,
    KeyValue,
    Nested,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateField {
    pub key: String,
    #[serde(rename = "type")]
    pub field_type: FieldType,
    pub label_key: String,
    #[serde(default)]
    pub required: bool,
    #[serde(default)]
    pub default: Option<serde_json::Value>,
    #[serde(default)]
    pub options: Vec<TemplateSelectOption>,
    #[serde(default)]
    pub relation_categories: Vec<String>,
    #[serde(default)]
    pub image_category: Option<String>,
    #[serde(default)]
    pub multiple: bool,
    #[serde(default)]
    pub nested_fields: Vec<NestedFieldDef>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NestedFieldDef {
    pub key: String,
    pub label_key: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateSelectOption {
    pub value: String,
    pub label_key: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateSection {
    pub id: String,
    pub label_key: String,
    pub fields: Vec<TemplateField>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EntityTemplate {
    pub id: String,
    pub label_key: String,
    #[serde(default)]
    pub features: Vec<String>,
    pub sections: Vec<TemplateSection>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateSummary {
    pub id: String,
    pub label_key: String,
}

impl EntityTemplate {
    pub fn parse_yaml(yaml: &str) -> Result<Self, String> {
        let template: EntityTemplate =
            serde_yaml::from_str(yaml).map_err(|e| format!("invalid template yaml: {e}"))?;
        template.validate()?;
        Ok(template)
    }

    pub fn validate(&self) -> Result<(), String> {
        if self.id.trim().is_empty() {
            return Err("template id is required".into());
        }
        if self.sections.is_empty() {
            return Err("template must have at least one section".into());
        }
        for section in &self.sections {
            if section.fields.is_empty() {
                return Err(format!("section '{}' has no fields", section.id));
            }
            for field in &section.fields {
                if field.key.trim().is_empty() {
                    return Err("field key is required".into());
                }
                if !is_known_field_type(&field.field_type) {
                    return Err(format!("unknown field type for key '{}'", field.key));
                }
            }
        }
        Ok(())
    }

    pub fn summary(&self) -> TemplateSummary {
        TemplateSummary {
            id: self.id.clone(),
            label_key: self.label_key.clone(),
        }
    }
}

fn is_known_field_type(field_type: &FieldType) -> bool {
    matches!(
        field_type,
        FieldType::ShortText
            | FieldType::LongText
            | FieldType::MarkdownBody
            | FieldType::Image
            | FieldType::Relation
            | FieldType::Date
            | FieldType::Select
            | FieldType::MultiSelect
            | FieldType::KeyValue
            | FieldType::Nested
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_character_template() {
        let yaml = include_str!("../../resources/entity_templates/character.yaml");
        let t = EntityTemplate::parse_yaml(yaml).expect("character template");
        assert_eq!(t.id, "character");
        assert!(t.features.contains(&"timeline".to_string()));
    }

    #[test]
    fn rejects_unknown_field_type_in_yaml() {
        let yaml = r#"id: bad
labelKey: test
sections:
  - id: s
    labelKey: test
    fields:
      - key: x
        type: notARealType
        labelKey: test
"#;
        assert!(EntityTemplate::parse_yaml(yaml).is_err());
    }
}
