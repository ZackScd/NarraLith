import { describe, expect, it } from "vitest";

import {
  bodyFingerprintFromExtractedManuscript,
  joinManuscriptParagraphLines,
} from "@/lib/editor/documentSync";
import type { SaveManuscriptSegmentPayload } from "@/lib/types/editor";

describe("joinManuscriptParagraphLines", () => {
  it("preserves trailing empty lines", () => {
    expect(joinManuscriptParagraphLines(["texto", "", ""])).toBe("texto\n\n");
  });

  it("preserves whitespace-only lines", () => {
    expect(joinManuscriptParagraphLines(["   ", ""])).toBe("   \n");
  });
});

describe("bodyFingerprintFromExtractedManuscript", () => {
  const baseSegments: SaveManuscriptSegmentPayload[] = [
    { kind: "freeText", segmentIndex: 0, body: "a" },
  ];

  it("detects trailing newline changes", () => {
    const without = bodyFingerprintFromExtractedManuscript("a", baseSegments);
    const withNewline = bodyFingerprintFromExtractedManuscript("a", [
      { kind: "freeText", segmentIndex: 0, body: "a\n" },
    ]);
    expect(withNewline).not.toBe(without);
  });

  it("detects trailing space changes", () => {
    const without = bodyFingerprintFromExtractedManuscript("a", baseSegments);
    const withSpace = bodyFingerprintFromExtractedManuscript("a ", baseSegments);
    expect(withSpace).not.toBe(without);
  });

  it("detects header trailing newlines", () => {
    const plain = bodyFingerprintFromExtractedManuscript("intro", []);
    const trailing = bodyFingerprintFromExtractedManuscript("intro\n\n", []);
    expect(trailing).not.toBe(plain);
  });
});
