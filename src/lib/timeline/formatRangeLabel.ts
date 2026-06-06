import { effectiveCalendarForYear } from "@/lib/calendar/effectiveCalendar";
import { resolveWeekDayName } from "@/lib/calendar/weekDays";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { TimelineZoomLevel } from "@/stores/useTimelineStore";

function resolveMonthName(
  year: number,
  month: number,
  calendar: CalendarConfig,
): string {
  return (
    effectiveCalendarForYear(year, calendar).months[month - 1]?.name ?? String(month)
  );
}

export function formatTimelineRangeLabel(
  zoomLevel: TimelineZoomLevel,
  year: number,
  month: number,
  day: number,
  yearBlocks: Array<{ year: number }>,
  calendar: CalendarConfig,
): string {
  if (zoomLevel === "months") {
    return `${resolveMonthName(year, month, calendar)} ${year}`;
  }
  if (zoomLevel === "days" || zoomLevel === "hours") {
    const dayName = resolveWeekDayName(year, month, day, calendar);
    return `${dayName} - ${day} - ${year}`;
  }
  if (zoomLevel === "year1") {
    return String(year);
  }
  if (yearBlocks.length > 0) {
    const first = yearBlocks[0]!.year;
    const last = yearBlocks[yearBlocks.length - 1]!.year;
    return first === last ? String(first) : `${first} - ${last}`;
  }
  return String(year);
}
