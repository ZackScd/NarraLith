//! Wiki-links `[[target]]` / `[[target|alias]]` — escaneo y persistencia (Fase 3.2).

mod replace;
mod scanner;

pub use replace::replace_entity_target_in_text;
pub use scanner::{scan_wiki_links, ParsedWikiLink};
