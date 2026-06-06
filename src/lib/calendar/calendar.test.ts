import { describe, expect, it } from "vitest";

import { daysInMonth } from "@/lib/calendar/dateTags";
import {
  daysInYear,
  fromAbsoluteDay,
  parseDateString,
  toAbsoluteDay,
} from "@/lib/calendar/engine";
import {
  buildOverlappingSeasonDayKeys,
  calendarDayOfYear,
  findSeasonOverlapPairs,
  seasonDayKey,
  seasonRangesOverlap,
} from "@/lib/calendar/seasonOverlap";
import type { CalendarConfig } from "@/lib/types/calendar";

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

describe("calendar engine", () => {
  it("orders variable month lengths", () => {
    const early = toAbsoluteDay({ day: 1, month: 1, year: 1 }, sampleConfig);
    const late = toAbsoluteDay({ day: 15, month: 3, year: 1 }, sampleConfig);
    expect(early < late).toBe(true);
  });

  it("applies leap day in configured month", () => {
    const normalYear = daysInYear(1, sampleConfig);
    const leapYear = daysInYear(4, sampleConfig);
    expect(leapYear - normalYear).toBe(1n);
  });

  it("round-trips absolute days", () => {
    const absolute = toAbsoluteDay({ day: 10, month: 2, year: 5 }, sampleConfig);
    const parts = fromAbsoluteDay(absolute, sampleConfig);
    expect(parts).toEqual({ day: 10, month: 2, year: 5 });
  });

  it("parses mythic and unknown labels", () => {
    expect(parseDateString("mythic", sampleConfig).kind).toBe("mythic");
    expect(parseDateString("unknown", sampleConfig).kind).toBe("unknown");
  });

  it("parses d.m.y format", () => {
    const parsed = parseDateString("14.3.1024", sampleConfig);
    expect(parsed.kind).toBe("instant");
    if (parsed.kind === "instant") {
      expect(parsed.absoluteDay).toBeTypeOf("bigint");
    }
  });

  it("does not stack leapRules extra days when a special-year cycle is active", () => {
    const baseMonths = [
      { name: "Enero", days: 31 },
      { name: "Febrero", days: 28 },
      { name: "Marzo", days: 31 },
    ];
    const withLeapCycle: CalendarConfig = {
      ...sampleConfig,
      months: baseMonths,
      leapRules: { enabled: true, everyYears: 4, extraDays: 1, monthIndex: 1 },
      specialYearCycles: [
        {
          id: "leap",
          name: "Año Bisiesto",
          intervalYears: 4,
          startsAtYear: 0,
          syncFromBase: false,
          months: baseMonths.map((m, i) => (i === 1 ? { ...m, days: 29 } : { ...m })),
        },
      ],
    };
    expect(daysInMonth(1, 0, withLeapCycle)).toBe(29);
    expect(daysInMonth(1, 1, withLeapCycle)).toBe(28);
  });

  it("uses shortened special-year calendar on matching years", () => {
    const withSpecial: CalendarConfig = {
      ...sampleConfig,
      specialYearCycles: [
        {
          id: "short",
          name: "Año corto",
          intervalYears: 4,
          startsAtYear: 0,
          syncFromBase: false,
          months: [{ name: "Único", days: 10 }],
        },
      ],
    };
    expect(daysInYear(0, withSpecial)).toBe(10n);
    expect(daysInYear(4, withSpecial)).toBe(10n);
    expect(daysInYear(1, withSpecial)).toBe(120n);
    expect(parseDateString("11.1.0", withSpecial).kind).toBe("invalid");
    expect(parseDateString("10.1.0", withSpecial).kind).toBe("instant");
  });

  it("orders dates across base and special years correctly", () => {
    const withSpecial: CalendarConfig = {
      ...sampleConfig,
      specialYearCycles: [
        {
          id: "short",
          name: "Año corto",
          intervalYears: 4,
          startsAtYear: 0,
          syncFromBase: false,
          months: [{ name: "Único", days: 10 }],
        },
      ],
    };
    const endYear0 = toAbsoluteDay({ day: 10, month: 1, year: 0 }, withSpecial);
    const startYear1 = toAbsoluteDay({ day: 1, month: 1, year: 1 }, withSpecial);
    expect(endYear0 < startYear1).toBe(true);
    const roundTrip = fromAbsoluteDay(endYear0, withSpecial);
    expect(roundTrip).toEqual({ day: 10, month: 1, year: 0 });
  });
});

describe("season overlap", () => {
  const months = [
    { name: "Enero", days: 31 },
    { name: "Febrero", days: 28 },
    { name: "Marzo", days: 31 },
    { name: "Abril", days: 30 },
    { name: "Mayo", days: 31 },
    { name: "Junio", days: 30 },
    { name: "Julio", days: 31 },
    { name: "Agosto", days: 31 },
    { name: "Septiembre", days: 30 },
    { name: "Octubre", days: 31 },
    { name: "Noviembre", days: 30 },
    { name: "Diciembre", days: 31 },
  ];

  it("detects partial overlap at season boundaries", () => {
    const total = months.reduce((s, m) => s + m.days, 0);
    const endFirst = calendarDayOfYear(8, 3, months);
    const startSecond = calendarDayOfYear(8, 2, months);
    expect(endFirst).toBeGreaterThan(startSecond);
    expect(
      seasonRangesOverlap(
        calendarDayOfYear(2, 1, months),
        endFirst,
        startSecond,
        calendarDayOfYear(10, 3, months),
        total,
      ),
    ).toBe(true);

    const pairs = findSeasonOverlapPairs(
      [
        {
          id: "a",
          name: "A",
          from: { month: 2, day: 1 },
          to: { month: 8, day: 3 },
        },
        {
          id: "b",
          name: "B",
          from: { month: 8, day: 2 },
          to: { month: 10, day: 3 },
        },
      ],
      months,
    );
    expect(pairs).toEqual([{ indexA: 0, indexB: 1 }]);

    const overlapDays = buildOverlappingSeasonDayKeys(
      [
        {
          id: "a",
          name: "A",
          from: { month: 2, day: 1 },
          to: { month: 8, day: 3 },
        },
        {
          id: "b",
          name: "B",
          from: { month: 8, day: 2 },
          to: { month: 10, day: 3 },
        },
      ],
      months,
    );
    expect(overlapDays.has(seasonDayKey(8, 2))).toBe(true);
    expect(overlapDays.has(seasonDayKey(8, 3))).toBe(true);
    expect(overlapDays.has(seasonDayKey(8, 1))).toBe(false);
  });

  it("does not flag adjacent non-overlapping seasons", () => {
    const pairs = findSeasonOverlapPairs(
      [
        {
          id: "a",
          name: "A",
          from: { month: 1, day: 1 },
          to: { month: 6, day: 30 },
        },
        {
          id: "b",
          name: "B",
          from: { month: 7, day: 1 },
          to: { month: 12, day: 31 },
        },
      ],
      months,
    );
    expect(pairs).toEqual([]);
  });
});
