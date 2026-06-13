import { describe, expect, it } from "vitest";

import {
  buildCalendarTimeEntries,
  buildStaleCalendarEntriesOutsideYear,
  isCalendarEntryStale,
} from "@/lib/calendar/calendarEntries";
import { yearsWithFileEntries } from "@/lib/calendar/calendarMarkers";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { TimelineEvent } from "@/lib/types/timeline";

function fourMonthConfig(): CalendarConfig {
  return {
    version: 1,
    epoch: { year: 0, month: 1, day: 1 },
    daysPerWeek: 7,
    hoursPerDay: 24,
    months: [
      { name: "M1", days: 30 },
      { name: "M2", days: 30 },
      { name: "M3", days: 30 },
      { name: "M4", days: 30 },
    ],
    leapRules: { enabled: false, everyYears: 4, extraDays: 1, monthIndex: 0 },
    eras: [],
    annualEvents: [],
  };
}

function fileEvent(rawTime: string, timestamp?: string): TimelineEvent {
  return {
    path: "Manuscrito/test.md",
    blockIndex: 0,
    rawTime,
    timestamp: timestamp ?? null,
    timeHour: null,
    title: null,
    segmentId: null,
    tagKind: "inline",
    charOffset: 0,
    isParallel: false,
    characters: [],
  };
}

describe("buildCalendarTimeEntries", () => {
  it("incluye marcas structure_stale del año visible con timeStatus", () => {
    const baseline = fourMonthConfig();
    const active: CalendarConfig = {
      ...baseline,
      months: [
        baseline.months[0]!,
        baseline.months[1]!,
        { name: "Inserted", days: 30 },
        baseline.months[2]!,
        baseline.months[3]!,
      ],
    };
    const events = [fileEvent("15.4.0")];
    const entries = buildCalendarTimeEntries(0, events, active, undefined, baseline);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.timeStatus).toBe("structure_stale");
    expect(isCalendarEntryStale(entries[0]!)).toBe(true);
  });

  it("lista marcas stale fuera del año visible por separado", () => {
    const config: CalendarConfig = {
      ...fourMonthConfig(),
      months: [{ name: "M1", days: 30 }],
    };
    const events = [fileEvent("15.2.0", "4000")];
    const inYear = buildCalendarTimeEntries(0, events, config, undefined, null);
    const outside = buildStaleCalendarEntriesOutsideYear(0, events, config, undefined, null);

    expect(inYear).toHaveLength(0);
    expect(outside).toHaveLength(1);
    expect(outside[0]?.timeStatus).toBe("invalid");
  });

  it("yearsWithFileEntries no lanza (regresión resolveTimeSortKey)", () => {
    const config = fourMonthConfig();
    const events = [fileEvent("15.1.0", "100")];
    expect(() => yearsWithFileEntries(events, config)).not.toThrow();
    expect(yearsWithFileEntries(events, config).length).toBeGreaterThan(0);
  });
});
