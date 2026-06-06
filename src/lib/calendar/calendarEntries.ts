import { fromAbsoluteDay, resolveTimeSortKey, toAbsoluteDay } from "@/lib/calendar";
import {
  annualKindToLegendCategory,
  type CalendarLegendCategory,
} from "@/lib/calendar/legend";
import { annualAppliesInYear } from "@/lib/calendar/calendarMarkers";
import {
  fileDisplayName,
  isManuscriptPath,
  isTimedEventPath,
} from "@/modules/timeline/timelineModel";
import type { CalendarConfig, CalendarAnnualEvent } from "@/lib/types/calendar";
import { timelineMarkerId } from "@/lib/calendar/timeMarks";
import type { TimelineEvent } from "@/lib/types/timeline";
import type { TimelineFilterState } from "@/stores/useTimelineStore";

export interface CalendarTimeEntry {
  id: string;
  sortKey: bigint;
  year: number;
  month: number;
  day: number;
  hour: number | null;
  label: string;
  category: CalendarLegendCategory;
  kind: "file" | "annual";
  path?: string;
  blockIndex?: number;
  rawTime: string;
  dateLabel: string;
}

function formatDateLabel(parts: { day: number; month: number; year: number }): string {
  return `${parts.day}-${parts.month}-${parts.year}`;
}

function resolveSortKey(event: TimelineEvent, config: CalendarConfig): bigint | null {
  if (event.timestamp) {
    try {
      return BigInt(event.timestamp);
    } catch {
      /* fall through */
    }
  }
  const resolved = resolveTimeSortKey(event.rawTime, config);
  if (!resolved) return null;
  try {
    return BigInt(resolved);
  } catch {
    return null;
  }
}

function fileEntryAllowed(
  event: TimelineEvent,
  filters?: TimelineFilterState,
): boolean {
  if (!filters) return true;
  if (isManuscriptPath(event.path)) return filters.manuscript;
  if (isTimedEventPath(event.path)) return filters.events;
  return false;
}

function annualEntryAllowed(
  annual: CalendarAnnualEvent,
  filters?: TimelineFilterState,
): boolean {
  if (!filters) return true;
  const category = annualKindToLegendCategory(annual.kind);
  if (category === "birthday" || category === "festival") return filters.festivals;
  if (category === "anniversary") return filters.anniversaries;
  if (category === "cosmic") return filters.cosmic;
  return true;
}

export function buildCalendarTimeEntries(
  year: number,
  events: TimelineEvent[],
  config: CalendarConfig,
  filters?: TimelineFilterState,
): CalendarTimeEntry[] {
  const entries: CalendarTimeEntry[] = [];

  for (const event of events) {
    if (!fileEntryAllowed(event, filters)) continue;
    const sortKey = resolveSortKey(event, config);
    if (sortKey === null) continue;
    const parts = fromAbsoluteDay(sortKey, config);
    if (parts.year !== year) continue;

    const label = event.title?.trim() || fileDisplayName(event.path);

    const category: CalendarLegendCategory = isManuscriptPath(event.path)
      ? "manuscript"
      : "event";

    entries.push({
      id: timelineMarkerId(event),
      sortKey,
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: event.timeHour ?? null,
      label,
      category,
      kind: "file",
      path: event.path,
      blockIndex: event.blockIndex,
      rawTime: event.rawTime,
      dateLabel: formatDateLabel(parts),
    });
  }

  for (const annual of config.annualEvents ?? []) {
    if (!annual.day || annual.day < 1) continue;
    if (!annualAppliesInYear(annual, year)) continue;
    if (!annualEntryAllowed(annual, filters)) continue;
    const parts = { day: annual.day, month: annual.month, year };
    const sortKey = toAbsoluteDay(parts, config);
    entries.push({
      id: `annual:${annual.id}:${year}`,
      sortKey,
      year,
      month: annual.month,
      day: annual.day,
      hour: null,
      label: annual.name,
      category: annualKindToLegendCategory(annual.kind),
      kind: "annual",
      path: annual.linkedPath || undefined,
      rawTime: `${annual.day}.${annual.month}.${year}`,
      dateLabel: formatDateLabel(parts),
    });
  }

  entries.sort((a, b) => {
    if (a.sortKey === b.sortKey) return a.label.localeCompare(b.label);
    return a.sortKey < b.sortKey ? -1 : 1;
  });

  return entries;
}

export function entriesForMonth(
  entries: CalendarTimeEntry[],
  month: number,
): CalendarTimeEntry[] {
  return entries.filter((e) => e.month === month);
}

export function entriesForDay(
  entries: CalendarTimeEntry[],
  month: number,
  day: number,
): CalendarTimeEntry[] {
  return entries.filter((e) => e.month === month && e.day === day);
}

export function entriesByDayInMonth(
  entries: CalendarTimeEntry[],
  month: number,
): Map<number, CalendarTimeEntry[]> {
  const map = new Map<number, CalendarTimeEntry[]>();
  for (const entry of entries) {
    if (entry.month !== month) continue;
    const list = map.get(entry.day) ?? [];
    list.push(entry);
    map.set(entry.day, list);
  }
  return map;
}
