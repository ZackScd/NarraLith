//! División de `.md` en segmentos: legacy (`+++` genérico) o manuscrito (`+++event`).

use regex::Regex;

/// Segmento bruto legacy antes de extraer frontmatter.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RawSegment {
    pub index: usize,
    pub text: String,
}

/// Segmento bruto del manuscrito tras la cabecera de archivo.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RawManuscriptSegment {
    FreeText(String),
    Event {
        /// Texto tras la línea `+++event` (YAML opcional + cuerpo).
        payload: String,
        closed: bool,
    },
}

/// Resultado del split de formato §1.4.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SplitManuscript {
    /// Bloque 0: frontmatter `title` + prosa libre inicial.
    pub header_raw: String,
    pub segments: Vec<RawManuscriptSegment>,
}

static LEGACY_SEPARATOR: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();
static MANUSCRIPT_MARKER: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();

fn legacy_separator() -> &'static Regex {
    LEGACY_SEPARATOR.get_or_init(|| Regex::new(r"(?m)^\+\+\+\s*$").expect("legacy separator"))
}

fn manuscript_marker() -> &'static Regex {
    MANUSCRIPT_MARKER.get_or_init(|| {
        Regex::new(r"(?m)^(?:\+\+\+event|\+\+\+end-event)\s*$").expect("manuscript markers")
    })
}

/// Divide el contenido legacy: bloque 0 + cada `+++` en línea sola.
pub fn split_blocks(raw: &str) -> Vec<RawSegment> {
    let parts: Vec<&str> = legacy_separator().split(raw).collect();
    parts
        .into_iter()
        .enumerate()
        .map(|(index, text)| RawSegment {
            index,
            text: text.to_string(),
        })
        .collect()
}

/// Divide un manuscrito §1.4 en cabecera y segmentos `freeText` / `event`.
pub fn split_manuscript(raw: &str) -> SplitManuscript {
    let first_event = Regex::new(r"(?m)^\+\+\+event\s*$")
        .expect("event opener")
        .find(raw);

    let (header_raw, tail) = match first_event {
        Some(m) => (
            raw[..m.start()].trim_end().to_string(),
            &raw[m.end()..],
        ),
        None => (raw.trim_end().to_string(), ""),
    };

    let mut segments = Vec::new();
    let mut rest = tail;

    // Tras el primer `+++event` el tail empieza con YAML/cuerpo (sin repetir el marcador).
    if !rest.trim().is_empty() {
        let (payload, next, closed) = take_event_payload(rest);
        segments.push(RawManuscriptSegment::Event { payload, closed });
        rest = next;
    }

    segments.extend(split_manuscript_tail(rest));

    SplitManuscript {
        header_raw,
        segments,
    }
}

fn split_manuscript_tail(tail: &str) -> Vec<RawManuscriptSegment> {
    let mut segments = Vec::new();
    let mut rest = tail;

    loop {
        rest = rest.trim_start_matches(['\r', '\n']);
        if rest.is_empty() {
            break;
        }

        if rest.starts_with("+++event") {
            rest = skip_first_line(rest);
            let (payload, next, closed) = take_event_payload(rest);
            segments.push(RawManuscriptSegment::Event { payload, closed });
            rest = next;
            continue;
        }

        if rest.starts_with("+++end-event") {
            rest = skip_first_line(rest);
            continue;
        }

        let (free, next) = take_until_marker(rest);
        if !free.trim().is_empty() {
            segments.push(RawManuscriptSegment::FreeText(free));
        }
        if next.is_empty() {
            break;
        }
        rest = next;
    }

    segments
}

fn take_until_marker(s: &str) -> (String, &str) {
    if let Some(m) = manuscript_marker().find(s) {
        (s[..m.start()].to_string(), &s[m.start()..])
    } else {
        (s.to_string(), "")
    }
}

fn take_event_payload(s: &str) -> (String, &str, bool) {
    if let Some(m) = manuscript_marker().find(s) {
        let line = s[m.start()..].lines().next().unwrap_or("").trim();
        let closed = line == "+++end-event";
        let payload = s[..m.start()].to_string();
        let next = skip_first_line(&s[m.start()..]);
        (payload, next, closed)
    } else {
        (s.to_string(), "", false)
    }
}

fn skip_first_line(s: &str) -> &str {
    match s.find('\n') {
        Some(idx) => {
            let mut end = idx + 1;
            if end < s.len() && s.as_bytes()[idx] == b'\r' {
                // handled by idx on \n after \r
            }
            if idx > 0 && s.as_bytes()[idx - 1] == b'\r' {
                end = idx + 1;
            }
            &s[end..]
        }
        None => "",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_file_is_one_block() {
        let segs = split_blocks("");
        assert_eq!(segs.len(), 1);
        assert_eq!(segs[0].index, 0);
        assert!(segs[0].text.is_empty());
    }

    #[test]
    fn no_separator_is_single_block() {
        let raw = "---\ntime: A\n---\nHello world";
        let segs = split_blocks(raw);
        assert_eq!(segs.len(), 1);
        assert!(segs[0].text.contains("Hello world"));
    }

    #[test]
    fn three_blocks_with_plus_plus_plus() {
        let raw = "Block zero\n\n+++\nBlock one\n\n+++\nBlock two";
        let segs = split_blocks(raw);
        assert_eq!(segs.len(), 3);
    }

    #[test]
    fn tolerates_crlf() {
        let raw = "A\r\n+++\r\nB";
        let segs = split_blocks(raw);
        assert_eq!(segs.len(), 2);
    }

    #[test]
    fn manuscript_header_only() {
        let raw = "---\ntitle: Escena\n---\nprosa inicial\n";
        let split = split_manuscript(raw);
        assert!(split.segments.is_empty());
        assert!(split.header_raw.contains("title: Escena"));
        assert!(split.header_raw.contains("prosa inicial"));
    }

    #[test]
    fn manuscript_event_closed_and_free_text() {
        let raw = "---\ntitle: T\n---\nantes\n\n\
+++event\n\
---\n\
event: guerra\n\
description: desc\n\
entity: Worldbuilding/Eventos/guerra.md\n\
---\n\
cuerpo evento\n\n\
+++end-event\n\n\
despues";
        let split = split_manuscript(raw);
        assert_eq!(split.segments.len(), 2);
        match &split.segments[0] {
            RawManuscriptSegment::Event { payload, closed } => {
                assert!(*closed);
                assert!(payload.contains("event: guerra"));
                assert!(payload.contains("cuerpo evento"));
            }
            _ => panic!("expected event"),
        }
        match &split.segments[1] {
            RawManuscriptSegment::FreeText(body) => assert!(body.contains("despues")),
            _ => panic!("expected free text"),
        }
    }

    #[test]
    fn manuscript_open_event_without_end_marker() {
        let raw = "---\ntitle: T\n---\n\
+++event\n\
---\n\
event: abierto\n\
description:\n\
entity: Worldbuilding/Eventos/abierto.md\n\
---\n\
sigue abierto";
        let split = split_manuscript(raw);
        assert_eq!(split.segments.len(), 1);
        match &split.segments[0] {
            RawManuscriptSegment::Event { closed, .. } => assert!(!*closed),
            _ => panic!("expected open event"),
        }
    }

    #[test]
    fn manuscript_free_text_between_events() {
        let raw = "---\ntitle: T\n---\n\
                   +++event\n---\nevent: a\nentity: p/a.md\n---\nuno\n+++end-event\n\
                   entre\n\
                   +++event\n---\nevent: b\nentity: p/b.md\n---\ndos\n+++end-event";
        let split = split_manuscript(raw);
        assert_eq!(split.segments.len(), 3);
        assert!(matches!(split.segments[1], RawManuscriptSegment::FreeText(_)));
    }
}
