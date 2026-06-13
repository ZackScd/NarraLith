//! Contrato IPC del documento parseado (Rust ↔ TypeScript).
//!
//! - **Legacy (baseline):** [`ParsedDocument`] / [`ParsedBlock`] — splits `+++` genéricos.
//! - **Nuevo (§1.9):** [`ParsedManuscript`] — `fileHeader` + segmentos `freeText` | `event`.

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Formato en disco detectado al leer un manuscrito.
///
/// **D3 (2026-06-05):** no hay conversor legacy; `LegacyBlocks` solo sirve para detectar
/// archivos antiguos y fallar con gracia hasta retirar el parser viejo.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ManuscriptFormat {
    /// Segmentos `+++event` / `+++end-event` y prosa libre (§1.4).
    EventSegments,
    /// Líneas `+++` arbitrarias (modelo anterior).
    LegacyBlocks,
}

/// Cabecera obligatoria del manuscrito (bloque 0): `title` ↔ stem del archivo.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManuscriptFileHeader {
    pub title: String,
    pub body: String,
}

/// Etiqueta de origen confirmada en el panel y persistida en YAML (`barTags`, §1.5).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BarTag {
    #[serde(rename = "type")]
    pub tag_type: String,
    pub value: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hour: Option<u32>,
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub calendar_reconciled: bool,
}

/// Etiqueta inline en el cuerpo (`{{time:…}}`, etc.) con offset UTF-8 en `body`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InlineTag {
    #[serde(rename = "type")]
    pub tag_type: String,
    pub value: String,
    /// Offset en bytes UTF-8 desde el inicio del cuerpo (convención `wikilink/scanner`).
    pub char_offset: u32,
}

/// Segmento de evento narrativo entre `+++event` y `+++end-event` (o abierto si falta cierre).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventSegment {
    /// Identificador estable: `{filePath}::seg::{segmentIndex}`.
    pub id: String,
    /// Índice del segmento en [`ParsedManuscript::segments`] (0 = primer segmento tras cabecera).
    pub segment_index: i32,
    /// Nombre mostrado en barra (`event` en YAML).
    pub name: String,
    pub description: String,
    /// Ruta relativa a la ficha Worldbuilding (`entity` en YAML).
    pub entity_path: String,
    /// Etiquetas de origen; ausente en disco → lista vacía (§1.5).
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub bar_tags: Vec<BarTag>,
    pub body: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub inline_tags: Vec<InlineTag>,
    /// `false` si no hay `+++end-event` tras el cuerpo.
    pub closed: bool,
}

/// Prosa libre fuera de eventos (antes, entre o después).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FreeTextSegment {
    pub id: String,
    pub segment_index: i32,
    pub body: String,
}

/// Un tramo del manuscrito tras la cabecera de archivo.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum ManuscriptSegment {
    FreeText(FreeTextSegment),
    Event(EventSegment),
}

/// Manuscrito parseado según §1.9 (contrato IPC objetivo del refactor).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedManuscript {
    pub file_path: String,
    pub format: ManuscriptFormat,
    pub file_header: ManuscriptFileHeader,
    pub segments: Vec<ManuscriptSegment>,
}

impl ParsedManuscript {
    pub fn stable_segment_id(file_path: &str, segment_index: i32) -> String {
        format!("{file_path}::seg::{segment_index}")
    }

    /// Manuscrito vacío: solo cabecera con título (sin segmentos).
    pub fn header_only(file_path: impl Into<String>, title: impl Into<String>) -> Self {
        Self {
            file_path: file_path.into(),
            format: ManuscriptFormat::EventSegments,
            file_header: ManuscriptFileHeader {
                title: title.into(),
                body: String::new(),
            },
            segments: Vec::new(),
        }
    }

    pub fn segment_count(&self) -> usize {
        self.segments.len()
    }

    pub fn event_segments(&self) -> impl Iterator<Item = &EventSegment> {
        self.segments.iter().filter_map(|s| match s {
            ManuscriptSegment::Event(e) => Some(e),
            ManuscriptSegment::FreeText(_) => None,
        })
    }
}

impl ManuscriptSegment {
    pub fn segment_index(&self) -> i32 {
        match self {
            ManuscriptSegment::FreeText(s) => s.segment_index,
            ManuscriptSegment::Event(s) => s.segment_index,
        }
    }

    pub fn body(&self) -> &str {
        match self {
            ManuscriptSegment::FreeText(s) => &s.body,
            ManuscriptSegment::Event(s) => &s.body,
        }
    }

    pub fn body_mut(&mut self) -> &mut String {
        match self {
            ManuscriptSegment::FreeText(s) => &mut s.body,
            ManuscriptSegment::Event(s) => &mut s.body,
        }
    }
}

impl EventSegment {
    pub fn new(
        file_path: &str,
        segment_index: i32,
        name: impl Into<String>,
        description: impl Into<String>,
        entity_path: impl Into<String>,
        body: impl Into<String>,
        closed: bool,
    ) -> Self {
        Self {
            id: ParsedManuscript::stable_segment_id(file_path, segment_index),
            segment_index,
            name: name.into(),
            description: description.into(),
            entity_path: entity_path.into(),
            bar_tags: Vec::new(),
            body: body.into(),
            inline_tags: Vec::new(),
            closed,
        }
    }

    pub fn time_bar_tags(&self) -> impl Iterator<Item = &BarTag> {
        self.bar_tags
            .iter()
            .filter(|t| t.tag_type.eq_ignore_ascii_case("time"))
    }

    pub fn time_inline_tags(&self) -> impl Iterator<Item = &InlineTag> {
        self.inline_tags
            .iter()
            .filter(|t| t.tag_type.eq_ignore_ascii_case("time"))
    }
}

impl FreeTextSegment {
    pub fn new(file_path: &str, segment_index: i32, body: impl Into<String>) -> Self {
        Self {
            id: ParsedManuscript::stable_segment_id(file_path, segment_index),
            segment_index,
            body: body.into(),
        }
    }
}

// --- Legacy (baseline) — se retira cuando el editor consuma `ParsedManuscript` ---

/// Un bloque lógico dentro de un `.md` (índice estable desde 0).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedBlock {
    /// Identificador estable: `{filePath}::{blockIndex}`.
    pub id: String,
    pub index: i32,
    pub body: String,
    pub metadata: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content_hash: Option<String>,
    /// Si el YAML del bloque falló, clave i18n (`error.parser.invalid_yaml`).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parse_error_key: Option<String>,
    /// Timestamp absoluto (BigInt decimal) calculado en frontend; no se serializa al IPC de lectura.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub time_timestamp: Option<String>,
}

/// Documento completo devuelto por `read_document` / `parse_document` (formato legacy).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedDocument {
    pub file_path: String,
    pub blocks: Vec<ParsedBlock>,
}

impl ParsedDocument {
    pub fn stable_block_id(file_path: &str, block_index: i32) -> String {
        format!("{file_path}::{block_index}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_manuscript() -> ParsedManuscript {
        let path = "Manuscrito/Escena.md";
        ParsedManuscript {
            file_path: path.to_string(),
            format: ManuscriptFormat::EventSegments,
            file_header: ManuscriptFileHeader {
                title: "Escena".to_string(),
                body: "prosa antes\n".to_string(),
            },
            segments: vec![
                ManuscriptSegment::Event(EventSegment {
                    id: ParsedManuscript::stable_segment_id(path, 0),
                    segment_index: 0,
                    name: "guerra".to_string(),
                    description: "Ataque al amanecer".to_string(),
                    entity_path: "Worldbuilding/Eventos/guerra.md".to_string(),
                    bar_tags: vec![BarTag {
                        tag_type: "time".to_string(),
                        value: "10.1.0".to_string(),
                        hour: Some(9),
                        calendar_reconciled: false,
                    }],
                    body: "cuerpo {{time:10.1.0}}".to_string(),
                    inline_tags: vec![InlineTag {
                        tag_type: "time".to_string(),
                        value: "10.1.0".to_string(),
                        char_offset: 7,
                    }],
                    closed: true,
                }),
                ManuscriptSegment::FreeText(FreeTextSegment::new(path, 1, "prosa después")),
            ],
        }
    }

    #[test]
    fn manuscript_serde_round_trip() {
        let original = sample_manuscript();
        let json = serde_json::to_string(&original).unwrap();
        let restored: ParsedManuscript = serde_json::from_str(&json).unwrap();
        assert_eq!(original, restored);
    }

    #[test]
    fn event_segment_serializes_with_kind_tag() {
        let path = "a.md";
        let seg = ManuscriptSegment::Event(EventSegment::new(
            path,
            0,
            "evt",
            "",
            "Worldbuilding/Eventos/evt.md",
            "body",
            false,
        ));
        let json = serde_json::to_value(&seg).unwrap();
        assert_eq!(json.get("kind").and_then(|v| v.as_str()), Some("event"));
        assert_eq!(json.get("name").and_then(|v| v.as_str()), Some("evt"));
        assert_eq!(json.get("closed").and_then(|v| v.as_bool()), Some(false));
    }

    #[test]
    fn bar_tags_optional_empty_omitted_on_serialize() {
        let path = "a.md";
        let event = EventSegment::new(path, 0, "e", "", "Worldbuilding/Eventos/e.md", "", true);
        let json = serde_json::to_value(&event).unwrap();
        assert!(json.get("barTags").is_none());
        assert!(json.get("inlineTags").is_none());
    }

    #[test]
    fn bar_tag_uses_type_key_in_json() {
        let tag = BarTag {
            tag_type: "time".to_string(),
            value: "1.1.0".to_string(),
            hour: None,
            calendar_reconciled: false,
        };
        let json = serde_json::to_value(&tag).unwrap();
        assert_eq!(json.get("type").and_then(|v| v.as_str()), Some("time"));
        assert_eq!(json.get("value").and_then(|v| v.as_str()), Some("1.1.0"));
    }

    #[test]
    fn inline_tag_serializes_camel_case_offset() {
        let tag = InlineTag {
            tag_type: "time".to_string(),
            value: "2.0.0".to_string(),
            char_offset: 12,
        };
        let json = serde_json::to_value(&tag).unwrap();
        assert_eq!(json.get("charOffset").and_then(|v| v.as_u64()), Some(12));
        assert!(json.get("char_offset").is_none());
    }

    #[test]
    fn stable_segment_id_format() {
        assert_eq!(
            ParsedManuscript::stable_segment_id("Manuscrito/A.md", 2),
            "Manuscrito/A.md::seg::2"
        );
    }

    #[test]
    fn header_only_has_no_segments() {
        let doc = ParsedManuscript::header_only("Manuscrito/Nuevo.md", "Nuevo");
        assert_eq!(doc.format, ManuscriptFormat::EventSegments);
        assert!(doc.segments.is_empty());
        assert_eq!(doc.file_header.title, "Nuevo");
    }

    #[test]
    fn time_tag_filters() {
        let mut event = EventSegment::new("a.md", 0, "e", "", "p", "b", true);
        event.bar_tags.push(BarTag {
            tag_type: "time".to_string(),
            value: "1.0.0".to_string(),
            hour: None,
            calendar_reconciled: false,
        });
        event.bar_tags.push(BarTag {
            tag_type: "location".to_string(),
            value: "X".to_string(),
            hour: None,
            calendar_reconciled: false,
        });
        event.inline_tags.push(InlineTag {
            tag_type: "time".to_string(),
            value: "2.0.0".to_string(),
            char_offset: 0,
        });
        assert_eq!(event.time_bar_tags().count(), 1);
        assert_eq!(event.time_inline_tags().count(), 1);
    }
}
