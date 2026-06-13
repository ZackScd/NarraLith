import type { CalendarConfig } from "@/lib/types/calendar";

/** Snapshot en `.narralith/calendar-baseline.json` (FIX-010g). */
export type CalendarBaselineFile = {
  revisionId: string;
  savedAt: string;
  config: CalendarConfig;
};
