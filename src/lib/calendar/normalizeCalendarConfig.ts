import { clampHighlightOpacity } from "@/lib/calendar/seasonHighlight";
import type {
  CalendarAnnualEvent,
  CalendarConfig,
  CalendarMonth,
  CalendarMonthDay,
  CalendarSeason,
  SpecialYearCycle,
} from "@/lib/types/calendar";

function clampMonthIndex(month: number, monthCount: number): number {
  if (monthCount <= 0) return 1;
  return Math.max(1, Math.min(monthCount, Math.trunc(month) || 1));
}

function clampMonthDay(
  date: CalendarMonthDay,
  months: CalendarMonth[],
): CalendarMonthDay {
  const monthCount = Math.max(1, months.length);
  const month = clampMonthIndex(date.month, monthCount);
  const maxDay = Math.max(1, months[month - 1]?.days ?? 1);
  const day = Math.max(1, Math.min(maxDay, Math.trunc(date.day) || 1));
  return { month, day };
}

function normalizeSeasonToMonths(
  season: CalendarSeason,
  months: CalendarMonth[],
): CalendarSeason {
  const from = clampMonthDay(season.from, months);
  const to = clampMonthDay(season.to, months);
  return {
    ...season,
    highlightColor: season.highlightColor || "#3b82f6",
    highlightOpacity: clampHighlightOpacity(season.highlightOpacity),
    from,
    to,
  };
}

function normalizeAnnualEvent(
  event: CalendarAnnualEvent,
  months: CalendarMonth[],
): CalendarAnnualEvent {
  const monthCount = months.length;
  if (monthCount === 0) return event;
  const month = clampMonthIndex(event.month, monthCount);
  const maxDay = Math.max(1, months[month - 1]?.days ?? 1);
  let day = event.day;
  if (day !== 0) {
    day = Math.max(1, Math.min(maxDay, day));
  }
  return { ...event, month, day };
}

function normalizeSpecialCycle(
  cycle: SpecialYearCycle,
  baseMonths: CalendarMonth[],
): SpecialYearCycle {
  const months =
    cycle.months.length > 0
      ? cycle.months.map((m) => ({
          ...m,
          days: Math.max(1, m.days),
          name: m.name ?? "",
        }))
      : structuredClone(baseMonths);
  return { ...cycle, months };
}

/** Ajusta referencias a meses tras añadir/quitar meses en el calendario base. */
export function normalizeCalendarConfig(config: CalendarConfig): CalendarConfig {
  const months = config.months.map((m) => ({
    ...m,
    days: Math.max(1, m.days),
  }));
  const monthCount = months.length;

  const epoch =
    monthCount > 0
      ? {
          ...config.epoch,
          ...clampMonthDay(
            { month: config.epoch.month, day: config.epoch.day },
            months,
          ),
        }
      : config.epoch;

  const leapRules = {
    ...config.leapRules,
    monthIndex:
      monthCount > 0
        ? Math.max(0, Math.min(monthCount - 1, config.leapRules.monthIndex))
        : 0,
  };

  return {
    ...config,
    months,
    epoch,
    leapRules,
    seasons: (config.seasons ?? []).map((s) => normalizeSeasonToMonths(s, months)),
    annualEvents: (config.annualEvents ?? []).map((e) =>
      normalizeAnnualEvent(e, months),
    ),
    specialYearCycles: (config.specialYearCycles ?? []).map((c) =>
      normalizeSpecialCycle(c, months),
    ),
  };
}
