import { parseTimeTag } from "@/lib/calendar/dateTags";
import { toAbsoluteDay } from "@/lib/calendar/engine";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { MapSecondaryDrawingFileV1 } from "@/lib/types/maps";

type SecondaryTimeFields = Pick<MapSecondaryDrawingFileV1, "tiempoInicio" | "tiempoFin">;

function timeSortKey(raw: string, config: CalendarConfig): bigint | null {
  const parts = parseTimeTag(raw);
  if (!parts) {
    return null;
  }
  return toAbsoluteDay(parts, config);
}

/** Reglas §4.3 — visibilidad de un parche en T preview. */
export function isSecondaryVisibleAtT(
  secondary: SecondaryTimeFields,
  mapDesde: string | null,
  previewT: string,
  config: CalendarConfig,
): boolean {
  const tKey = timeSortKey(previewT, config);
  const inicioKey = timeSortKey(secondary.tiempoInicio, config);
  if (tKey === null || inicioKey === null) {
    return false;
  }

  const finKey = secondary.tiempoFin?.trim()
    ? timeSortKey(secondary.tiempoFin, config)
    : null;
  if (secondary.tiempoFin?.trim() && finKey === null) {
    return false;
  }

  if (!mapDesde?.trim()) {
    if (tKey < inicioKey) {
      return false;
    }
    if (finKey !== null && tKey > finKey) {
      return false;
    }
    return true;
  }

  const desdeKey = timeSortKey(mapDesde, config);
  if (desdeKey === null) {
    return false;
  }

  const isForward = inicioKey >= desdeKey;

  if (isForward) {
    if (tKey < inicioKey) {
      return false;
    }
    if (finKey !== null && tKey > finKey) {
      return false;
    }
    return true;
  }

  if (tKey > inicioKey) {
    return false;
  }
  if (finKey !== null && tKey < finKey) {
    return false;
  }
  return true;
}

/** Z-order composición §4.3.1 — más antiguo abajo. */
export function sortSecondariesForCompose<T extends SecondaryTimeFields & { id: string }>(
  secondaries: T[],
  config: CalendarConfig,
): T[] {
  return [...secondaries].sort((a, b) => {
    const aKey = timeSortKey(a.tiempoInicio, config) ?? 0n;
    const bKey = timeSortKey(b.tiempoInicio, config) ?? 0n;
    if (aKey < bKey) {
      return -1;
    }
    if (aKey > bKey) {
      return 1;
    }
    return a.id.localeCompare(b.id);
  });
}

export function filterVisibleSecondaries<T extends SecondaryTimeFields & { id: string }>(
  secondaries: T[],
  mapDesde: string | null,
  previewT: string,
  config: CalendarConfig,
): T[] {
  return sortSecondariesForCompose(secondaries, config).filter((secondary) =>
    isSecondaryVisibleAtT(secondary, mapDesde, previewT, config),
  );
}
