//! Menciones en texto plano sin wiki-link (Fase 3.4).

use std::path::Path;

use rayon::prelude::*;
use regex::Regex;

use crate::error::AppError;
use crate::fs::reconcile;
use crate::parser::parse_file;
use crate::wikilink::scan_wiki_links;
use serde::Serialize;

pub const DEFAULT_UNLINKED_LIMIT: usize = 50;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UnlinkedMentionRow {
    pub source_path: String,
    pub block_index: i32,
    pub start: usize,
    pub end: usize,
    pub snippet: String,
}

/// Búsqueda **case-insensitive** del nombre de entidad fuera de `[[...]]`.
pub fn find_unlinked_mentions(
    project_root: &Path,
    entity_name: &str,
    entity_path: &str,
    limit: usize,
) -> Result<Vec<UnlinkedMentionRow>, AppError> {
    let needle = entity_name.trim();
    if needle.is_empty() {
        return Ok(Vec::new());
    }

    let files = reconcile::list_md_relative_paths(project_root)?;
    let limit = limit.max(1).min(200);

    let mut all: Vec<UnlinkedMentionRow> = files
        .par_iter()
        .filter_map(|rel| scan_file_for_mentions(project_root, rel, needle, entity_path).ok())
        .flatten()
        .collect();

    all.sort_by(|a, b| {
        a.source_path
            .cmp(&b.source_path)
            .then(a.block_index.cmp(&b.block_index))
            .then(a.start.cmp(&b.start))
    });
    all.truncate(limit);
    Ok(all)
}

fn scan_file_for_mentions(
    project_root: &Path,
    rel: &str,
    needle: &str,
    entity_path: &str,
) -> Result<Vec<UnlinkedMentionRow>, AppError> {
    let doc = parse_file(project_root, rel)?;
    let mut rows = Vec::new();

    for block in &doc.blocks {
        for (start, end) in find_plain_mentions(&block.body, needle) {
            rows.push(UnlinkedMentionRow {
                source_path: rel.to_string(),
                block_index: block.index,
                start,
                end,
                snippet: snippet_around(&block.body, start, end),
            });
        }
    }

    if rel == entity_path {
        // En la propia ficha también puede haber menciones en texto libre.
    }

    Ok(rows)
}

fn find_plain_mentions(body: &str, needle: &str) -> Vec<(usize, usize)> {
    let pattern = format!(r"(?i){}", regex::escape(needle));
    let re = match Regex::new(&pattern) {
        Ok(r) => r,
        Err(_) => return Vec::new(),
    };

    let wiki_spans: Vec<(usize, usize)> = scan_wiki_links(body)
        .into_iter()
        .map(|l| (l.start, l.end))
        .collect();

    let mut out = Vec::new();
    for m in re.find_iter(body) {
        let start = m.start();
        let end = m.end();
        if !is_inside_wiki_span(start, end, &wiki_spans) {
            out.push((start, end));
        }
    }
    out
}

fn is_inside_wiki_span(start: usize, end: usize, wiki_spans: &[(usize, usize)]) -> bool {
    wiki_spans.iter().any(|&(ws, we)| start >= ws && end <= we)
}

fn snippet_around(body: &str, start: usize, end: usize) -> String {
    let from = start.saturating_sub(40);
    let to = (end + 40).min(body.len());
    body[from..to].replace('\n', " ")
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn detects_plain_ignores_wiki_link() {
        let body = "Hola Hero y [[Hero]] fin.";
        let hits = find_plain_mentions(body, "Hero");
        assert_eq!(hits.len(), 1);
        assert_eq!(&body[hits[0].0..hits[0].1], "Hero");
    }

    #[test]
    fn case_insensitive_match() {
        let body = "ve a hero aquí";
        let hits = find_plain_mentions(body, "Hero");
        assert_eq!(hits.len(), 1);
    }

    #[test]
    fn find_across_project_files() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        std::fs::create_dir_all(root.join("Manuscrito")).unwrap();
        std::fs::create_dir_all(root.join("Worldbuilding/Personajes")).unwrap();
        std::fs::write(
            root.join("Worldbuilding/Personajes/Hero.md"),
            "---\n---\n\n",
        )
        .unwrap();
        std::fs::write(
            root.join("Manuscrito/A.md"),
            "Texto con Hero sin link.\n",
        )
        .unwrap();

        let list = find_unlinked_mentions(
            root,
            "Hero",
            "Worldbuilding/Personajes/Hero.md",
            50,
        )
        .unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].source_path, "Manuscrito/A.md");
    }
}
