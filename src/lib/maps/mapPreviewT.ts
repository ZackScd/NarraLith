export type MapPreviewTSource =
  | "scrubber"
  | "picker"
  | "mapLoad"
  | "desdeSync"
  | "markerClick";

/** T efectivo para composición: preview en RAM o fallback Desde. */
export function resolveMapPreviewT(
  previewTimeTRaw: string | null,
  mapDesde: string | null,
): string | null {
  if (previewTimeTRaw?.trim()) {
    return previewTimeTRaw.trim();
  }
  if (mapDesde?.trim()) {
    return mapDesde.trim();
  }
  return null;
}
