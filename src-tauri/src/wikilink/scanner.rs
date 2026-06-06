//! Escaneo de wiki-links en cuerpos de bloque.

use regex::Regex;

/// Ocurrencia de `[[target]]` o `[[target|alias]]` en texto.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedWikiLink {
    pub target_name: String,
    pub alias: Option<String>,
    pub start: usize,
    pub end: usize,
}

fn wiki_link_regex() -> Regex {
    Regex::new(r"\[\[([^|\]]+)(?:\|([^\]]+))?\]\]").expect("wiki link regex")
}

/// Extrae todos los wiki-links de un cuerpo de bloque.
pub fn scan_wiki_links(body: &str) -> Vec<ParsedWikiLink> {
    let re = wiki_link_regex();
    re.captures_iter(body)
        .filter_map(|cap| {
            let full = cap.get(0)?;
            let target = cap.get(1)?.as_str().trim();
            if target.is_empty() {
                return None;
            }
            let alias = cap.get(2).map(|m| m.as_str().trim().to_string());
            let alias = alias.filter(|a| !a.is_empty());
            Some(ParsedWikiLink {
                target_name: target.to_string(),
                alias,
                start: full.start(),
                end: full.end(),
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_plain_and_alias_links() {
        let body = "Hola [[Hero]] y [[Rey|el anciano]] fin.";
        let links = scan_wiki_links(body);
        assert_eq!(links.len(), 2);
        assert_eq!(links[0].target_name, "Hero");
        assert!(links[0].alias.is_none());
        assert_eq!(links[1].target_name, "Rey");
        assert_eq!(links[1].alias.as_deref(), Some("el anciano"));
    }

    #[test]
    fn alias_only_pipe_form() {
        let body = "[[Nombre Real|Apodo]]";
        let links = scan_wiki_links(body);
        assert_eq!(links.len(), 1);
        assert_eq!(links[0].target_name, "Nombre Real");
        assert_eq!(links[0].alias.as_deref(), Some("Apodo"));
    }
}
