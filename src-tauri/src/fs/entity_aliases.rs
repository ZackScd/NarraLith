//! Lectura de `aliases` desde el frontmatter de archivo (bloque inicial `---`).

use std::fs;
use std::path::Path;

/// Extrae la lista `aliases` del YAML inicial del `.md`, si existe.
pub fn read_aliases_from_markdown(full_path: &Path) -> Vec<String> {
    let Ok(raw) = fs::read_to_string(full_path) else {
        return Vec::new();
    };

    let yaml = match extract_leading_yaml(&raw) {
        Some(y) => y,
        None => return Vec::new(),
    };

    let Ok(value) = serde_yaml::from_str::<serde_yaml::Value>(&yaml) else {
        return Vec::new();
    };

    parse_aliases_value(&value)
}

fn extract_leading_yaml(raw: &str) -> Option<String> {
    let trimmed = raw.strip_prefix("\u{feff}").unwrap_or(raw);
    if !trimmed.starts_with("---") {
        return None;
    }
    let rest = &trimmed[3..];
    let end = rest.find("\n---")?;
    Some(rest[..end].trim().to_string())
}

fn parse_aliases_value(value: &serde_yaml::Value) -> Vec<String> {
    let Some(aliases_val) = value.get("aliases") else {
        return Vec::new();
    };

    match aliases_val {
        serde_yaml::Value::Sequence(seq) => seq
            .iter()
            .filter_map(|v| v.as_str().map(|s| s.trim().to_string()))
            .filter(|s| !s.is_empty())
            .collect(),
        serde_yaml::Value::String(s) => s
            .split(',')
            .map(|part| part.trim().to_string())
            .filter(|part| !part.is_empty())
            .collect(),
        _ => Vec::new(),
    }
}

pub fn aliases_to_json(aliases: &[String]) -> String {
    serde_json::to_string(aliases).unwrap_or_else(|_| "[]".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn reads_aliases_array_from_frontmatter() {
        let mut tmp = NamedTempFile::new().unwrap();
        write!(
            tmp,
            "---\naliases:\n  - Apodo\n  - Otro\n---\n\nCuerpo."
        )
        .unwrap();
        let aliases = read_aliases_from_markdown(tmp.path());
        assert_eq!(aliases, vec!["Apodo", "Otro"]);
    }

    #[test]
    fn missing_aliases_returns_empty() {
        let mut tmp = NamedTempFile::new().unwrap();
        write!(tmp, "Sin frontmatter.").unwrap();
        assert!(read_aliases_from_markdown(tmp.path()).is_empty());
    }
}
