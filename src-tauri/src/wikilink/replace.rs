//! Sustitución de `target` en wiki-links al renombrar entidades (Fase 3.3).

use crate::wikilink::scan_wiki_links;

/// Reemplaza `[[old|…]]` → `[[new|…]]` preservando alias. Devuelve `None` si no hay cambios.
pub fn replace_entity_target_in_text(
    text: &str,
    old_name: &str,
    new_name: &str,
) -> Option<String> {
    if old_name == new_name {
        return None;
    }

    let links = scan_wiki_links(text);
    if !links.iter().any(|l| l.target_name == old_name) {
        return None;
    }

    let mut out = String::new();
    let mut cursor = 0usize;

    for link in links {
        out.push_str(&text[cursor..link.start]);
        let target = if link.target_name == old_name {
            new_name
        } else {
            &link.target_name
        };
        if let Some(alias) = &link.alias {
            out.push_str(&format!("[[{target}|{alias}]]"));
        } else {
            out.push_str(&format!("[[{target}]]"));
        }
        cursor = link.end;
    }

    out.push_str(&text[cursor..]);
    Some(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn replaces_plain_and_alias_links() {
        let text = "A [[Hero]] y [[Hero|el valiente]] B";
        let next = replace_entity_target_in_text(text, "Hero", "Rey").unwrap();
        assert!(next.contains("[[Rey]]"));
        assert!(next.contains("[[Rey|el valiente]]"));
        assert!(!next.contains("[[Hero"));
    }

    #[test]
    fn no_op_when_name_absent() {
        assert!(replace_entity_target_in_text("[[Otro]]", "Hero", "Rey").is_none());
    }
}
