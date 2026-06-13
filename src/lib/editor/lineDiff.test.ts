import { describe, expect, it } from "vitest";

import { countDiffLines, diffHasChanges, lineDiff } from "@/lib/editor/lineDiff";

describe("lineDiff", () => {
  it("marks wholly added lines", () => {
    const rows = lineDiff("a\n", "a\nb\n");
    expect(rows).toEqual([
      { kind: "unchanged", line: "a" },
      { kind: "added", line: "b" },
    ]);
  });

  it("marks wholly removed lines", () => {
    const rows = lineDiff("a\nb\n", "a\n");
    expect(rows).toEqual([
      { kind: "unchanged", line: "a" },
      { kind: "removed", line: "b" },
    ]);
  });

  it("highlights inline edits within a single line", () => {
    const rows = lineDiff("hola que tal", "hola que talsaasasasas   editdsdsdsd");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.kind).toBe("inline");
    const parts = rows[0]?.parts ?? [];
    expect(parts.some((part) => part.type === "add")).toBe(true);
    expect(parts.some((part) => part.type === "same")).toBe(true);
    const draftText = parts
      .filter((part) => part.type !== "remove")
      .map((part) => part.text)
      .join("");
    expect(draftText).toBe("hola que talsaasasasas   editdsdsdsd");
  });

  it("preserves trailing empty lines (FIX-005)", () => {
    const rows = lineDiff("texto\n", "texto\n\n");
    expect(rows).toEqual([
      { kind: "unchanged", line: "texto" },
      { kind: "added", line: "" },
    ]);
  });

  it("preserves whitespace-only lines", () => {
    const rows = lineDiff("a\n", "a\n   \n");
    expect(rows[1]).toEqual({ kind: "added", line: "   " });
  });

  it("returns no changes when texts match", () => {
    const text = "intro\n\n";
    const rows = lineDiff(text, text);
    expect(diffHasChanges(rows)).toBe(false);
    expect(countDiffLines(rows)).toEqual({ lineAdds: 0, lineRemoves: 0 });
  });
});
