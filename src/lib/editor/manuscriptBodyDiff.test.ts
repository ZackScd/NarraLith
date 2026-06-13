import { describe, expect, it } from "vitest";

import { computeDraftAddRanges } from "@/lib/editor/lineDiff";
import {
  collectEditableLines,
  computeParagraphAddRangesFromLines,
} from "@/lib/editor/manuscriptBodyDiff";
import type { ParsedManuscript } from "@/lib/types/manuscript";

describe("computeDraftAddRanges", () => {
  it("returns only added suffix ranges", () => {
    const ranges = computeDraftAddRanges("hola que tal", "hola que talsaasasasas   editdsdsdsd");
    expect(ranges.length).toBeGreaterThan(0);
    const draft = "hola que talsaasasasas   editdsdsdsd";
    for (const range of ranges) {
      expect(draft.slice(range.start, range.end).length).toBeGreaterThan(0);
    }
  });
});

describe("computeParagraphAddRangesFromLines", () => {
  it("maps paragraph index to inline add ranges", () => {
    const ranges = computeParagraphAddRangesFromLines(
      ["hola que tal"],
      ["hola que talsaasasasas   editdsdsdsd"],
    );
    expect(ranges.has(0)).toBe(true);
  });
});

describe("collectEditableLines", () => {
  it("mirrors hydrate order for free text", () => {
    const manuscript: ParsedManuscript = {
      filePath: "Manuscrito/a.md",
      format: "eventSegments",
      fileHeader: { title: "a", body: "" },
      segments: [{ kind: "freeText", id: "f1", segmentIndex: 0, body: "linea\n" }],
    };
    expect(collectEditableLines(manuscript)).toEqual(["linea", ""]);
  });
});
