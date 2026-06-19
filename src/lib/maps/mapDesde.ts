import { resolveMarkerPlacement } from "@/lib/calendar/markerPlacement";
import {
  formatTimeTag,
  formatTimeTagDisplay,
  parseTimeTag,
} from "@/lib/calendar/dateTags";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { TimelineEvent } from "@/lib/types/timeline";

export type MapDesdeSource = "timeline" | "epoch" | "manual" | "suggest";

export interface MapDesdeDefaultResult {
  raw: string | null;
  source: MapDesdeSource;
  display: string | null;
}

export type MapDesdeParts = { day: number; month: number; year: number };

export function parseMapDesde(raw: string | null | undefined): MapDesdeParts | null {
  return parseTimeTag(raw);
}

export function formatMapDesdeDisplay(
  raw: string | null,
  _config?: CalendarConfig | null,
): string | null {
  if (!raw?.trim()) return null;
  const parts = parseTimeTag(raw);
  if (!parts) return raw.trim();
  return formatTimeTagDisplay(parts);
}

/** Menor fecha cronológica entre marcas del proyecto; fallback epoch (MAP-007 D1). */
export function resolveDefaultMapDesde(
  events: TimelineEvent[],
  config: CalendarConfig,
  baselineConfig?: CalendarConfig | null,
): MapDesdeDefaultResult {
  let bestKey: bigint | null = null;
  let bestRaw: string | null = null;

  for (const event of events) {
    const placement = resolveMarkerPlacement(event, config, baselineConfig);
    if (!placement) continue;
    if (!parseTimeTag(placement.rawTime)) continue;
    if (bestKey === null || placement.sortKey < bestKey) {
      bestKey = placement.sortKey;
      bestRaw = placement.rawTime;
    }
  }

  if (bestRaw) {
    return {
      raw: bestRaw,
      source: "timeline",
      display: formatMapDesdeDisplay(bestRaw, config),
    };
  }

  const epoch = config.epoch;
  const epochRaw = formatTimeTag({
    day: epoch.day,
    month: epoch.month,
    year: epoch.year,
  });

  return {
    raw: epochRaw,
    source: "epoch",
    display: formatMapDesdeDisplay(epochRaw, config),
  };
}
