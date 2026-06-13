import { describe, expect, it } from "vitest";

import type { CalendarConfig } from "@/lib/types/calendar";
import type { TimelineEvent } from "@/lib/types/timeline";
import type { TimelineFilterState } from "@/stores/useTimelineStore";
import {
  buildEventSpanLinks,
  buildTimelineItems,
  type PlacedTimelineItem,
} from "@/modules/timeline/timelineModel";

const sampleConfig: CalendarConfig = {
  version: 1,
  epoch: { year: 0, month: 1, day: 1 },
  daysPerWeek: 7,
  hoursPerDay: 24,
  months: [
    { name: "Spring", days: 30 },
    { name: "Summer", days: 30 },
    { name: "Autumn", days: 31 },
    { name: "Winter", days: 29 },
  ],
  leapRules: {
    enabled: true,
    everyYears: 4,
    extraDays: 1,
    monthIndex: 3,
  },
  eras: [],
  annualEvents: [],
};

const allFilters: TimelineFilterState = {
  manuscript: true,
  events: true,
  festivals: true,
  anniversaries: true,
  cosmic: true,
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

function placed(
  item: Omit<PlacedTimelineItem, "x" | "y" | "width" | "timeStatus" | "rawTime"> &
    Partial<Pick<PlacedTimelineItem, "x" | "y" | "width" | "timeStatus" | "rawTime">>,
): PlacedTimelineItem {
  return {
    ...item,
    x: item.x ?? 0,
    y: item.y ?? 0,
    width: item.width ?? 80,
    timeStatus: item.timeStatus ?? "valid",
    rawTime: item.rawTime ?? "",
  };
}

describe("buildTimelineItems", () => {
  it("asigna chip dual con segmentId y title", () => {
    const events = [
      marker({
        path: "Manuscrito/meow.md",
        blockIndex: 1,
        rawTime: "17.1.100",
        segmentId: "Manuscrito/meow.md::seg::0",
        title: "eventTest",
        tagKind: "bar",
      }),
    ];

    const items = buildTimelineItems(events, sampleConfig, allFilters);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      fileLabel: "meow",
      eventLabel: "eventTest",
      segmentId: "Manuscrito/meow.md::seg::0",
      label: "eventTest (meow)",
      lane: "manuscript",
    });
  });

  it("usa chip simple sin segmentId", () => {
    const events = [
      marker({
        path: "Manuscrito/header.md",
        blockIndex: 0,
        rawTime: "1.1.100",
        title: "ignored",
      }),
    ];

    const items = buildTimelineItems(events, sampleConfig, allFilters);
    expect(items[0]).toMatchObject({
      fileLabel: "header",
      eventLabel: null,
      segmentId: null,
      label: "header",
    });
  });

  it("usa chip simple con segmentId pero sin title", () => {
    const events = [
      marker({
        path: "Manuscrito/scene.md",
        blockIndex: 1,
        rawTime: "2.1.100",
        segmentId: "Manuscrito/scene.md::seg::0",
      }),
    ];

    const items = buildTimelineItems(events, sampleConfig, allFilters);
    expect(items[0]?.eventLabel).toBeNull();
    expect(items[0]?.label).toBe("scene");
  });

  it("incluye marcas invalid con timestamp en lugar de omitirlas", () => {
    const events = [
      marker({
        path: "Manuscrito/stale.md",
        blockIndex: 0,
        rawTime: "not-a-date",
        timestamp: "12345",
      }),
    ];

    const items = buildTimelineItems(events, sampleConfig, allFilters);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      timeStatus: "invalid",
      sortKey: 12345n,
    });
  });

  it("marca structure_stale sin omitir del timeline", () => {
    const baseline = sampleConfig;
    const active: CalendarConfig = {
      ...sampleConfig,
      epoch: { year: 0, month: 1, day: 2 },
    };
    const events = [
      marker({
        path: "Manuscrito/shift.md",
        blockIndex: 0,
        rawTime: "15.1.100",
      }),
    ];

    const items = buildTimelineItems(events, active, allFilters, baseline);
    expect(items).toHaveLength(1);
    expect(items[0]?.timeStatus).toBe("structure_stale");
  });

  it("omite solo marcas sin rawTime", () => {
    const events = [
      marker({
        path: "Manuscrito/empty.md",
        blockIndex: 0,
        rawTime: "",
      }),
    ];

    expect(buildTimelineItems(events, sampleConfig, allFilters)).toHaveLength(0);
  });
});

describe("buildEventSpanLinks", () => {
  const segment = "Manuscrito/meow.md::seg::0";

  it("genera un link entre dos marcas del mismo segmento y lane", () => {
    const items = [
      placed({
        id: "a",
        kind: "file",
        label: "eventTest (meow)",
        fileLabel: "meow",
        eventLabel: "eventTest",
        segmentId: segment,
        sortKey: 100n,
        lane: "manuscript",
        tagKind: "bar",
      }),
      placed({
        id: "b",
        kind: "file",
        label: "eventTest (meow)",
        fileLabel: "meow",
        eventLabel: "eventTest",
        segmentId: segment,
        sortKey: 101n,
        lane: "manuscript",
        tagKind: "inline",
        charOffset: 5,
      }),
    ];

    expect(buildEventSpanLinks(items, true)).toEqual([
      { segmentId: segment, fromId: "a", toId: "b" },
    ]);
  });

  it("genera dos links para tres marcas consecutivas", () => {
    const items = [
      placed({
        id: "a",
        kind: "file",
        label: "e (m)",
        fileLabel: "m",
        eventLabel: "e",
        segmentId: segment,
        sortKey: 1n,
        lane: "manuscript",
        tagKind: "bar",
      }),
      placed({
        id: "b",
        kind: "file",
        label: "e (m)",
        fileLabel: "m",
        eventLabel: "e",
        segmentId: segment,
        sortKey: 2n,
        lane: "manuscript",
        tagKind: "inline",
        charOffset: 1,
      }),
      placed({
        id: "c",
        kind: "file",
        label: "e (m)",
        fileLabel: "m",
        eventLabel: "e",
        segmentId: segment,
        sortKey: 3n,
        lane: "manuscript",
        tagKind: "inline",
        charOffset: 2,
      }),
    ];

    expect(buildEventSpanLinks(items, true)).toEqual([
      { segmentId: segment, fromId: "a", toId: "b" },
      { segmentId: segment, fromId: "b", toId: "c" },
    ]);
  });

  it("no enlaza segmentos distintos", () => {
    const items = [
      placed({
        id: "a",
        kind: "file",
        label: "e (m)",
        fileLabel: "m",
        eventLabel: "e",
        segmentId: segment,
        sortKey: 1n,
        lane: "manuscript",
      }),
      placed({
        id: "b",
        kind: "file",
        label: "e (m)",
        fileLabel: "m",
        eventLabel: "e",
        segmentId: "Manuscrito/meow.md::seg::1",
        sortKey: 2n,
        lane: "manuscript",
      }),
    ];

    expect(buildEventSpanLinks(items, true)).toEqual([]);
  });

  it("no enlaza mismo segmentId en lanes distintos", () => {
    const items = [
      placed({
        id: "a",
        kind: "file",
        label: "e (m)",
        fileLabel: "m",
        eventLabel: "e",
        segmentId: segment,
        sortKey: 1n,
        lane: "manuscript",
      }),
      placed({
        id: "b",
        kind: "file",
        label: "e (m)",
        fileLabel: "m",
        eventLabel: "e",
        segmentId: segment,
        sortKey: 2n,
        lane: "below",
      }),
    ];

    expect(buildEventSpanLinks(items, true)).toEqual([]);
  });

  it("devuelve vacío cuando showLinks es false", () => {
    const items = [
      placed({
        id: "a",
        kind: "file",
        label: "e (m)",
        fileLabel: "m",
        eventLabel: "e",
        segmentId: segment,
        sortKey: 1n,
        lane: "manuscript",
      }),
      placed({
        id: "b",
        kind: "file",
        label: "e (m)",
        fileLabel: "m",
        eventLabel: "e",
        segmentId: segment,
        sortKey: 2n,
        lane: "manuscript",
      }),
    ];

    expect(buildEventSpanLinks(items, false)).toEqual([]);
  });
});
