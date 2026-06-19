import type { MapAutosaveFlushReason } from "@/lib/maps/mapAutosave";

export type MapSaveDrawingObsReason = "manual" | "autosave" | "dialog";

/** Normaliza reason IPC → categoría OBS (MAP-005b §6). */
export function resolveMapSaveDrawingObsReason(
  reason: MapAutosaveFlushReason,
  override?: MapSaveDrawingObsReason,
): MapSaveDrawingObsReason {
  if (override) {
    return override;
  }
  if (reason === "manual") {
    return "manual";
  }
  if (reason === "debounce" || reason === "pagehide") {
    return "autosave";
  }
  return "autosave";
}
