import {
  $createLineBreakNode,
  $createTextNode,
  $isLineBreakNode,
  $isTextNode,
  type ElementNode,
} from "lexical";

import { parseInlineTagsInText } from "@/lib/editor/inlineTagSyntax";
import { stripWikiLinkPlaceholders } from "@/lib/editor/wikiLinkPlaceholder";
import { parseWikiLinksInText } from "@/lib/editor/wikiLinkSyntax";
import { searchEntities } from "@/lib/search/entityIndex";
import {
  $createInlineTimeTagNode,
  $isInlineTimeTagNode,
} from "@/modules/editor/nodes/InlineTimeTagNode";
import {
  $createWikiLinkNode,
  $isWikiLinkNode,
} from "@/modules/editor/nodes/WikiLinkNode";

interface ContentSegment {
  kind: "text" | "wiki" | "inline";
  start: number;
  end: number;
  wiki?: { targetName: string; displayText: string };
  inline?: { type: string; value: string };
}

function resolveTargetPath(targetName: string): string | null {
  const hits = searchEntities(targetName, 8);
  const normalized = targetName.trim().toLowerCase();
  const exact = hits.find(
    (hit) =>
      hit.name.toLowerCase() === normalized ||
      hit.aliases.some((alias) => alias.toLowerCase() === normalized),
  );
  return exact?.path ?? null;
}

function mergeContentSegments(text: string): ContentSegment[] {
  const wiki = parseWikiLinksInText(text).map((s) => ({
    kind: "wiki" as const,
    start: s.start,
    end: s.end,
    wiki: { targetName: s.targetName, displayText: s.displayText },
  }));
  const inline = parseInlineTagsInText(text).map((s) => ({
    kind: "inline" as const,
    start: s.start,
    end: s.end,
    inline: { type: s.type, value: s.value },
  }));
  return [...wiki, ...inline].sort((a, b) => a.start - b.start || a.end - b.end);
}

function appendPlainTextWithLineBreaks(paragraph: ElementNode, text: string): void {
  const parts = text.split("\n");
  for (let i = 0; i < parts.length; i += 1) {
    if (parts[i]) {
      paragraph.append($createTextNode(parts[i]));
    }
    if (i < parts.length - 1) {
      paragraph.append($createLineBreakNode());
    }
  }
}

/** Añade texto plano, wiki-links e inline tags a un párrafo Lexical. */
export function appendParagraphContent(paragraph: ElementNode, text: string): void {
  if (!text) {
    return;
  }

  const segments = mergeContentSegments(text);
  if (segments.length === 0) {
    appendPlainTextWithLineBreaks(paragraph, text);
    return;
  }

  let cursor = 0;
  for (const segment of segments) {
    if (segment.start > cursor) {
      appendPlainTextWithLineBreaks(paragraph, text.slice(cursor, segment.start));
    }
    if (segment.kind === "wiki" && segment.wiki) {
      const targetPath = resolveTargetPath(segment.wiki.targetName);
      paragraph.append(
        $createWikiLinkNode(
          segment.wiki.targetName,
          segment.wiki.displayText,
          targetPath,
        ),
      );
    } else if (segment.kind === "inline" && segment.inline) {
      paragraph.append(
        $createInlineTimeTagNode(segment.inline.type, segment.inline.value),
      );
    }
    cursor = segment.end;
  }

  if (cursor < text.length) {
    appendPlainTextWithLineBreaks(paragraph, text.slice(cursor));
  }
}

/** Serializa párrafo (texto + wiki-links + inline tags) a Markdown en disco. */
export function serializeParagraphContent(paragraph: ElementNode): string {
  let out = "";
  for (const child of paragraph.getChildren()) {
    if ($isWikiLinkNode(child)) {
      out += child.getMarkdownText();
    } else if ($isInlineTimeTagNode(child)) {
      out += child.getMarkdownText();
    } else if ($isLineBreakNode(child)) {
      out += "\n";
    } else if ($isTextNode(child)) {
      out += stripWikiLinkPlaceholders(child.getTextContent());
    }
  }
  return out;
}
