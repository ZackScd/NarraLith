import { describe, expect, it } from "vitest";

import { computeMapTimelineRange } from "@/lib/maps/mapTimelineRange";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { MapSecondarySummaryV1 } from "@/lib/types/maps";

function sampleConfig(): CalendarConfig {
  return {
    version: 1,
    epoch: { year: 1, month: 1, day: 1 },
    daysPerWeek: 7,
    hoursPerDay: 24,
    months: [{ name: "Mes1", days: 30 }],
    leapRules: { enabled: false, everyYears: 4, extraDays: 1, monthIndex: 0 },
    eras: [],
    annualEvents: [],
  };
}

function summary(
  id: string,
  tiempoInicio: string,
  tiempoFin?: string | null,
): MapSecondarySummaryV1 {
  return {
    id,
    name: id,
    tiempoInicio,
    tiempoFin: tiempoFin ?? null,
    updatedAt: "0",
  };
}

describe("computeMapTimelineRange", () => {
  const config = sampleConfig();

  it("incluye desde, parches y preview con padding", () => {
    const range = computeMapTimelineRange(
      "1.1.2000",
      [summary("a", "1.1.2015"), summary("b", "1.1.2028", "1.1.2030")],
      "1.1.2020",
      config,
      { paddingDays: 30 },
    );
    expect(range.desdeDay).not.toBeNull();
    expect(range.secondaryAnchors).toHaveLength(2);
    expect(range.minDay < range.maxDay).toBe(true);
    expect(range.minDay).toBeLessThan(range.desdeDay!);
    expect(range.maxDay).toBeGreaterThan(
      range.secondaryAnchors.find((a) => a.id === "b")!.finDay!,
    );
  });

  it("fallback a epoch si no hay fechas parseables", () => {
    const range = computeMapTimelineRange(null, [], null, config, { paddingDays: 100 });
    expect(range.minDay).toBeGreaterThanOrEqual(0n);
    expect(range.maxDay).toBeGreaterThan(range.minDay);
    expect(range.desdeDay).toBeNull();
  });
});
