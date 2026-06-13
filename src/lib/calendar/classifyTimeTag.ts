import { parseTimeTag } from "@/lib/calendar/dateTags";
import { effectiveCalendarForYear } from "@/lib/calendar/effectiveCalendar";
import { parseDateString } from "@/lib/calendar/engine";
import type { CalendarConfig } from "@/lib/types/calendar";
import { MYTHIC_SORT_KEY, UNKNOWN_SORT_KEY } from "@/lib/types/calendar";

export type TimeTagStatus = "valid" | "invalid" | "structure_stale" | "mythic" | "unknown";

export interface ClassifiedTimeTag {
  status: TimeTagStatus;
  raw: string;
  sortKey?: bigint;
  displaySortKey?: bigint;
  parts?: { day: number; month: number; year: number };
  fixedSortKey?: bigint;
}

export function classifyTimeTag(
  raw: string,
  activeConfig: CalendarConfig,
  baselineConfig?: CalendarConfig | null,
): ClassifiedTimeTag {
  const trimmed = raw.trim();
  const activeParsed = parseDateString(trimmed, activeConfig);

  if (activeParsed.kind === "mythic") {
    const fixedSortKey = BigInt(MYTHIC_SORT_KEY);
    return { status: "mythic", raw: trimmed, fixedSortKey, displaySortKey: fixedSortKey };
  }

  if (activeParsed.kind === "unknown") {
    const fixedSortKey = BigInt(UNKNOWN_SORT_KEY);
    return { status: "unknown", raw: trimmed, fixedSortKey, displaySortKey: fixedSortKey };
  }

  if (activeParsed.kind === "invalid") {
    return {
      status: "invalid",
      raw: trimmed,
      parts: parseTimeTag(trimmed) ?? undefined,
    };
  }

  const sortKey = activeParsed.absoluteDay;
  const parts = parseTimeTag(trimmed);
  const base = {
    raw: trimmed,
    sortKey,
    displaySortKey: sortKey,
    parts: parts ?? undefined,
  };

  if (!baselineConfig) {
    return { status: "valid", ...base };
  }

  const baselineParsed = parseDateString(trimmed, baselineConfig);
  if (baselineParsed.kind === "instant") {
    if (baselineParsed.absoluteDay !== activeParsed.absoluteDay) {
      return { status: "structure_stale", ...base };
    }
    const monthIdx = parts!.month - 1;
    const baselineMonthName =
      effectiveCalendarForYear(parts!.year, baselineConfig).months[monthIdx]?.name;
    const activeMonthName =
      effectiveCalendarForYear(parts!.year, activeConfig).months[monthIdx]?.name;
    if (baselineMonthName !== activeMonthName) {
      return { status: "structure_stale", ...base };
    }
  }

  return { status: "valid", ...base };
}
