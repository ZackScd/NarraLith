//! Parser de documentos `.md` del manuscrito y entidades.
//!
//! **Dos formatos coexisten durante el refactor (Fase 1):**
//! - **Legacy** — [`types::ParsedDocument`]: splits `(?m)^\+\+\+\s*$` (`block_splitter`).
//! - **Nuevo (§1.9)** — [`types::ParsedManuscript`]: `fileHeader` + `freeText` | `event`.
//!
//! **D3:** no hay conversor legacy; [`format::detect_manuscript_format`] distingue formatos para
//! enrutar al parser correcto. El IPC del editor sigue en `ParsedDocument` hasta Fase 3+.

mod block_splitter;
mod document;
mod format;
mod frontmatter;
mod inline_scanner;
mod manuscript_title;
mod metadata_util;
mod serializer;
mod types;

pub use frontmatter::parse_segment;
pub use metadata_util::sanitize_metadata;

pub use document::{
    close_event_segment, create_event_segment, document_to_manuscript, insert_inline_tag_in_segment,
    manuscript_to_document, parse_document_str, parse_file, parse_file_and_persist,
    should_parse_as_manuscript,
    parse_full_path_and_persist, parse_legacy_document_str, parse_manuscript_and_persist,
    parse_manuscript_file, parse_manuscript_str, persist_parsed_document,
    save_manuscript_and_persist, serialize_blocks_to_disk, update_block_metadata,
    update_event_segment_metadata,
};
pub use manuscript_title::{
    ensure_manuscript_title_on_disk, is_manuscript_path, manuscript_initial_file_content,
    title_from_stem,
};
pub use format::detect_manuscript_format;
pub use inline_scanner::scan_inline_tags;
pub use serializer::{serialize_document, serialize_manuscript};
pub use types::{
    BarTag, EventSegment, FreeTextSegment, InlineTag, ManuscriptFileHeader, ManuscriptFormat,
    ManuscriptSegment, ParsedBlock, ParsedDocument, ParsedManuscript,
};
