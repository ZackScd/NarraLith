import { parseTimeTag } from "@/lib/calendar/dateTags";
import { toAbsoluteDay } from "@/lib/calendar/engine";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { MapSecondarySummaryV1 } from "@/lib/types/maps";

const DEFAULT_PADDING_DAYS = 365;
const MIN_SPAN_DAYS = 30;

export interface MapTimelineSecondaryAnchor {
  id: string;
  name: string;
  inicioDay: bigint;
  finDay: bigint | null;
}

export interface MapTimelineRange {
  minDay: bigint;
  maxDay: bigint;
  desdeDay: bigint | null;
  secondaryAnchors: MapTimelineSecondaryAnchor[];
}

function parseDay(raw: string | null | undefined, config: CalendarConfig): bigint | null {
  if (!raw?.trim()) return null;
  const parts = parseTimeTag(raw.trim());
  if (!parts) return null;
  return toAbsoluteDay(parts, config);
}

export function computeMapTimelineRange(
  mapDesde: string | null,
  secondaries: MapSecondarySummaryV1[],
  previewT: string | null,
  config: CalendarConfig,
  options?: { paddingDays?: number },
): MapTimelineRange {
  const padding = BigInt(options?.paddingDays ?? DEFAULT_PADDING_DAYS);
  const days: bigint[] = [];
  const secondaryAnchors: MapTimelineSecondaryAnchor[] = [];

  const desdeDay = parseDay(mapDesde, config);
  if (desdeDay !== null) {
    days.push(desdeDay);
  }

  for (const secondary of secondaries) {
    const inicioDay = parseDay(secondary.tiempoInicio, config);
    const finDay = parseDay(secondary.tiempoFin, config);
    if (inicioDay === null) continue;
    days.push(inicioDay);
    if (finDay !== null) {
      days.push(finDay);
    }
    secondaryAnchors.push({
      id: secondary.id,
      name: secondary.name,
      inicioDay,
      finDay,
    });
  }

  const previewDay = parseDay(previewT, config);
  if (previewDay !== null) {
    days.push(previewDay);
  }

  if (days.length === 0) {
    const epochDay = toAbsoluteDay(config.epoch, config);
    return {
      minDay: epochDay,
      maxDay: epochDay + padding,
      desdeDay: null,
      secondaryAnchors,
    };
  }

  let minDay = days.reduce((a, b) => (a < b ? a : b));
  let maxDay = days.reduce((a, b) => (a > b ? a : b));

  minDay -= padding;
  maxDay += padding;

  let span = maxDay - minDay;
  if (span < BigInt(MIN_SPAN_DAYS)) {
    const mid = (minDay + maxDay) / 2n;
    const half = BigInt(Math.floor(MIN_SPAN_DAYS / 2));
    minDay = mid - half;
    maxDay = mid + half;
    span = maxDay - minDay;
  }

  return {
    minDay,
    maxDay,
    desdeDay,
    secondaryAnchors,
  };
}
