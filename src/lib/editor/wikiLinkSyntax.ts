/** Serializa un wiki-link al formato en disco. */
export function serializeWikiLink(
  targetName: string,
  displayText: string,
  alias?: string | null,
): string {
  const target = targetName.trim();
  const display = displayText.trim();
  if (alias && alias.trim() && alias.trim() !== target) {
    return `[[${target}|${alias.trim()}]]`;
  }
  if (display && display !== target) {
    return `[[${target}|${display}]]`;
  }
  return `[[${target}]]`;
}

export interface ParsedWikiLinkSegment {
  targetName: string;
  displayText: string;
  raw: string;
  start: number;
  end: number;
}

const WIKI_LINK_PATTERN = /\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g;

/** Extrae ocurrencias `[[target]]` o `[[target|alias]]` en un cuerpo de bloque. */
export function parseWikiLinksInText(body: string): ParsedWikiLinkSegment[] {
  const results: ParsedWikiLinkSegment[] = [];
  for (const match of body.matchAll(WIKI_LINK_PATTERN)) {
    const targetName = (match[1] ?? "").trim();
    const alias = match[2]?.trim();
    if (!targetName) {
      continue;
    }
    const displayText = alias && alias.length > 0 ? alias : targetName;
    const raw = match[0];
    const start = match.index ?? 0;
    results.push({
      targetName,
      displayText,
      raw,
      start,
      end: start + raw.length,
    });
  }
  return results;
}
