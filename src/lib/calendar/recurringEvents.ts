import type { CalendarAnnualEvent, CalendarAnnualKind } from "@/lib/types/calendar";

export const RECURRING_EVENT_KINDS: CalendarAnnualKind[] = [
  "festival",
  "anniversary",
  "cosmic",
];

export function normalizeAnnualKind(kind: string | undefined): CalendarAnnualKind {
  if (kind === "anniversary" || kind === "cosmic") return kind;
  return "festival";
}

export function clampAnnualDay(
  month: number,
  day: number,
  monthDays: number,
): { month: number; day: number } {
  const safeMonth = Math.max(1, month);
  const maxDay = Math.max(1, monthDays);
  return {
    month: safeMonth,
    day: Math.max(1, Math.min(maxDay, day)),
  };
}

/** En borrador: 1 año = campo vacío (cada año). */
export function normalizeAnnualEventsForDraft(
  events: CalendarAnnualEvent[],
): CalendarAnnualEvent[] {
  return events.map((e) => ({
    ...e,
    repeatEveryYears: e.repeatEveryYears === 1 ? null : e.repeatEveryYears,
  }));
}

/** Al guardar: vacío → cada año (1 en disco). */
export function normalizeAnnualEventsForSave(
  events: CalendarAnnualEvent[],
): CalendarAnnualEvent[] {
  return events.map((e) => ({
    ...e,
    repeatEveryYears: e.repeatEveryYears == null ? 1 : e.repeatEveryYears,
  }));
}

export function createEmptyAnnualEvent(): CalendarAnnualEvent {
  return {
    id: `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: "",
    month: 1,
    day: 1,
    kind: "festival",
    repeatEveryYears: null,
    startsAtYear: 0,
    linkedPath: "",
    hour: null,
  };
}
