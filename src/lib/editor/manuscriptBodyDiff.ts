import { computeDraftAddRanges, type TextRange } from "@/lib/editor/lineDiff";
import type { ParsedManuscript } from "@/lib/types/manuscript";

/** Líneas editables en el mismo orden que los párrafos Lexical (hydrate). */
export function collectEditableLines(manuscript: ParsedManuscript): string[] {
  const lines: string[] = [];

  if (manuscript.fileHeader.body.length > 0) {
    lines.push(...manuscript.fileHeader.body.split("\n"));
  }

  for (const segment of manuscript.segments) {
    if (segment.kind === "freeText") {
      if (segment.body.length > 0) {
        lines.push(...segment.body.split("\n"));
      }
      continue;
    }

    if (segment.body.length === 0) {
      lines.push("");
    } else {
      lines.push(...segment.body.split("\n"));
    }
  }

  if (
    manuscript.fileHeader.body.trim().length === 0 &&
    manuscript.segments.length === 0
  ) {
    lines.push("");
  }

  return lines;
}

/** Índice de párrafo Lexical → rangos de texto añadido en el borrador. */
export function computeParagraphAddRangesFromLines(
  savedLines: string[],
  draftLines: string[],
): Map<number, TextRange[]> {
  const result = new Map<number, TextRange[]>();
  const maxIndex = Math.max(savedLines.length, draftLines.length);

  for (let index = 0; index < maxIndex; index += 1) {
    const draftLine = draftLines[index];
    if (draftLine === undefined) {
      continue;
    }

    const savedLine = savedLines[index];
    if (savedLine === undefined) {
      if (draftLine.length > 0) {
        result.set(index, [{ start: 0, end: draftLine.length }]);
      }
      continue;
    }

    const ranges = computeDraftAddRanges(savedLine, draftLine);
    if (ranges.length > 0) {
      result.set(index, ranges);
    }
  }

  return result;
}
