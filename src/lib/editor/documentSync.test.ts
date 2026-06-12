import { describe, expect, it } from "vitest";

import {
  assertCacheSaveable,
  bodyFingerprintFromExtractedManuscript,
  bodyFingerprintFromManuscript,
  joinManuscriptParagraphLines,
  manuscriptToSavePayload,
} from "@/lib/editor/documentSync";
import type { SaveManuscriptSegmentPayload } from "@/lib/types/editor";
import type { ParsedManuscript } from "@/lib/types/manuscript";

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

describe("manuscriptToSavePayload", () => {
  it("maps event segments for IPC without altering body", () => {
    const manuscript: ParsedManuscript = {
      filePath: "Manuscrito/A.md",
      format: "eventSegments",
      fileHeader: { title: "A", body: "intro\n" },
      segments: [
        {
          kind: "event",
          id: "e1",
          segmentIndex: 0,
          name: "Ev",
          description: "d",
          entityPath: "Worldbuilding/Eventos/Ev.md",
          barTags: [{ type: "time", value: "2026-01-01" }],
          body: "cuerpo\n",
          closed: true,
        },
      ],
    };
    const payload = manuscriptToSavePayload(manuscript);
    expect(payload.fileHeader.body).toBe("intro\n");
    expect(payload.segments[0]).toMatchObject({
      kind: "event",
      name: "Ev",
      body: "cuerpo\n",
      closed: true,
      entityPath: "Worldbuilding/Eventos/Ev.md",
    });
  });
});

describe("assertCacheSaveable", () => {
  const manuscript: ParsedManuscript = {
    filePath: "Manuscrito/A.md",
    format: "eventSegments",
    fileHeader: { title: "A", body: "" },
    segments: [{ kind: "freeText", id: "f", segmentIndex: 0, body: "x" }],
  };

  it("accepts dirty tab with changed fingerprint", () => {
    expect(
      assertCacheSaveable({
        manuscript,
        savedBodyFingerprint: "old",
        isDirty: true,
      }).ok,
    ).toBe(true);
  });

  it("rejects when fingerprint matches baseline", () => {
    const fp = bodyFingerprintFromManuscript(manuscript);
    const result = assertCacheSaveable({
      manuscript,
      savedBodyFingerprint: fp,
      isDirty: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("fingerprint_matches_baseline");
    }
  });
});
