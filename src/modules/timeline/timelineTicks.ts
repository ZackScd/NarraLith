import {
  effectiveCalendarForYear,
  fromAbsoluteDay,
  toAbsoluteDay,
} from "@/lib/calendar";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { TimelineZoomUnit } from "@/stores/useTimelineStore";

import { deriveZoomUnit } from "@/modules/timeline/timelineScale";

export interface TimelineTick {
  sortKey: bigint;
  label: string;
}

function formatTickDate(sortKey: bigint, calendar: CalendarConfig): string {
  const parts = fromAbsoluteDay(sortKey, calendar);
  return `${parts.day}-${parts.month}-${parts.year}`;
}

export function buildTimelineTicks(
  viewMin: number,
  viewMax: number,
  calendar: CalendarConfig,
  showHours: boolean,
  zoomUnit?: TimelineZoomUnit,
): TimelineTick[] {
  const spanDays = Math.max(viewMax - viewMin, 1);
  const unit = zoomUnit ?? deriveZoomUnit(spanDays);
  const minKey = BigInt(Math.round(viewMin));
  const maxKey = BigInt(Math.round(viewMax));
  const ticks: TimelineTick[] = [];

  const minParts = fromAbsoluteDay(minKey, calendar);
  const maxParts = fromAbsoluteDay(maxKey, calendar);

  if (unit === "year") {
    for (let y = minParts.year; y <= maxParts.year; y += 1) {
      const sortKey = toAbsoluteDay({ day: 1, month: 1, year: y }, calendar);
      const n = Number(sortKey);
      if (n >= viewMin && n <= viewMax) {
        ticks.push({ sortKey, label: String(y) });
      }
    }
    return ticks;
  }

  if (unit === "month") {
    let y = minParts.year;
    let m = minParts.month;
    while (y < maxParts.year || (y === maxParts.year && m <= maxParts.month)) {
      const sortKey = toAbsoluteDay({ day: 1, month: m, year: y }, calendar);
      const n = Number(sortKey);
      if (n >= viewMin && n <= viewMax) {
        const eff = effectiveCalendarForYear(y, calendar);
        const monthName = eff.months[m - 1]?.name ?? String(m);
        ticks.push({ sortKey, label: `${monthName} ${y}` });
      }
      m += 1;
      const monthsInYear = effectiveCalendarForYear(y, calendar).months.length;
      if (m > monthsInYear) {
        m = 1;
        y += 1;
      }
    }
    return ticks;
  }

  const step =
    unit === "week"
      ? Math.max(7, Math.floor(spanDays / 12))
      : Math.max(1, Math.floor(spanDays / 14));

  let cursor = Math.floor(viewMin);
  while (cursor <= viewMax) {
    const sortKey = BigInt(cursor);
    ticks.push({
      sortKey,
      label: formatTickDate(sortKey, calendar),
    });
    cursor += step;
  }

  if (unit === "day" && showHours && spanDays <= 2) {
    const hours = calendar.hoursPerDay;
    const hourStep = Math.max(1, Math.floor(hours / 8));
    for (let h = hourStep; h < hours; h += hourStep) {
      const fractional = viewMin + ((viewMax - viewMin) / hours) * h;
      ticks.push({
        sortKey: BigInt(Math.round(fractional)),
        label: `${h}:00`,
      });
    }
  }

  return ticks;
}

export { deriveZoomUnit };
