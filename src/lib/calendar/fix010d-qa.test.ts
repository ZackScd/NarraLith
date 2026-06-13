/**
 * FIX-010d §8.2 — escenario canónico stale + reconciliación manual (QA D3).
 * Cubre editor (classify), timeline (markerPlacement) y calendario (entries).
 */
import { describe, expect, it } from "vitest";

import { classifyTimeTag } from "@/lib/calendar/classifyTimeTag";
import {
  buildCalendarTimeEntries,
  isCalendarEntryStale,
} from "@/lib/calendar/calendarEntries";
import { resolveMarkerPlacement } from "@/lib/calendar/markerPlacement";
import {
  barTimeTagReconcileKey,
  reconciledKeysFromManuscript,
  timelineReconcileKeyForBarTag,
} from "@/lib/calendar/timeTagReconcile";
import { buildTimelineItems } from "@/modules/timeline/timelineModel";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { ParsedManuscript } from "@/lib/types/manuscript";
import type { TimelineEvent } from "@/lib/types/timeline";
import type { TimelineFilterState } from "@/stores/useTimelineStore";

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

function activeWithInsertedMonth(baseline: CalendarConfig): CalendarConfig {
  return {
    ...baseline,
    months: [
      baseline.months[0]!,
      baseline.months[1]!,
      { name: "Inserted", days: 30 },
      baseline.months[2]!,
      baseline.months[3]!,
    ],
  };
}

const filters: TimelineFilterState = {
  manuscript: true,
  events: true,
  festivals: true,
  anniversaries: true,
  cosmic: true,
};

function barEvent(
  filePath: string,
  segmentIndex: number,
  rawTime: string,
  calendarReconciled = false,
): TimelineEvent {
  const segmentId = `${filePath}::seg::${segmentIndex}`;
  return {
    path: filePath,
    blockIndex: segmentIndex + 1,
    rawTime,
    segmentId,
    tagKind: "bar",
    charOffset: null,
    title: "Escena",
    isParallel: false,
    characters: [],
    calendarReconciled,
  };
}

describe("FIX-010d QA D3 — stale edit + reconciliación barTag", () => {
  const baseline = fourMonthConfig();
  const active = activeWithInsertedMonth(baseline);
  const staleRaw = "15.4.0";
  const filePath = "Manuscrito/Volumen 1/Escena_1.md";
  const segmentIndex = 0;

  it("D3 pre: marca stale bajo calendario editado", () => {
    expect(classifyTimeTag(staleRaw, active, baseline).status).toBe("structure_stale");
    const placement = resolveMarkerPlacement(
      barEvent(filePath, segmentIndex, staleRaw),
      active,
      baseline,
    );
    expect(placement?.timeStatus).toBe("structure_stale");
  });

  it("D3a: chip editor normal tras calendarReconciled", () => {
    expect(
      classifyTimeTag(staleRaw, active, baseline, { calendarReconciled: true }).status,
    ).toBe("valid");
  });

  it("D3b: timeline sin rojo con flag SQLite o claves sesión", () => {
    const event = barEvent(filePath, segmentIndex, staleRaw, true);
    const placement = resolveMarkerPlacement(event, active, baseline);
    expect(placement?.timeStatus).toBe("valid");

    const sessionKeys = new Set([
      timelineReconcileKeyForBarTag(filePath, segmentIndex, event.segmentId!, staleRaw),
    ]);
    const items = buildTimelineItems([event], active, filters, baseline, sessionKeys);
    expect(items).toHaveLength(1);
    expect(items[0]?.timeStatus).toBe("valid");
  });

  it("D3c: calendario / mini-timeline sin rojo", () => {
    const event = barEvent(filePath, segmentIndex, staleRaw, true);
    const keys = new Set([
      timelineReconcileKeyForBarTag(filePath, segmentIndex, event.segmentId!, staleRaw),
    ]);
    const entries = buildCalendarTimeEntries(0, [event], active, undefined, baseline, keys);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.timeStatus).toBe("valid");
    expect(isCalendarEntryStale(entries[0]!)).toBe(false);
  });

  it("D3d: claves persistidas desde YAML barTag tras save", () => {
    const manuscript: ParsedManuscript = {
      filePath,
      format: "eventSegments",
      fileHeader: { title: "Escena_1", body: "" },
      segments: [
        {
          kind: "event",
          id: `${filePath}::seg::0`,
          segmentIndex: 0,
          name: "Escena",
          description: "",
          entityPath: "Worldbuilding/Eventos/x.md",
          barTags: [{ type: "time", value: staleRaw, calendarReconciled: true }],
          body: "",
          closed: true,
        },
      ],
    };

    const keys = new Set(reconciledKeysFromManuscript(manuscript));
    expect(keys.has(barTimeTagReconcileKey(`${filePath}::seg::0`, 0))).toBe(true);
    expect(
      keys.has(timelineReconcileKeyForBarTag(filePath, segmentIndex, `${filePath}::seg::0`, staleRaw)),
    ).toBe(true);

    const event = barEvent(filePath, segmentIndex, staleRaw, true);
    const items = buildTimelineItems([event], active, filters, baseline, keys);
    expect(items[0]?.timeStatus).toBe("valid");
  });
});
