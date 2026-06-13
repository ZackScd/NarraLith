import { describe, expect, it } from "vitest";

import { MAX_ABS_DAY } from "@/lib/calendar/engine";
import { resolveMarkerPlacement } from "@/lib/calendar/markerPlacement";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { TimelineEvent } from "@/lib/types/timeline";

const blankConfig: CalendarConfig = {
  version: 1,
  epoch: { year: 0, month: 1, day: 1 },
  daysPerWeek: 7,
  hoursPerDay: 24,
  months: [{ name: "Mes 1", days: 30 }],
  leapRules: { enabled: false, everyYears: 4, extraDays: 1, monthIndex: 0 },
  eras: [],
  annualEvents: [],
};

function marker(
  overrides: Partial<TimelineEvent> & Pick<TimelineEvent, "path" | "blockIndex" | "rawTime">,
): TimelineEvent {
  return {
    isParallel: false,
    characters: [],
    ...overrides,
  };
}

describe("resolveMarkerPlacement", () => {
  it("usa clave sintética acotada para marcas inválidas sin timestamp", () => {
    const placement = resolveMarkerPlacement(
      marker({
        path: "Manuscrito/x.md",
        blockIndex: 0,
        rawTime: "14.7.15",
      }),
      blankConfig,
      blankConfig,
    );

    expect(placement?.timeStatus).toBe("invalid");
    expect(placement!.sortKey).toBeLessThanOrEqual(BigInt(MAX_ABS_DAY));
    expect(placement!.sortKey).toBeGreaterThan(0n);
  });

  it("treats reconciled stale markers as valid", () => {
    const baseline = blankConfig;
    const active: CalendarConfig = {
      ...baseline,
      epoch: { year: 0, month: 1, day: 2 },
    };
    const placement = resolveMarkerPlacement(
      marker({
        path: "Manuscrito/x.md",
        blockIndex: 1,
        rawTime: "15.1.0",
      }),
      active,
      baseline,
      true,
    );

    expect(placement?.timeStatus).toBe("valid");
  });
});
