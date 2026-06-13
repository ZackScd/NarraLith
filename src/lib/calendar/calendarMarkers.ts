import { fromAbsoluteDay, isRenderableAbsoluteDay, resolveTimeSortKey, toAbsoluteDay } from "@/lib/calendar";
import { isManuscriptPath, isTimedEventPath } from "@/modules/timeline/timelineModel";
import type { CalendarConfig, CalendarAnnualEvent } from "@/lib/types/calendar";
import type { TimelineEvent } from "@/lib/types/timeline";
import type { TimelineFilterState } from "@/stores/useTimelineStore";

import { annualKindToLegendCategory, type CalendarLegendCategory } from "./legend";

export interface MarkedCalendarDay {
  month: number;
  day: number;
  categories: CalendarLegendCategory[];
}

function partsInYear(
  sortKey: bigint,
  year: number,
  config: CalendarConfig,
): { month: number; day: number } | null {
  if (!isRenderableAbsoluteDay(sortKey)) return null;
  const parts = fromAbsoluteDay(sortKey, config);
  if (parts.year !== year) return null;
  return { month: parts.month, day: parts.day };
}

function dayKey(month: number, day: number): string {
  return `${month}-${day}`;
}

export function yearsWithFileEntries(
  events: TimelineEvent[],
  config: CalendarConfig,
): number[] {
  const years = new Set<number>();
  for (const event of events) {
    let sortKey: bigint | null = null;
    if (event.timestamp) {
      try {
        sortKey = BigInt(event.timestamp);
      } catch {
        sortKey = null;
      }
    }
    if (sortKey === null) {
      const resolved = resolveTimeSortKey(event.rawTime, config);
      if (resolved) {
        try {
          sortKey = BigInt(resolved);
        } catch {
          sortKey = null;
        }
      }
    }
    if (sortKey === null || !isRenderableAbsoluteDay(sortKey)) continue;
    const parts = fromAbsoluteDay(sortKey, config);
    years.add(parts.year);
  }
  return [...years].sort((a, b) => a - b);
}

export function buildMarkedDaysForYear(
  year: number,
  events: TimelineEvent[],
  config: CalendarConfig,
  filters?: TimelineFilterState,
): Map<string, MarkedCalendarDay> {
  const map = new Map<string, MarkedCalendarDay>();

  const addCategory = (
    month: number,
    day: number,
    category: CalendarLegendCategory,
  ) => {
    const key = dayKey(month, day);
    const existing = map.get(key);
    if (existing) {
      if (!existing.categories.includes(category)) {
        existing.categories.push(category);
      }
      return;
    }
    map.set(key, { month, day, categories: [category] });
  };

  for (const event of events) {
    let sortKey: bigint | null = null;
    if (event.timestamp) {
      try {
        sortKey = BigInt(event.timestamp);
      } catch {
        sortKey = null;
      }
    }
    if (sortKey === null) {
      const resolved = resolveTimeSortKey(event.rawTime, config);
      if (resolved) {
        try {
          sortKey = BigInt(resolved);
        } catch {
          sortKey = null;
        }
      }
    }
    if (sortKey === null) continue;

    const inYear = partsInYear(sortKey, year, config);
    if (!inYear) continue;

    if (isManuscriptPath(event.path)) {
      if (!filters || filters.manuscript) {
        addCategory(inYear.month, inYear.day, "manuscript");
      }
    } else if (isTimedEventPath(event.path)) {
      if (!filters || filters.events) {
        addCategory(inYear.month, inYear.day, "event");
      }
    }
  }

  for (const annual of config.annualEvents ?? []) {
    if (!annual.day || annual.day < 1) continue;
    if (!annualAppliesInYear(annual, year)) continue;
    const category = annualKindToLegendCategory(annual.kind);
    if (filters) {
      if ((category === "birthday" || category === "festival") && !filters.festivals) {
        continue;
      }
      if (category === "anniversary" && !filters.anniversaries) continue;
      if (category === "cosmic" && !filters.cosmic) continue;
    }
    addCategory(annual.month, annual.day, category);
  }

  return map;
}

export function historyMarkedDaysForYear(
  year: number,
  events: TimelineEvent[],
  config: CalendarConfig,
): Map<string, { month: number; day: number }> {
  const map = new Map<string, { month: number; day: number }>();

  for (const event of events) {
    if (!isManuscriptPath(event.path)) continue;

    let sortKey: bigint | null = null;
    if (event.timestamp) {
      try {
        sortKey = BigInt(event.timestamp);
      } catch {
        sortKey = null;
      }
    }
    if (sortKey === null) {
      const resolved = resolveTimeSortKey(event.rawTime, config);
      if (resolved) {
        try {
          sortKey = BigInt(resolved);
        } catch {
          sortKey = null;
        }
      }
    }
    if (sortKey === null) continue;

    const inYear = partsInYear(sortKey, year, config);
    if (!inYear) continue;

    const key = dayKey(inYear.month, inYear.day);
    if (!map.has(key)) {
      map.set(key, inYear);
    }
  }

  return map;
}

export function historyMarkedHoursForDay(
  year: number,
  month: number,
  day: number,
  events: TimelineEvent[],
  config: CalendarConfig,
): Set<number> {
  const hours = new Set<number>();

  for (const event of events) {
    if (!isManuscriptPath(event.path)) continue;
    if (event.timeHour === null || event.timeHour === undefined) continue;

    let sortKey: bigint | null = null;
    if (event.timestamp) {
      try {
        sortKey = BigInt(event.timestamp);
      } catch {
        sortKey = null;
      }
    }
    if (sortKey === null) {
      const resolved = resolveTimeSortKey(event.rawTime, config);
      if (resolved) {
        try {
          sortKey = BigInt(resolved);
        } catch {
          sortKey = null;
        }
      }
    }
    if (sortKey === null) continue;

    const inYear = partsInYear(sortKey, year, config);
    if (!inYear || inYear.month !== month || inYear.day !== day) continue;

    hours.add(event.timeHour);
  }

  return hours;
}

export function annualAppliesInYear(
  annual: CalendarAnnualEvent,
  year: number,
): boolean {
  if (year < annual.startsAtYear) return false;
  const every = annual.repeatEveryYears ?? 1;
  if (every === 0) return false;
  if (every > 1) {
    return (year - annual.startsAtYear) % every === 0;
  }
  return true;
}

export function absoluteDayInYear(
  year: number,
  month: number,
  day: number,
  config: CalendarConfig,
): bigint {
  return toAbsoluteDay({ year, month, day }, config);
}
