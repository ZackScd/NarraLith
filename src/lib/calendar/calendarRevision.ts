import { normalizeAnnualEventsForDraft } from "@/lib/calendar/recurringEvents";
import type { CalendarConfig } from "@/lib/types/calendar";

/** Huella estable del borrador para detectar cambios sin guardar. */
export function calendarConfigRevision(config: CalendarConfig): string {
  const clone = structuredClone(config);
  clone.annualEvents = normalizeAnnualEventsForDraft(clone.annualEvents ?? []);
  return JSON.stringify(clone);
}

export function isCalendarDraftDirty(
  draft: CalendarConfig | null,
  savedRevision: string | null,
): boolean {
  if (!draft || savedRevision === null) return false;
  return calendarConfigRevision(draft) !== savedRevision;
}
