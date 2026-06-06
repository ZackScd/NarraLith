use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectMeta {
    pub id: String,
    pub name: String,
    pub root_path: String,
    pub template_id: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub locale: String,
}
