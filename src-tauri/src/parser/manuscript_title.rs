//! Título de archivo en el frontmatter del bloque 0 (manuscrito).

use std::fs;
use std::path::Path;

use serde_json::{json, Map, Value};

use crate::error::AppError;
use crate::fs::paths::resolve_under_root;
use crate::parser::document::{manuscript_to_document, parse_manuscript_str};
use crate::parser::format::detect_manuscript_format;
use crate::parser::serializer::{serialize_document, serialize_manuscript};
use crate::parser::types::{ManuscriptFormat, ParsedBlock, ParsedDocument, ParsedManuscript};

/// Ruta relativa bajo la carpeta de manuscrito del proyecto.
pub fn is_manuscript_path(relative_path: &str) -> bool {
    let normalized = relative_path.replace('\\', "/");
    normalized.starts_with("Manuscrito/")
}

/// Convierte el stem del archivo en título legible (`Escena_1` → `Escena 1`).
pub fn title_from_stem(stem: &str) -> String {
    stem.replace('_', " ")
}

/// Contenido inicial de un `.md` nuevo en Manuscrito (formato §1.4, solo cabecera).
pub fn manuscript_initial_file_content(title: &str) -> Result<String, AppError> {
    let manuscript = ParsedManuscript::header_only("Manuscrito/placeholder.md", title);
    serialize_manuscript(&manuscript)
}

fn block0_title_is_missing(metadata: &Value) -> bool {
    match metadata.get("title") {
        None => true,
        Some(Value::String(s)) => s.trim().is_empty(),
        _ => true,
    }
}

/// Añade o actualiza `metadata.title` en el bloque 0 (adaptador legacy IPC).
pub fn apply_title_to_block0(doc: &mut ParsedDocument, title: &str, force: bool) -> bool {
    if !force {
        if let Some(block) = doc.blocks.first() {
            if !block0_title_is_missing(&block.metadata) {
                return false;
            }
        }
    }

    if doc.blocks.is_empty() {
        doc.blocks.push(ParsedBlock {
            id: ParsedDocument::stable_block_id(&doc.file_path, 0),
            index: 0,
            body: String::new(),
            metadata: json!({ "title": title }),
            content_hash: None,
            parse_error_key: None,
            time_timestamp: None,
        });
        return true;
    }

    let block = &mut doc.blocks[0];
    if block.index != 0 {
        return false;
    }

    let current = block.metadata.get("title").and_then(|v| v.as_str());
    if !force && current.is_some_and(|s| !s.trim().is_empty()) {
        return false;
    }
    if current == Some(title) {
        return false;
    }

    let meta = match block.metadata.as_object_mut() {
        Some(obj) => obj,
        None => {
            let mut map = Map::new();
            map.insert("title".to_string(), json!(title));
            block.metadata = Value::Object(map);
            return true;
        }
    };
    meta.insert("title".to_string(), json!(title));
    true
}

fn apply_title_to_manuscript(manuscript: &mut ParsedManuscript, title: &str, force: bool) -> bool {
    if !force && !manuscript.file_header.title.trim().is_empty() {
        return false;
    }
    if manuscript.file_header.title == title {
        return false;
    }
    manuscript.file_header.title = title.to_string();
    true
}

/// Garantiza `title` en bloque 0 y escribe en disco si hubo cambios.
pub fn ensure_manuscript_title_on_disk(
    project_root: &Path,
    relative_path: &str,
    doc: &mut ParsedDocument,
    force: bool,
) -> Result<bool, AppError> {
    if !is_manuscript_path(relative_path) {
        return Ok(false);
    }

    let stem = Path::new(relative_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("");
    let title = title_from_stem(stem);

    let full = resolve_under_root(project_root, relative_path)?;
    let raw = fs::read_to_string(&full).unwrap_or_default();

    if detect_manuscript_format(&raw) == ManuscriptFormat::EventSegments {
        let mut manuscript = parse_manuscript_str(relative_path, &raw)?;
        if !apply_title_to_manuscript(&mut manuscript, &title, force) {
            *doc = manuscript_to_document(&manuscript);
            return Ok(false);
        }
        let content = serialize_manuscript(&manuscript)?;
        fs::write(&full, content.as_bytes()).map_err(|e| AppError::database(e.to_string()))?;
        *doc = manuscript_to_document(&manuscript);
        return Ok(true);
    }

    if !apply_title_to_block0(doc, &title, force) {
        return Ok(false);
    }

    let content = serialize_document(&doc.blocks)?;
    fs::write(&full, content.as_bytes()).map_err(|e| AppError::database(e.to_string()))?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::parse_document_str;

    fn doc_with_blocks(blocks: Vec<ParsedBlock>) -> ParsedDocument {
        ParsedDocument {
            file_path: "Manuscrito/Scene.md".to_string(),
            blocks,
        }
    }

    #[test]
    fn title_from_stem_replaces_underscores() {
        assert_eq!(title_from_stem("Escena_1"), "Escena 1");
    }

    #[test]
    fn is_manuscript_path_prefix() {
        assert!(is_manuscript_path("Manuscrito/Escena_1.md"));
        assert!(!is_manuscript_path("Worldbuilding/Personajes/A.md"));
    }

    #[test]
    fn apply_title_adds_to_empty_metadata() {
        let mut doc = doc_with_blocks(vec![ParsedBlock {
            id: "Manuscrito/x.md::0".into(),
            index: 0,
            body: "body".into(),
            metadata: json!({}),
            content_hash: None,
            parse_error_key: None,
            time_timestamp: None,
        }]);
        assert!(apply_title_to_block0(&mut doc, "Escena 1", false));
        assert_eq!(doc.blocks[0].metadata["title"], "Escena 1");
    }

    #[test]
    fn initial_content_contains_title() {
        let raw = manuscript_initial_file_content("Nueva Escena").unwrap();
        assert!(raw.contains("title:"));
        assert!(!raw.contains("+++"));
        let doc = parse_document_str("Manuscrito/Nueva.md", &raw).unwrap();
        assert_eq!(doc.blocks[0].metadata["title"], "Nueva Escena");
    }

    #[test]
    fn ensure_round_trip_on_parse() {
        let raw = "---\n---\n\nHello";
        let mut doc = parse_document_str("Manuscrito/maoaoa.md", raw).unwrap();
        assert!(block0_title_is_missing(&doc.blocks[0].metadata));
        assert!(apply_title_to_block0(&mut doc, "maoaoa", false));
        let manuscript = parse_manuscript_str("Manuscrito/maoaoa.md", raw).unwrap();
        let mut ms = manuscript;
        apply_title_to_manuscript(&mut ms, "maoaoa", false);
        let serialized = serialize_manuscript(&ms).unwrap();
        assert!(serialized.contains("title:"));
        let again = parse_document_str("Manuscrito/maoaoa.md", &serialized).unwrap();
        assert_eq!(again.blocks[0].metadata["title"], "maoaoa");
        assert_eq!(again.blocks[0].body, "Hello");
    }
}
