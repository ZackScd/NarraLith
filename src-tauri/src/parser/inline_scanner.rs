//! Escaneo de tokens inline `{{type:value}}` en cuerpos de segmento (distinto de wiki-links).

use regex::Regex;

use super::types::InlineTag;

fn inline_tag_regex() -> &'static Regex {
    static RE: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();
    RE.get_or_init(|| Regex::new(r"\{\{(\w+):([^}]+)\}\}").expect("inline tag regex"))
}

/// Extrae etiquetas inline con offset en **bytes UTF-8** (misma convención que `wikilink/scanner`).
pub fn scan_inline_tags(body: &str) -> Vec<InlineTag> {
    inline_tag_regex()
        .captures_iter(body)
        .filter_map(|cap| {
            let full = cap.get(0)?;
            let tag_type = cap.get(1)?.as_str().trim();
            let value = cap.get(2)?.as_str().trim();
            if tag_type.is_empty() || value.is_empty() {
                return None;
            }
            Some(InlineTag {
                tag_type: tag_type.to_string(),
                value: value.to_string(),
                char_offset: full.start() as u32,
            })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scans_multiple_time_tokens() {
        let body = "inicio {{time:10.1.0}} medio {{time:11.1.0}} fin";
        let tags = scan_inline_tags(body);
        assert_eq!(tags.len(), 2);
        assert_eq!(tags[0].tag_type, "time");
        assert_eq!(tags[0].value, "10.1.0");
        assert_eq!(tags[1].value, "11.1.0");
        assert!(tags[1].char_offset > tags[0].char_offset);
    }

    #[test]
    fn empty_body_yields_no_tags() {
        assert!(scan_inline_tags("").is_empty());
        assert!(scan_inline_tags("sin tokens").is_empty());
    }

    #[test]
    fn offset_points_at_opening_brace() {
        let body = "abc {{time:1.0.0}}";
        let tags = scan_inline_tags(body);
        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0].char_offset, 4);
        assert!(body[tags[0].char_offset as usize..].starts_with("{{time:"));
    }
}
