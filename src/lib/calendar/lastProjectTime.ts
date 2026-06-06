import { fromAbsoluteDay, resolveTimeSortKey, toAbsoluteDay } from "@/lib/calendar";
import { yearsWithFileEntries } from "@/lib/calendar/calendarMarkers";
import { findLastAddedTimeInDocument, parseTimeTag } from "@/lib/calendar/dateTags";
import { timelineMarkerId } from "@/lib/calendar/timeMarks";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { ParsedDocument } from "@/lib/types/editor";
import type { LastAddedTimeMarker, TimelineEvent } from "@/lib/types/timeline";

type RankedMarker = {
  day: number;
  month: number;
  year: number;
  persistedAt: number;
  markerKey: string;
};

function isBetterMarker(candidate: RankedMarker, best: RankedMarker): boolean {
  if (candidate.persistedAt > 0 || best.persistedAt > 0) {
    if (candidate.persistedAt !== best.persistedAt) {
      return candidate.persistedAt > best.persistedAt;
    }
    return candidate.markerKey > best.markerKey;
  }

  return candidate.markerKey > best.markerKey;
}

/**
 * Última etiqueta de tiempo persistida en el proyecto (por `persistedAt`).
 * Fallback legacy: mayor `(path, blockIndex)` lexicográfico si no hay timestamps de persistencia.
 */
export function findLastAddedTimeInProject(
  events: TimelineEvent[],
): { day: number; month: number; year: number } | null {
  let best: RankedMarker | null = null;

  for (const ev of events) {
    const parsed = parseTimeTag(ev.rawTime);
    if (!parsed) continue;

    const candidate: RankedMarker = {
      ...parsed,
      persistedAt: ev.persistedAt ?? 0,
      markerKey: timelineMarkerId(ev),
    };

    if (!best || isBetterMarker(candidate, best)) {
      best = candidate;
    }
  }

  if (!best) return null;
  return { day: best.day, month: best.month, year: best.year };
}

/** Resuelve la fecha global priorizando la consulta directa de última persistencia. */
export function resolveGlobalLastAddedTime(
  lastAdded: LastAddedTimeMarker | null,
  events: TimelineEvent[],
): { day: number; month: number; year: number } | null {
  if (lastAdded) {
    const parsed = parseTimeTag(lastAdded.rawTime);
    if (parsed) return parsed;
  }
  return findLastAddedTimeInProject(events);
}

/** Prioriza el manuscrito activo; si no, la heurística de proyecto. */
export function resolveReferenceCalendarDate(
  document: ParsedDocument | null,
  events: TimelineEvent[],
  fallback: { day: number; month: number; year: number },
  lastAdded?: LastAddedTimeMarker | null,
): { day: number; month: number; year: number } {
  const fromDocument = findLastAddedTimeInDocument(document);
  if (fromDocument) {
    return fromDocument;
  }
  return resolveGlobalLastAddedTime(lastAdded ?? null, events) ?? fallback;
}

export function resolveReferenceYear(
  document: ParsedDocument | null,
  events: TimelineEvent[],
  fallbackYear: number,
  lastAdded?: LastAddedTimeMarker | null,
): number {
  return resolveReferenceCalendarDate(
    document,
    events,
    {
      day: 1,
      month: 1,
      year: fallbackYear,
    },
    lastAdded,
  ).year;
}

/** Año del evento con marca temporal más reciente (por timestamp absoluto). */
export function findLatestEventYear(
  events: TimelineEvent[],
  config: CalendarConfig,
): number | null {
  let bestKey: bigint | null = null;

  for (const ev of events) {
    let sortKey: bigint | null = null;
    if (ev.timestamp) {
      try {
        sortKey = BigInt(ev.timestamp);
      } catch {
        sortKey = null;
      }
    }
    if (sortKey === null) {
      const resolved = resolveTimeSortKey(ev.rawTime, config);
      if (resolved) {
        try {
          sortKey = BigInt(resolved);
        } catch {
          sortKey = null;
        }
      }
    }
    if (sortKey === null) {
      const parts = parseTimeTag(ev.rawTime);
      if (parts) {
        sortKey = toAbsoluteDay(parts, config);
      }
    }
    if (sortKey === null) continue;
    if (bestKey === null || sortKey > bestKey) {
      bestKey = sortKey;
    }
  }

  if (bestKey === null) return null;
  return fromAbsoluteDay(bestKey, config).year;
}

/** Año inicial al abrir la vista calendario: última etiqueta de tiempo en el manuscrito. */
export function resolveInitialCalendarYear(
  events: TimelineEvent[],
  config: CalendarConfig,
  lastAdded?: LastAddedTimeMarker | null,
): number {
  const fromManuscript = resolveGlobalLastAddedTime(lastAdded ?? null, events);
  if (fromManuscript !== null) return fromManuscript.year;

  const years = yearsWithFileEntries(events, config);
  if (years.length > 0) return years[years.length - 1]!;

  return config.epoch.year ?? 1;
}
