/** Serializa un token inline §1.4 (`{{time:…}}`, etc.). */
export function serializeInlineTag(type: string, value: string): string {
  return `{{${type}:${value}}}`;
}

export interface ParsedInlineTagSegment {
  type: string;
  value: string;
  start: number;
  end: number;
}

const INLINE_TAG_RE = /\{\{(\w+):([^}]+)\}\}/g;

/** Localiza tokens `{{type:value}}` en una línea (misma regex que Rust `inline_scanner`). */
export function parseInlineTagsInText(text: string): ParsedInlineTagSegment[] {
  const segments: ParsedInlineTagSegment[] = [];
  let match: RegExpExecArray | null;
  INLINE_TAG_RE.lastIndex = 0;
  while ((match = INLINE_TAG_RE.exec(text)) !== null) {
    const type = match[1]?.trim() ?? "";
    const value = match[2]?.trim() ?? "";
    if (!type || !value) {
      continue;
    }
    segments.push({
      type,
      value,
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return segments;
}
