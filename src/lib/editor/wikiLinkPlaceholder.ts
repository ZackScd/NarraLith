import { $getSelection, $isRangeSelection, type TextNode } from "lexical";

import { $isWikiLinkNode } from "@/modules/editor/nodes/WikiLinkNode";

/** Ancla de cursor tras insertar un wiki-link (no se guarda en disco). */
export const WIKI_LINK_CURSOR_PLACEHOLDER = "\u200B";

const ZWSP_PREFIX_RE = /^\u200B+/;

/** Quita marcadores de cursor al serializar párrafos. */
export function stripWikiLinkPlaceholders(text: string): string {
  return text.replace(/\u200B/g, "");
}

/**
 * Quita solo el ZWSP inicial tras un wiki-link (no espacios que escriba el usuario).
 * Así la puntuación/letras quedan pegadas al enlace sin romper Space.
 */
export function $normalizeTextAfterWikiLink(node: TextNode): void {
  const prev = node.getPreviousSibling();
  if (!$isWikiLinkNode(prev)) {
    return;
  }

  const text = node.getTextContent();
  if (!text.includes("\u200B")) {
    return;
  }

  const stripped = text.replace(ZWSP_PREFIX_RE, "");
  if (stripped === text) {
    return;
  }

  const selection = $getSelection();
  const anchorOffset =
    $isRangeSelection(selection) && selection.anchor.getNode() === node
      ? selection.anchor.offset
      : null;

  const removed = text.length - stripped.length;

  if (stripped.length === 0) {
    node.setTextContent(WIKI_LINK_CURSOR_PLACEHOLDER);
    if (anchorOffset !== null) {
      node.select(1, 1);
    }
    return;
  }

  node.setTextContent(stripped);

  if (anchorOffset !== null) {
    const offset = Math.max(0, Math.min(stripped.length, anchorOffset - removed));
    node.select(offset, offset);
  }
}
