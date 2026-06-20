import { describe, expect, it } from "vitest";

import { filterOccurrencesAtT, mergeOccurrencesWithPins } from "@/lib/maps/mapLocationAtT";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { MapLocationPinV1, ProjectLocationOccurrenceV1 } from "@/lib/types/mapLocations";

function sampleCalendar(): CalendarConfig {
  return {
    version: 1,
    epoch: { year: 1, month: 1, day: 1 },
    daysPerWeek: 7,
    hoursPerDay: 24,
    months: [
      { name: "Jan", days: 31 },
      { name: "Feb", days: 28 },
      { name: "Mar", days: 31 },
      { name: "Apr", days: 30 },
      { name: "May", days: 31 },
      { name: "Jun", days: 30 },
      { name: "Jul", days: 31 },
      { name: "Aug", days: 31 },
      { name: "Sep", days: 30 },
      { name: "Oct", days: 31 },
      { name: "Nov", days: 30 },
      { name: "Dec", days: 31 },
    ],
    leapRules: { enabled: false, everyYears: 4, extraDays: 1, monthIndex: 0 },
    eras: [],
    annualEvents: [],
  };
}

function occurrence(
  key: string,
  time: string,
  label: string,
): ProjectLocationOccurrenceV1 {
  return {
    id: `id-${key}`,
    locationKey: key,
    label,
    effectiveTimeRaw: time,
    effectiveTimestamp: null,
    sourcePath: "Manuscrito/A.md",
    segmentId: "seg-0",
    tagKind: "bar",
  };
}

describe("filterOccurrencesAtT", () => {
  it("filtra por día absoluto", () => {
    const calendar = sampleCalendar();
    const all = [
      occurrence("a", "10.1.2020", "A"),
      occurrence("c", "15.7.2025", "C"),
    ];
    const filtered = filterOccurrencesAtT(all, "15.7.2025", calendar);
    expect(filtered.map((item) => item.locationKey)).toEqual(["c"]);
  });
});

describe("mergeOccurrencesWithPins", () => {
  it("dedupe keys y lista unpinned", () => {
    const pins: MapLocationPinV1[] = [
      {
        id: "pin-1",
        locationKey: "a",
        x: 10,
        y: 20,
        updatedAt: "now",
      },
    ];
    const { markers, unpinnedKeys } = mergeOccurrencesWithPins(
      [occurrence("a", "15.7.2025", "A"), occurrence("b", "15.7.2025", "B")],
      pins,
    );
    expect(markers).toHaveLength(1);
    expect(markers[0]?.x).toBe(10);
    expect(unpinnedKeys).toEqual(["b"]);
  });
});
