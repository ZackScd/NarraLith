import { describe, expect, it } from "vitest";

import {
  barTimeTagReconcileKey,
  isTimelineMarkerReconciled,
  reconciledKeysFromManuscript,
  timelineReconcileKeyForBarTag,
} from "@/lib/calendar/timeTagReconcile";
import type { ParsedManuscript } from "@/lib/types/manuscript";

describe("timeTagReconcile", () => {
  it("derives editor and timeline keys from persisted barTags", () => {
    const manuscript: ParsedManuscript = {
      filePath: "Manuscrito/A.md",
      format: "eventSegments",
      fileHeader: { title: "A", body: "" },
      segments: [
        {
          kind: "event",
          id: "Manuscrito/A.md::seg::0",
          segmentIndex: 0,
          name: "ev",
          description: "",
          entityPath: "Worldbuilding/Eventos/ev.md",
          barTags: [{ type: "time", value: "1.2.0", calendarReconciled: true }],
          body: "",
          closed: true,
        },
      ],
    };

    const keys = reconciledKeysFromManuscript(manuscript);
    expect(keys).toContain(barTimeTagReconcileKey("Manuscrito/A.md::seg::0", 0));
    expect(keys).toContain(
      timelineReconcileKeyForBarTag("Manuscrito/A.md", 0, "Manuscrito/A.md::seg::0", "1.2.0"),
    );
  });

  it("detects reconciled timeline markers from event flag or session keys", () => {
    const event = {
      path: "Manuscrito/A.md",
      blockIndex: 1,
      rawTime: "1.2.0",
      segmentId: "Manuscrito/A.md::seg::0",
      tagKind: "bar",
      charOffset: null,
      isParallel: false,
      characters: [],
      calendarReconciled: true,
    };
    expect(isTimelineMarkerReconciled(event, new Set())).toBe(true);

    const key = timelineReconcileKeyForBarTag(
      "Manuscrito/A.md",
      0,
      "Manuscrito/A.md::seg::0",
      "1.2.0",
    );
    expect(isTimelineMarkerReconciled({ ...event, calendarReconciled: false }, new Set([key]))).toBe(
      true,
    );
  });
});
