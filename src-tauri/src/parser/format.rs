//! Detección del formato en disco de un manuscrito (§1.4 vs legacy).

use regex::Regex;

use super::types::ManuscriptFormat;

static LEGACY_SEPARATOR: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();
static EVENT_MARKER: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();

fn legacy_separator() -> &'static Regex {
    LEGACY_SEPARATOR.get_or_init(|| Regex::new(r"(?m)^\+\+\+\s*$").expect("legacy separator"))
}

fn event_marker() -> &'static Regex {
    EVENT_MARKER.get_or_init(|| {
        Regex::new(r"(?m)^\+\+\+(?:event|end-event)\s*$").expect("event markers")
    })
}

/// Heurística para elegir parser sin leer el archivo completo en profundidad.
///
/// Prioridad:
/// 1. Marcadores `+++event` / `+++end-event` → [`ManuscriptFormat::EventSegments`].
/// 2. Líneas `+++` genéricas → [`ManuscriptFormat::LegacyBlocks`] (sin conversor, D3).
/// 3. Sin separadores → [`ManuscriptFormat::EventSegments`] (archivo nuevo / solo cabecera).
pub fn detect_manuscript_format(raw: &str) -> ManuscriptFormat {
    if event_marker().is_match(raw) {
        return ManuscriptFormat::EventSegments;
    }
    if legacy_separator().is_match(raw) {
        return ManuscriptFormat::LegacyBlocks;
    }
    ManuscriptFormat::EventSegments
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_event_format_from_markers() {
        let raw = "---\ntitle: A\n---\n+++event\n---\nevent: x\n---\nbody\n+++end-event\n";
        assert_eq!(detect_manuscript_format(raw), ManuscriptFormat::EventSegments);
    }

    #[test]
    fn detects_legacy_generic_plus_lines() {
        let raw = "---\ntitle: A\n---\nbody\n+++\n---\ntime: \"1\"\n---\nblock 2\n";
        assert_eq!(detect_manuscript_format(raw), ManuscriptFormat::LegacyBlocks);
    }

    #[test]
    fn empty_or_header_only_is_event_format() {
        assert_eq!(detect_manuscript_format(""), ManuscriptFormat::EventSegments);
        assert_eq!(
            detect_manuscript_format("---\ntitle: Solo\n---\nprosa\n"),
            ManuscriptFormat::EventSegments
        );
    }

    #[test]
    fn event_markers_take_priority_over_legacy_line() {
        let raw = "+++event\n---\nevent: a\n---\n+++\nstill event format\n";
        assert_eq!(detect_manuscript_format(raw), ManuscriptFormat::EventSegments);
    }
}
