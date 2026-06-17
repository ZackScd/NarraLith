import {
  effectiveCalendarForYear,
  monthLengthForYear,
} from "@/lib/calendar/effectiveCalendar";
import type { CalendarConfig } from "@/lib/types/calendar";
import { parseInlineTagsInText } from "@/lib/editor/inlineTagSyntax";
import {
  timeTagFromEventSegment,
} from "@/lib/editor/manuscriptBlocks";
import type { ParsedManuscript } from "@/lib/types/manuscript";

const DATE_PATTERN = /^(\d+)\.(\d+)\.(-?\d+)$/;

/**
 * Intenta parsear una etiqueta de tiempo "d.m.aaaa" en partes calendáricas.
 * Devuelve `null` si la cadena no encaja con el formato MVP.
 */
export function parseTimeTag(
  raw: unknown,
): { day: number; month: number; year: number } | null {
  if (typeof raw !== "string") return null;
  const match = DATE_PATTERN.exec(raw.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
    return null;
  }
  return { day, month, year };
}

/** Formatea las partes calendáricas en "d.m.aaaa". */
export function formatTimeTag(parts: {
  day: number;
  month: number;
  year: number;
}): string {
  return `${parts.day}.${parts.month}.${parts.year}`;
}

function pad2(value: number): string {
  return String(Math.trunc(value)).padStart(2, "0");
}

/** Formato visible en UI: AAAA-MM-DD o AAAA-MM-DD / HH:00. */
export function formatTimeTagDisplay(
  parts: { day: number; month: number; year: number },
  options?: { hour?: number | null; includeHour?: boolean },
): string {
  const date = `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
  if (options?.includeHour && options.hour != null) {
    return `${date} / ${pad2(options.hour)}:00`;
  }
  return date;
}

/** Días de un mes para un año concreto (respeta reglas de bisiesto). */
export function daysInMonth(
  monthIndex: number,
  year: number,
  config: CalendarConfig,
): number {
  const eff = effectiveCalendarForYear(year, config);
  if (!eff.months[monthIndex]) return 1;
  return monthLengthForYear(year, monthIndex, eff);
}

/** Acota una fecha {day,month,year} a un calendario válido. */
export function clampToCalendar(
  parts: { day: number; month: number; year: number },
  config: CalendarConfig,
): { day: number; month: number; year: number } {
  const eff = effectiveCalendarForYear(parts.year, config);
  const monthsLen = Math.max(1, eff.months.length);
  const month = Math.min(Math.max(1, Math.trunc(parts.month) || 1), monthsLen);
  const year = Math.trunc(parts.year) || 0;
  const maxDay = daysInMonth(month - 1, year, config);
  const day = Math.min(Math.max(1, Math.trunc(parts.day) || 1), maxDay);
  return { day, month, year };
}

function scanTextForLastTime(
  text: string,
  last: { day: number; month: number; year: number } | null,
): { day: number; month: number; year: number } | null {
  let result = last;
  for (const tag of parseInlineTagsInText(text)) {
    if (tag.type !== "time") {
      continue;
    }
    const parsed = parseTimeTag(tag.value);
    if (parsed) {
      result = parsed;
    }
  }
  return result;
}

/**
 * Última fecha añadida al manuscrito en orden de aparición
 * (cabecera → segmentos; no orden cronológico).
 */
export function findLastAddedTimeInManuscript(
  manuscript: ParsedManuscript | null,
): { day: number; month: number; year: number } | null {
  if (!manuscript) return null;

  let last = scanTextForLastTime(manuscript.fileHeader.body, null);

  for (const segment of manuscript.segments) {
    if (segment.kind === "event") {
      const fromBar = parseTimeTag(timeTagFromEventSegment(segment));
      if (fromBar) {
        last = fromBar;
      }
    }
    last = scanTextForLastTime(segment.body, last);
  }
  return last;
}
