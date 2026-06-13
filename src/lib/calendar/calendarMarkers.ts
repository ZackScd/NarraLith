import { fromAbsoluteDay, isRenderableAbsoluteDay, toAbsoluteDay } from "@/lib/calendar";
import { resolveMarkerPlacement } from "@/lib/calendar/markerPlacement";
import { isStaleTimeTagStatus } from "@/lib/calendar/timeTagUi";
import { isManuscriptPath, isTimedEventPath } from "@/modules/timeline/timelineModel";
import type { CalendarConfig, CalendarAnnualEvent } from "@/lib/types/calendar";
import type { TimelineEvent } from "@/lib/types/timeline";
import type { TimelineFilterState } from "@/stores/useTimelineStore";

import { annualKindToLegendCategory, type CalendarLegendCategory } from "./legend";

export interface MarkedCalendarDay {
  month: number;
  day: number;
  categories: CalendarLegendCategory[];
  stale?: boolean;
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

function eventSortKey(
  event: TimelineEvent,
  config: CalendarConfig,
  baselineConfig?: CalendarConfig | null,
): bigint | null {
  const placement = resolveMarkerPlacement(event, config, baselineConfig);
  if (placement === null || !isRenderableAbsoluteDay(placement.sortKey)) return null;
  return placement.sortKey;
}

export function yearsWithFileEntries(
  events: TimelineEvent[],
  config: CalendarConfig,
  baselineConfig?: CalendarConfig | null,
): number[] {
  const years = new Set<number>();
  for (const event of events) {
    const sortKey = eventSortKey(event, config, baselineConfig);
    if (sortKey === null) continue;
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
  baselineConfig?: CalendarConfig | null,
): Map<string, MarkedCalendarDay> {
  const map = new Map<string, MarkedCalendarDay>();

  const addCategory = (
    month: number,
    day: number,
    category: CalendarLegendCategory,
    stale = false,
  ) => {
    const key = dayKey(month, day);
    const existing = map.get(key);
    if (existing) {
      if (!existing.categories.includes(category)) {
        existing.categories.push(category);
      }
      if (stale) existing.stale = true;
      return;
    }
    map.set(key, { month, day, categories: [category], stale: stale || undefined });
  };

  for (const event of events) {
    const placement = resolveMarkerPlacement(event, config, baselineConfig);
    if (placement === null || !isRenderableAbsoluteDay(placement.sortKey)) continue;

    const inYear = partsInYear(placement.sortKey, year, config);
    if (!inYear) continue;

    const stale = isStaleTimeTagStatus(placement.timeStatus);

    if (isManuscriptPath(event.path)) {
      if (!filters || filters.manuscript) {
        addCategory(inYear.month, inYear.day, "manuscript", stale);
      }
    } else if (isTimedEventPath(event.path)) {
      if (!filters || filters.events) {
        addCategory(inYear.month, inYear.day, "event", stale);
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
  baselineConfig?: CalendarConfig | null,
): Map<string, { month: number; day: number }> {
  const map = new Map<string, { month: number; day: number }>();

  for (const event of events) {
    if (!isManuscriptPath(event.path)) continue;

    const sortKey = eventSortKey(event, config, baselineConfig);
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
  baselineConfig?: CalendarConfig | null,
): Set<number> {
  const hours = new Set<number>();

  for (const event of events) {
    if (!isManuscriptPath(event.path)) continue;
    if (event.timeHour === null || event.timeHour === undefined) continue;

    const sortKey = eventSortKey(event, config, baselineConfig);
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
