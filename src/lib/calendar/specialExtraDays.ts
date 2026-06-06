import { daysInMonth } from "@/lib/calendar/dateTags";
import { resolveSpecialYearCycle } from "@/lib/calendar/effectiveCalendar";
import type { CalendarConfig } from "@/lib/types/calendar";

/** Días del mes en el calendario base (sin año especial ni bisiesto legacy). */
export function baseMonthDayCount(monthIndex: number, config: CalendarConfig): number {
  return Math.max(0, config.months[monthIndex]?.days ?? 0);
}

/** Día extra respecto al calendario base (p. ej. 29.º de febrero en un año bisiesto). */
export function isSpecialExtraDay(
  monthIndex: number,
  day: number,
  year: number,
  config: CalendarConfig,
): boolean {
  const base = baseMonthDayCount(monthIndex, config);
  const total = daysInMonth(monthIndex, year, config);
  return day > base && day <= total;
}

/** Texto para tooltip / título: nombre del ciclo y archivo vinculado. */
export function specialExtraDayLabel(
  year: number,
  config: CalendarConfig,
): string | undefined {
  const cycle = resolveSpecialYearCycle(year, config);
  if (!cycle) return undefined;
  const parts = [cycle.name.trim() || ""].filter(Boolean);
  const path = cycle.linkedPath?.trim();
  if (path) parts.push(path);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function specialYearBarLabel(
  year: number,
  config: CalendarConfig,
): { name: string; linkedPath?: string } | null {
  const cycle = resolveSpecialYearCycle(year, config);
  if (!cycle) return null;
  const name = cycle.name.trim();
  const linkedPath = cycle.linkedPath?.trim();
  return {
    name: name || "—",
    ...(linkedPath ? { linkedPath } : {}),
  };
}
