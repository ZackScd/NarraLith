import { describe, expect, it } from "vitest";

import {
  calendarStructuralDiff,
  countAffectedTimeMarkers,
} from "@/lib/calendar/calendarStructuralDiff";
import type { CalendarConfig } from "@/lib/types/calendar";

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

describe("calendarStructuralDiff", () => {
  it("returns empty diff when disk and draft match", () => {
    const config = fourMonthConfig();
    const diff = calendarStructuralDiff(config, structuredClone(config));
    expect(diff.changes).toHaveLength(0);
    expect(diff.isStructural).toBe(false);
    expect(diff.affectsTimeMarkers).toBe(false);
  });

  it("ignores cosmetic month rename", () => {
    const disk = fourMonthConfig();
    const draft: CalendarConfig = {
      ...disk,
      months: disk.months.map((month, index) =>
        index === 1 ? { ...month, name: "Renamed" } : month,
      ),
    };

    const diff = calendarStructuralDiff(disk, draft, {
      baselineConfig: disk,
      timelineRawTimes: ["15.2.0"],
    });

    expect(diff.changes).toHaveLength(0);
    expect(diff.isStructural).toBe(false);
    expect(diff.affectsTimeMarkers).toBe(false);
  });

  it("detects inserted month (010a §3)", () => {
    const disk = fourMonthConfig();
    const draft: CalendarConfig = {
      ...disk,
      months: [
        disk.months[0]!,
        disk.months[1]!,
        { name: "Inserted", days: 30 },
        disk.months[2]!,
        disk.months[3]!,
      ],
    };

    const diff = calendarStructuralDiff(disk, draft, {
      baselineConfig: disk,
      timelineRawTimes: ["10.1.0", "15.4.0"],
    });

    expect(diff.isStructural).toBe(true);
    expect(diff.changes.some((change) => change.kind === "month_added")).toBe(true);
    expect(diff.affectsTimeMarkers).toBe(true);
    expect(diff.affectedMarkerCount).toBe(1);
    expect(countAffectedTimeMarkers(draft, disk, ["15.4.0"], { structuralEdit: true })).toBe(1);
    expect(countAffectedTimeMarkers(draft, disk, ["10.1.0"], { structuralEdit: true })).toBe(0);
  });

  it("detects removed month (010a §3.1)", () => {
    const disk = fourMonthConfig();
    const draft: CalendarConfig = {
      ...disk,
      months: [disk.months[0]!, disk.months[2]!, disk.months[3]!],
    };

    const diff = calendarStructuralDiff(disk, draft, {
      baselineConfig: disk,
      timelineRawTimes: ["14.4.0", "15.1.0"],
    });

    expect(diff.isStructural).toBe(true);
    expect(diff.changes.some((change) => change.kind === "month_removed")).toBe(true);
    expect(diff.affectsTimeMarkers).toBe(true);
    expect(diff.affectedMarkerCount).toBe(1);
  });

  it("detects month days change", () => {
    const disk = fourMonthConfig();
    const draft: CalendarConfig = {
      ...disk,
      months: disk.months.map((month, index) =>
        index === 1 ? { ...month, days: 28 } : month,
      ),
    };

    const diff = calendarStructuralDiff(disk, draft, {
      baselineConfig: disk,
      timelineRawTimes: ["15.2.0"],
    });

    expect(diff.changes.some((change) => change.kind === "month_days_changed")).toBe(true);
    expect(diff.isStructural).toBe(true);
  });

  it("detects epoch change as structural", () => {
    const disk = fourMonthConfig();
    const draft: CalendarConfig = {
      ...disk,
      epoch: { year: 0, month: 1, day: 2 },
    };

    const diff = calendarStructuralDiff(disk, draft, {
      baselineConfig: disk,
      timelineRawTimes: ["15.1.0"],
    });

    expect(diff.changes.some((change) => change.kind === "epoch_changed")).toBe(true);
    expect(diff.affectsTimeMarkers).toBe(true);
  });

  it("detects week grid change", () => {
    const disk = fourMonthConfig();
    const draft: CalendarConfig = { ...disk, daysPerWeek: 8 };

    const diff = calendarStructuralDiff(disk, draft);

    expect(diff.changes.some((change) => change.kind === "week_grid_changed")).toBe(true);
    expect(diff.isStructural).toBe(true);
  });

  it("detects removed special year cycle", () => {
    const disk = fourMonthConfig();
    disk.specialYearsEnabled = true;
    disk.specialYearCycles = [
      {
        id: "sy-1",
        name: "Ciclo lunar",
        intervalYears: 3,
        startsAtYear: 0,
        syncFromBase: true,
        months: disk.months,
      },
    ];
    const draft: CalendarConfig = {
      ...disk,
      specialYearCycles: [],
    };

    const diff = calendarStructuralDiff(disk, draft);

    expect(diff.changes.some((change) => change.kind === "special_year_removed")).toBe(true);
  });
});
