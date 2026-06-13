import { describe, expect, it } from "vitest";

import { classifyTimeTag } from "@/lib/calendar/classifyTimeTag";
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

describe("classifyTimeTag", () => {
  it("marks syntax-invalid tags", () => {
    const config = fourMonthConfig();
    expect(classifyTimeTag("foo", config).status).toBe("invalid");
    expect(classifyTimeTag("31.2.0", config).status).toBe("invalid");
  });

  it("marks valid instant tags", () => {
    const config = fourMonthConfig();
    expect(classifyTimeTag("15.1.0", config).status).toBe("valid");
  });

  it("leaves mythic and unknown unmarked", () => {
    const config = fourMonthConfig();
    expect(classifyTimeTag("mythic", config).status).toBe("mythic");
    expect(classifyTimeTag("unknown", config).status).toBe("unknown");
  });

  it("detects structure_stale when month name shifts (inserted month)", () => {
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

    expect(classifyTimeTag("10.1.0", active, baseline).status).toBe("valid");
    expect(classifyTimeTag("15.4.0", active, baseline).status).toBe("structure_stale");
  });

  it("detects structure_stale when absoluteDay shifts (epoch)", () => {
    const baseline = fourMonthConfig();
    const active: CalendarConfig = {
      ...baseline,
      epoch: { year: 0, month: 1, day: 2 },
    };

    expect(classifyTimeTag("15.1.0", active, baseline).status).toBe("structure_stale");
  });

  it("treats as valid without baseline config", () => {
    const config = fourMonthConfig();
    expect(classifyTimeTag("15.3.0", config, null).status).toBe("valid");
  });

  it("treats calendarReconciled as valid against baseline", () => {
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

    expect(
      classifyTimeTag("15.4.0", active, baseline, { calendarReconciled: true }).status,
    ).toBe("valid");
  });
});
