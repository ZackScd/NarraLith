import {
  $getRoot,
  $isLineBreakNode,
  $isParagraphNode,
  $isTextNode,
  type LexicalEditor,
  type LexicalNode,
  type ParagraphNode,
  type TextNode,
} from "lexical";

import {
  collectEditableLines,
  computeParagraphAddRangesFromLines,
} from "@/lib/editor/manuscriptBodyDiff";
import { serializeParagraphContent } from "@/lib/editor/paragraphContent";
import type { TextRange } from "@/lib/editor/lineDiff";
import type { ParsedManuscript } from "@/lib/types/manuscript";
import {
  $isInlineTimeTagNode,
} from "@/modules/editor/nodes/InlineTimeTagNode";
import { $isWikiLinkNode } from "@/modules/editor/nodes/WikiLinkNode";

export const DIRTY_DIFF_TAG = "narra-dirty-diff";

const DIRTY_DIFF_STYLE =
  "background-color: rgba(250, 204, 21, 0.55); border-radius: 2px;";

function collectLexicalParagraphLines(): string[] {
  const lines: string[] = [];
  for (const child of $getRoot().getChildren()) {
    if ($isParagraphNode(child)) {
      lines.push(serializeParagraphContent(child));
    }
  }
  return lines;
}

function nodeTextLength(node: LexicalNode): number {
  if ($isTextNode(node) || $isWikiLinkNode(node) || $isInlineTimeTagNode(node)) {
    return node.getTextContent().length;
  }
  if ($isLineBreakNode(node)) {
    return 1;
  }
  return 0;
}

function isDirtyDiffStyled(node: TextNode): boolean {
  return node.getStyle().includes("background-color: rgba(250, 204, 21");
}

function clearDirtyDiffStyle(node: TextNode): void {
  if (isDirtyDiffStyled(node)) {
    node.setStyle("");
  }
}

function setDirtyDiffStyle(node: TextNode): void {
  node.setStyle(DIRTY_DIFF_STYLE);
}

export function clearDirtyDiffHighlights(): void {
  for (const child of $getRoot().getChildren()) {
    if (!$isParagraphNode(child)) {
      continue;
    }
    for (const node of child.getChildren()) {
      if ($isTextNode(node)) {
        clearDirtyDiffStyle(node);
      }
    }
  }
}

function highlightTextNodeRange(node: TextNode, start: number, end: number): void {
  const textLength = node.getTextContent().length;
  if (start >= end || textLength === 0) {
    return;
  }

  if (start <= 0 && end >= textLength) {
    setDirtyDiffStyle(node);
    return;
  }

  let target = node;
  if (end < textLength) {
    const splitAtEnd = target.splitText(end);
    target = splitAtEnd[0];
  }
  if (start > 0) {
    const splitAtStart = target.splitText(start);
    target = splitAtStart.length > 1 ? splitAtStart[1] : splitAtStart[0];
  }
  setDirtyDiffStyle(target);
}

function highlightRangeInParagraph(paragraph: ParagraphNode, range: TextRange): void {
  let offset = 0;
  for (const child of paragraph.getChildren()) {
    const length = nodeTextLength(child);
    if (length === 0) {
      continue;
    }

    const childStart = offset;
    const childEnd = offset + length;
    offset = childEnd;

    if (range.end <= childStart || range.start >= childEnd) {
      continue;
    }

    if (!$isTextNode(child)) {
      continue;
    }

    const localStart = Math.max(0, range.start - childStart);
    const localEnd = Math.min(length, range.end - childStart);
    highlightTextNodeRange(child, localStart, localEnd);
  }
}

export function listDirtyDiffRegions(
  saved: ParsedManuscript,
): Array<{ paragraphIndex: number; from: number; to: number }> {
  const savedLines = collectEditableLines(saved);
  const draftLines = collectLexicalParagraphLines();
  const rangesByParagraph = computeParagraphAddRangesFromLines(savedLines, draftLines);
  const regions: Array<{ paragraphIndex: number; from: number; to: number }> = [];

  for (const [paragraphIndex, ranges] of rangesByParagraph.entries()) {
    for (const range of ranges) {
      regions.push({ paragraphIndex, from: range.start, to: range.end });
    }
  }

  return regions;
}

export function applyDirtyDiffHighlights(saved: ParsedManuscript): void {
  clearDirtyDiffHighlights();

  const savedLines = collectEditableLines(saved);
  const draftLines = collectLexicalParagraphLines();
  const rangesByParagraph = computeParagraphAddRangesFromLines(savedLines, draftLines);

  let paragraphIndex = 0;
  for (const child of $getRoot().getChildren()) {
    if (!$isParagraphNode(child)) {
      continue;
    }

    const ranges = rangesByParagraph.get(paragraphIndex);
    if (ranges) {
      for (const range of ranges) {
        highlightRangeInParagraph(child, range);
      }
    }
    paragraphIndex += 1;
  }
}

export function refreshDirtyDiffHighlights(
  editor: LexicalEditor,
  saved: ParsedManuscript,
): void {
  editor.update(
    () => {
      applyDirtyDiffHighlights(saved);
    },
    { tag: DIRTY_DIFF_TAG },
  );
}
