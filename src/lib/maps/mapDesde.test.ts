import { describe, expect, it } from "vitest";

import {
  formatMapDesdeDisplay,
  parseMapDesde,
  resolveDefaultMapDesde,
} from "@/lib/maps/mapDesde";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { TimelineEvent } from "@/lib/types/timeline";

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

function timelineEvent(rawTime: string, path = "ms/a.md"): TimelineEvent {
  return {
    path,
    blockIndex: 0,
    title: path,
    rawTime,
    isParallel: false,
    characters: [],
    persistedAt: 0,
  };
}

describe("parseMapDesde", () => {
  it("parsea d.m.yyyy", () => {
    expect(parseMapDesde("15.3.2000")).toEqual({ day: 15, month: 3, year: 2000 });
  });

  it("devuelve null para valores inválidos", () => {
    expect(parseMapDesde(null)).toBeNull();
    expect(parseMapDesde("invalid")).toBeNull();
  });
});

describe("formatMapDesdeDisplay", () => {
  it("formatea fecha legible", () => {
    expect(formatMapDesdeDisplay("15.3.2000")).toBe("2000-03-15");
  });
});

describe("resolveDefaultMapDesde", () => {
  it("elige la marca cronológicamente más temprana", () => {
    const config = sampleConfig();
    const events = [
      timelineEvent("10.5.2010", "late.md"),
      timelineEvent("1.1.1950", "early.md"),
      timelineEvent("20.6.2000", "mid.md"),
    ];
    const result = resolveDefaultMapDesde(events, config);
    expect(result.raw).toBe("1.1.1950");
    expect(result.source).toBe("timeline");
  });

  it("usa epoch si no hay marcas válidas", () => {
    const config = sampleConfig();
    const result = resolveDefaultMapDesde([], config);
    expect(result.raw).toBe("1.1.1");
    expect(result.source).toBe("epoch");
  });
});
