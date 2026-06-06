use serde::{Deserialize, Serialize};

/// Origen de la marca temporal en un segmento de evento (D2 / §1.5).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TimeMarkerTagKind {
    /// Etiqueta confirmada en YAML de apertura (`barTags`, type: time).
    Bar,
    /// Token inline en cuerpo (`{{time:…}}`).
    Inline,
}

impl TimeMarkerTagKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Bar => "bar",
            Self::Inline => "inline",
        }
    }

    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "bar" => Some(Self::Bar),
            "inline" => Some(Self::Inline),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeMarker {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub block_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub entity_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timestamp: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw_time: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub persisted_at: Option<i64>,
    /// `{filePath}::seg::{segmentIndex}` — NULL en filas legacy.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub segment_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tag_kind: Option<TimeMarkerTagKind>,
    /// Offset UTF-8 en cuerpo del segmento; NULL para marcas de barra (alineado con `InlineTag`).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub char_offset: Option<u32>,
}
