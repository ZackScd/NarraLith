import { normalizeCalendarConfig } from "@/lib/calendar/normalizeCalendarConfig";
import { normalizeAnnualEventsForSave } from "@/lib/calendar/recurringEvents";
import type { CalendarAnnualEvent, CalendarConfig } from "@/lib/types/calendar";

function annualEventForSave(event: CalendarAnnualEvent): CalendarAnnualEvent {
  const saved = normalizeAnnualEventsForSave([event])[0]!;
  return {
    ...saved,
    description: saved.description ?? "",
    linkedPath: saved.linkedPath ?? "",
    hour: saved.hour ?? undefined,
  };
}

/** Normaliza el borrador para que el backend (serde) lo acepte sin `null` inválidos. */
export function prepareCalendarConfigForSave(config: CalendarConfig): CalendarConfig {
  const normalized = normalizeCalendarConfig(config);
  return {
    ...normalized,
    version: config.version ?? 1,
    weekDays: config.weekDays ?? [],
    annualEvents: (config.annualEvents ?? []).map(annualEventForSave),
    eras: config.eras ?? [],
    seasons: (config.seasons ?? []).map((s) => ({
      ...s,
      linkedPath: s.linkedPath ?? "",
      highlightColor: s.highlightColor ?? "#3b82f6",
      highlightOpacity: s.highlightOpacity ?? 0.18,
    })),
    specialYearCycles: config.specialYearCycles ?? [],
    seasonDayPhases: config.seasonDayPhases ?? [],
    globalDayPhases: config.globalDayPhases ?? [],
    leapRules: {
      enabled: config.leapRules?.enabled ?? false,
      everyYears: config.leapRules?.everyYears ?? 4,
      extraDays: config.leapRules?.extraDays ?? 1,
      monthIndex: config.leapRules?.monthIndex ?? 0,
      linkedPath: config.leapRules?.linkedPath ?? "",
    },
  };
}
