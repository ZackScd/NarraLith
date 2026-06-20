import { parseTimeTag } from "@/lib/calendar/dateTags";
import { toAbsoluteDay } from "@/lib/calendar/engine";
import type { CalendarConfig } from "@/lib/types/calendar";
import type {
  MapLocatedMarkerV1,
  MapLocationPinV1,
  ProjectLocationOccurrenceV1,
} from "@/lib/types/mapLocations";

function timeSortKey(raw: string, config: CalendarConfig): bigint | null {
  const parts = parseTimeTag(raw);
  if (!parts) return null;
  return toAbsoluteDay(parts, config);
}

/** Ocurrencias cuyo tiempo efectivo coincide con previewT (MAP-011 D3). */
export function filterOccurrencesAtT(
  occurrences: ProjectLocationOccurrenceV1[],
  previewT: string | null,
  config: CalendarConfig,
): ProjectLocationOccurrenceV1[] {
  if (!previewT?.trim()) return [];
  const tKey = timeSortKey(previewT.trim(), config);
  if (tKey === null) return [];
  return occurrences.filter((item) => {
    const itemKey = timeSortKey(item.effectiveTimeRaw, config);
    return itemKey !== null && itemKey === tKey;
  });
}

/** Une ocurrencias @ T con pins; dedupe por locationKey (primera ocurrencia gana label). */
export function mergeOccurrencesWithPins(
  occurrencesAtT: ProjectLocationOccurrenceV1[],
  pins: MapLocationPinV1[],
): { markers: MapLocatedMarkerV1[]; unpinnedKeys: string[] } {
  const pinByKey = new Map(pins.map((pin) => [pin.locationKey, pin]));
  const seenKeys = new Set<string>();
  const markers: MapLocatedMarkerV1[] = [];
  const unpinnedKeys: string[] = [];

  for (const occurrence of occurrencesAtT) {
    if (seenKeys.has(occurrence.locationKey)) continue;
    seenKeys.add(occurrence.locationKey);
    const pin = pinByKey.get(occurrence.locationKey);
    if (!pin) {
      unpinnedKeys.push(occurrence.locationKey);
      continue;
    }
    markers.push({
      pinId: pin.id,
      locationKey: occurrence.locationKey,
      label: pin.label ?? occurrence.label,
      x: pin.x,
      y: pin.y,
    });
  }

  return { markers, unpinnedKeys };
}
