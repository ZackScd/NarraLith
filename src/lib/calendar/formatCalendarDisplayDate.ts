import { effectiveCalendarForYear } from "@/lib/calendar/effectiveCalendar";
import { resolveWeekDayName } from "@/lib/calendar/weekDays";
import type { CalendarConfig } from "@/lib/types/calendar";

export type CalendarDateParts = { day: number; month: number; year: number };

export type CalendarDisplayDateMode = "long" | "short";

function pad2(value: number): string {
  return String(Math.trunc(value)).padStart(2, "0");
}

/** Compara dos fechas calendáricas (día, mes, año). */
export function calendarDatesEqual(
  a: CalendarDateParts | null,
  b: CalendarDateParts | null,
): boolean {
  if (!a || !b) {
    return false;
  }
  return a.day === b.day && a.month === b.month && a.year === b.year;
}

/**
 * Formato visible de una fecha del calendario ficticio del proyecto.
 * - long: "[díaSemana] [día] de [mes], [año]"
 * - short: AAAA-MM-DD
 */
export function formatCalendarDisplayDate(
  parts: CalendarDateParts,
  config: CalendarConfig,
  mode: CalendarDisplayDateMode,
): string {
  if (mode === "short") {
    return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
  }

  const dayName = resolveWeekDayName(parts.year, parts.month, parts.day, config);
  const monthName =
    effectiveCalendarForYear(parts.year, config).months[parts.month - 1]?.name ??
    String(parts.month);
  return `${dayName} ${parts.day} de ${monthName}, ${parts.year}`;
}
