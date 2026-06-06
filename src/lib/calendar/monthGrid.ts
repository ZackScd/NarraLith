import { clampToCalendar, daysInMonth } from "@/lib/calendar/dateTags";
import { effectiveCalendarForYear } from "@/lib/calendar/effectiveCalendar";
import type { CalendarDateParts } from "@/lib/calendar/formatCalendarDisplayDate";
import { resolveWeekDayIndex } from "@/lib/calendar/weekDays";
import type { CalendarConfig } from "@/lib/types/calendar";

export interface MonthGridCell {
  day: number | null;
}

export interface MonthGridModel {
  monthIndex: number;
  monthName: string;
  weeks: MonthGridCell[][];
}

export function buildMonthGrid(
  year: number,
  monthIndex: number,
  config: CalendarConfig,
): MonthGridModel {
  const month = monthIndex + 1;
  const eff = effectiveCalendarForYear(year, config);
  const monthName = eff.months[monthIndex]?.name ?? String(month);
  const totalDays = daysInMonth(monthIndex, year, config);
  const startWeekday = resolveWeekDayIndex(year, month, 1, config);

  const cells: MonthGridCell[] = [];
  for (let i = 0; i < startWeekday; i++) {
    cells.push({ day: null });
  }
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ day: d });
  }
  while (cells.length % config.daysPerWeek !== 0) {
    cells.push({ day: null });
  }

  const weeks: MonthGridCell[][] = [];
  for (let i = 0; i < cells.length; i += config.daysPerWeek) {
    weeks.push(cells.slice(i, i + config.daysPerWeek));
  }

  return { monthIndex, monthName, weeks };
}

export function buildAllMonthGrids(
  year: number,
  config: CalendarConfig,
): MonthGridModel[] {
  const eff = effectiveCalendarForYear(year, config);
  return eff.months.map((_, index) => buildMonthGrid(year, index, config));
}

/** Avanza o retrocede un mes calendario del proyecto, clampando el día al mes destino. */
export function shiftCalendarMonth(
  parts: CalendarDateParts,
  delta: number,
  config: CalendarConfig,
): CalendarDateParts {
  if (delta === 0) {
    return clampToCalendar(parts, config);
  }

  let monthIndex = parts.month - 1 + delta;
  let year = parts.year;

  while (monthIndex < 0) {
    year -= 1;
    const count = effectiveCalendarForYear(year, config).months.length;
    monthIndex += Math.max(1, count);
  }

  while (true) {
    const count = effectiveCalendarForYear(year, config).months.length;
    if (monthIndex < count) break;
    monthIndex -= count;
    year += 1;
  }

  return clampToCalendar({ day: parts.day, month: monthIndex + 1, year }, config);
}
