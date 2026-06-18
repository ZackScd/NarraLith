//! Convierte una mención plana en wiki-link (Fase 3.4).

use std::path::Path;

use crate::db::ProjectDb;
use crate::error::AppError;
use crate::parser::{parse_file, parse_file_and_persist, ParsedDocument};

pub fn convert_unlinked_mention(
    db: &ProjectDb,
    project_root: &Path,
    source_path: &str,
    block_index: i32,
    start: usize,
    end: usize,
    entity_name: &str,
) -> Result<ParsedDocument, AppError> {
    let mut doc = parse_file(project_root, source_path)?;
    let block = doc
        .blocks
        .iter_mut()
        .find(|b| b.index == block_index)
        .ok_or_else(|| AppError::new("error.editor.block_not_found"))?;

    let body = &block.body;
    if start >= end || end > body.len() {
        return Err(AppError::new("error.references.invalid_range"));
    }

    let slice = &body[start..end];
    if slice.to_lowercase() != entity_name.trim().to_lowercase() {
        return Err(AppError::new("error.references.mention_mismatch"));
    }

    let new_body = format!(
        "{}[[{}]]{}",
        &body[..start],
        entity_name.trim(),
        &body[end..]
    );
    block.body = new_body;
    block.content_hash = None;

    let full = crate::fs::paths::resolve_under_root(project_root, source_path)?;
    let raw_on_disk = std::fs::read_to_string(&full).map_err(|e| AppError::database(e.to_string()))?;
    let content =
        crate::parser::serialize_blocks_to_disk(source_path, &doc.blocks, &raw_on_disk)?;
    std::fs::write(&full, content.as_bytes()).map_err(|e| AppError::database(e.to_string()))?;

    parse_file_and_persist(db, project_root, source_path)
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::TempDir;

    use super::*;
    use crate::parser::{detect_manuscript_format, parse_file, ManuscriptFormat};

    fn write_md(root: &Path, rel: &str, content: &str) {
        let full = root.join(rel.replace('/', std::path::MAIN_SEPARATOR_STR));
        if let Some(parent) = full.parent() {
            fs::create_dir_all(parent).unwrap();
        }
        fs::write(full, content).unwrap();
    }

    #[test]
    fn convert_in_second_event_preserves_event_markers() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        let db = ProjectDb::open(root).unwrap();

        write_md(root, "Worldbuilding/Personajes/Hero.md", "---\n---\n\n");
        let raw = "---\ntitle: Escena\n---\n\n\
                   +++event\n---\nevent: A\nentity: Worldbuilding/Eventos/a.md\n---\nintro\n+++end-event\n\n\
                   +++event\n---\nevent: B\nentity: Worldbuilding/Eventos/b.md\n---\nVe Hero aqui\n+++end-event\n";
        let rel = "Manuscrito/Escena.md";
        write_md(root, rel, raw);

        let parsed = parse_file(root, rel).unwrap();
        assert!(
            parsed.blocks.len() >= 3,
            "expected header + 2 events, got {} blocks: {:?}",
            parsed.blocks.len(),
            parsed.blocks.iter().map(|b| (&b.index, &b.body)).collect::<Vec<_>>()
        );
        let block = parsed
            .blocks
            .iter()
            .find(|b| b.body.contains("Hero") || b.body.contains("hero"))
            .expect("expected an event block containing plain mention Hero");
        let body = &block.body;
        let start = body
            .find("Hero")
            .or_else(|| body.find("hero"))
            .expect("event body must contain plain mention Hero");
        let end = start + "Hero".len();

        let doc =
            convert_unlinked_mention(&db, root, rel, block.index, start, end, "Hero").unwrap();
        let wiki_block = doc
            .blocks
            .iter()
            .find(|b| b.body.contains("[[Hero]]"))
            .expect("converted document must contain [[Hero]]");
        assert!(wiki_block.body.contains("[[Hero]]"));

        let saved = fs::read_to_string(root.join(rel)).unwrap();
        assert!(saved.contains("+++event"));
        assert!(saved.contains("+++end-event"));
        assert!(saved.contains("[[Hero]]"));
        assert_eq!(
            detect_manuscript_format(&saved),
            ManuscriptFormat::EventSegments
        );
        assert_eq!(saved.matches("+++event").count(), 2);
    }
}
