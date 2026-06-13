import { diffChars, diffLines } from "diff";

export type InlinePartKind = "same" | "add" | "remove";

export interface InlineDiffPart {
  type: InlinePartKind;
  text: string;
}

export type DiffRowKind = "unchanged" | "inline" | "added" | "removed";

export interface DiffRow {
  kind: DiffRowKind;
  line?: string;
  parts?: InlineDiffPart[];
}

function chunkToLines(value: string): string[] {
  if (value.length === 0) {
    return [];
  }
  const lines = value.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

export interface TextRange {
  start: number;
  end: number;
}

export function computeDraftAddRanges(savedLine: string, draftLine: string): TextRange[] {
  if (savedLine === draftLine) {
    return [];
  }
  if (savedLine.length === 0 && draftLine.length > 0) {
    return [{ start: 0, end: draftLine.length }];
  }

  const ranges: TextRange[] = [];
  let draftOffset = 0;
  for (const part of charDiffParts(savedLine, draftLine)) {
    if (part.type === "same") {
      draftOffset += part.text.length;
    } else if (part.type === "add") {
      ranges.push({ start: draftOffset, end: draftOffset + part.text.length });
      draftOffset += part.text.length;
    }
  }
  return ranges;
}

function charDiffParts(oldLine: string, newLine: string): InlineDiffPart[] {
  const parts: InlineDiffPart[] = [];
  for (const change of diffChars(oldLine, newLine)) {
    if (change.added) {
      parts.push({ type: "add", text: change.value });
    } else if (change.removed) {
      parts.push({ type: "remove", text: change.value });
    } else {
      parts.push({ type: "same", text: change.value });
    }
  }
  return parts;
}

/** Diff unificado con resaltado inline por carácter. Sin trim — FIX-005. */
export function lineDiff(oldText: string, newText: string): DiffRow[] {
  const changes = diffLines(oldText, newText);
  const rows: DiffRow[] = [];
  let index = 0;

  while (index < changes.length) {
    const current = changes[index];

    if (!current.added && !current.removed) {
      for (const line of chunkToLines(current.value)) {
        rows.push({ kind: "unchanged", line });
      }
      index += 1;
      continue;
    }

    const removedChunks: string[] = [];
    while (index < changes.length && changes[index].removed) {
      removedChunks.push(changes[index].value);
      index += 1;
    }

    const addedChunks: string[] = [];
    while (index < changes.length && changes[index].added) {
      addedChunks.push(changes[index].value);
      index += 1;
    }

    const removedLines = removedChunks.flatMap(chunkToLines);
    const addedLines = addedChunks.flatMap(chunkToLines);
    const paired = Math.min(removedLines.length, addedLines.length);

    for (let pairIndex = 0; pairIndex < paired; pairIndex += 1) {
      rows.push({
        kind: "inline",
        parts: charDiffParts(removedLines[pairIndex], addedLines[pairIndex]),
      });
    }
    for (let extraIndex = paired; extraIndex < removedLines.length; extraIndex += 1) {
      rows.push({ kind: "removed", line: removedLines[extraIndex] });
    }
    for (let extraIndex = paired; extraIndex < addedLines.length; extraIndex += 1) {
      rows.push({ kind: "added", line: addedLines[extraIndex] });
    }
  }

  return rows;
}

export function diffHasChanges(rows: DiffRow[]): boolean {
  return rows.some((row) => row.kind !== "unchanged");
}

export function countDiffLines(rows: DiffRow[]): {
  lineAdds: number;
  lineRemoves: number;
} {
  let lineAdds = 0;
  let lineRemoves = 0;

  for (const row of rows) {
    if (row.kind === "added") {
      lineAdds += 1;
    } else if (row.kind === "removed") {
      lineRemoves += 1;
    } else if (row.kind === "inline") {
      const hasAdd = row.parts?.some((part) => part.type === "add") ?? false;
      const hasRemove = row.parts?.some((part) => part.type === "remove") ?? false;
      if (hasAdd) {
        lineAdds += 1;
      }
      if (hasRemove) {
        lineRemoves += 1;
      }
    }
  }

  return { lineAdds, lineRemoves };
}
