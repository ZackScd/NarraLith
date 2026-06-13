import {
  classifyTimeTag,
  type TimeTagStatus,
} from "@/lib/calendar/classifyTimeTag";
import { MAX_ABS_DAY } from "@/lib/calendar/engine";
import type { CalendarConfig } from "@/lib/types/calendar";
import { timelineMarkerId } from "@/lib/calendar/timeMarks";
import type { TimelineEvent } from "@/lib/types/timeline";

export interface MarkerPlacement {
  sortKey: bigint;
  timeStatus: TimeTagStatus;
  rawTime: string;
}

function syntheticSortKeyForEvent(event: TimelineEvent): bigint {
  const id = timelineMarkerId(event);
  let hash = 0n;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31n + BigInt(id.charCodeAt(i))) & 0xfffffn;
  }
  return BigInt(MAX_ABS_DAY) - hash - 1n;
}

export function resolveMarkerPlacement(
  event: TimelineEvent,
  activeConfig: CalendarConfig,
  baselineConfig?: CalendarConfig | null,
  calendarReconciled = false,
): MarkerPlacement | null {
  const rawTime = event.rawTime?.trim() ?? "";
  if (!rawTime) return null;

  const reconciled =
    calendarReconciled ||
    event.calendarReconciled === true;

  const classified = classifyTimeTag(rawTime, activeConfig, baselineConfig ?? null, {
    calendarReconciled: reconciled,
  });

  let sortKey =
    classified.displaySortKey ?? classified.sortKey ?? classified.fixedSortKey;

  if (sortKey === undefined && event.timestamp) {
    try {
      sortKey = BigInt(event.timestamp);
    } catch {
      /* ignore */
    }
  }

  if (sortKey === undefined) {
    sortKey = syntheticSortKeyForEvent(event);
  }

  return { sortKey, timeStatus: classified.status, rawTime };
}
