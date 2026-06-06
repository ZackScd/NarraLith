import { describe, expect, it } from "vitest";

import {
  formatTimeTag,
  formatTimeTagDisplay,
  parseTimeTag,
} from "@/lib/calendar/dateTags";

describe("formatTimeTagDisplay", () => {
  it("formats date as AAAA-MM-DD with hyphens", () => {
    expect(formatTimeTagDisplay({ day: 11, month: 9, year: 2026 })).toBe("2026-09-11");
  });

  it("pads month and day to two digits", () => {
    expect(formatTimeTagDisplay({ day: 3, month: 3, year: 2050 })).toBe("2050-03-03");
  });

  it("appends hour as HH:00 when includeHour and hour are set", () => {
    expect(
      formatTimeTagDisplay(
        { day: 11, month: 9, year: 2026 },
        { hour: 9, includeHour: true },
      ),
    ).toBe("2026-09-11 / 09:00");
  });

  it("omits hour when includeHour is false", () => {
    expect(
      formatTimeTagDisplay(
        { day: 11, month: 9, year: 2026 },
        { hour: 9, includeHour: false },
      ),
    ).toBe("2026-09-11");
  });

  it("omits hour when hour is null", () => {
    expect(
      formatTimeTagDisplay(
        { day: 11, month: 9, year: 2026 },
        { hour: null, includeHour: true },
      ),
    ).toBe("2026-09-11");
  });
});

describe("formatTimeTag storage format", () => {
  it("round-trips with parseTimeTag", () => {
    const parts = { day: 11, month: 9, year: 2026 };
    expect(parseTimeTag(formatTimeTag(parts))).toEqual(parts);
  });
});
