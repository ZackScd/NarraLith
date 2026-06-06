use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Entity {
    pub id: String,
    pub name: String,
    pub path: String,
    pub category: EntityCategory,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    pub aliases: Vec<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum EntityCategory {
    Character,
    Location,
    Faction,
    Event,
    Lore,
    PowerSystem,
    Nature,
    Object,
    Society,
    Manuscript,
    Custom,
}
