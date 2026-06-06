import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $createTextNode,
  type LexicalEditor,
  type TextNode,
} from "lexical";

import { WIKI_LINK_CURSOR_PLACEHOLDER } from "@/lib/editor/wikiLinkPlaceholder";
import type { EntitySearchHit } from "@/lib/types/entitySearch";
import {
  $createWikiLinkNode,
  $isWikiLinkNode,
} from "@/modules/editor/nodes/WikiLinkNode";

export type WikiTriggerKind = "bracket" | "at";

export interface WikiTriggerMatch {
  kind: WikiTriggerKind;
  query: string;
  /** Caracteres a borrar antes del cursor (incluye `[[` o `@` + query). */
  replaceableLength: number;
}

export function $getWikiTriggerMatch(): WikiTriggerMatch | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return null;
  }

  const anchor = selection.anchor;
  const node = anchor.getNode();
  if (!$isTextNode(node) || $isWikiLinkNode(node)) {
    return null;
  }

  const text = node.getTextContent();
  const offset = anchor.offset;
  const before = text.slice(0, offset);

  const bracket = before.match(/\[\[([^\]]*?)$/);
  if (bracket) {
    return {
      kind: "bracket",
      query: bracket[1] ?? "",
      replaceableLength: bracket[0].length,
    };
  }

  const at = before.match(/@([^\s[\]]*?)$/);
  if (at) {
    return {
      kind: "at",
      query: at[1] ?? "",
      replaceableLength: at[0].length,
    };
  }

  return null;
}

export function $insertWikiLinkFromHit(
  hit: EntitySearchHit,
  replaceableLength: number,
): void {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return;
  }

  const anchorNode = selection.anchor.getNode();
  if (!$isTextNode(anchorNode) || $isWikiLinkNode(anchorNode)) {
    return;
  }

  const offset = selection.anchor.offset;
  const startOffset = Math.max(0, offset - replaceableLength);
  const textNode = anchorNode as TextNode;
  const after = textNode.getTextContent().slice(offset);

  selection.setTextNodeRange(textNode, startOffset, textNode, offset);

  const link = $createWikiLinkNode(hit.name, hit.name, hit.path);
  const tailContent = after.length > 0 ? after : WIKI_LINK_CURSOR_PLACEHOLDER;
  const tail = $createTextNode(tailContent);

  selection.insertNodes([link, tail]);

  const tailOffset = tail.getTextContentSize();
  tail.select(tailOffset, tailOffset);
}

export function insertWikiLinkFromHit(
  editor: LexicalEditor,
  hit: EntitySearchHit,
  replaceableLength: number,
): void {
  editor.update(
    () => {
      $insertWikiLinkFromHit(hit, replaceableLength);
    },
    {
      onUpdate: () => {
        editor.focus();
      },
    },
  );
}
