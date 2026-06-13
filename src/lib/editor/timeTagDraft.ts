import { parseTimeTag } from "@/lib/calendar/dateTags";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { TimeDraft } from "@/stores/useTimeTagDialogStore";

/** Convierte un token `d.m.y` crudo al borrador del diálogo de tiempo. */
export function timeDraftFromRawTag(
  raw: string,
  calendar: CalendarConfig,
  hour: number | null = null,
): TimeDraft {
  const parts = parseTimeTag(raw.trim());
  if (!parts) {
    return { day: 1, month: 1, year: 0, hour };
  }
  const monthsLen = Math.max(1, calendar.months.length);
  return {
    day: Math.min(Math.max(1, parts.day), calendar.months[parts.month - 1]?.days ?? 30),
    month: Math.min(Math.max(1, parts.month), monthsLen),
    year: parts.year,
    hour,
  };
}
