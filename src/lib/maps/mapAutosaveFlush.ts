import type { MapAutosaveFlushReason } from "@/lib/maps/mapAutosave";
import {
  guardMapDrawingNavigation,
  type MapUnsavedContext,
} from "@/lib/maps/mapDrawingGuard";

export function flushReasonToUnsavedContext(
  reason: MapAutosaveFlushReason,
): MapUnsavedContext {
  switch (reason) {
    case "mapSwitch":
      return "mapSwitch";
    case "exitEdit":
      return "exitEdit";
    case "canvasOp":
      return "canvasOp";
    case "projectSwitch":
      return "projectSwitch";
    case "pagehide":
    case "manual":
    case "debounce":
      return "projectSwitch";
  }
}

/**
 * Comprueba/gestiona dibujo sucio antes de una acción destructiva (MAP-005b D24).
 * Modo manual → diálogo; autosave ON → guarda silencioso. Sin estudio montado → true.
 */
export async function flushMapDrawingAutosave(
  reason: MapAutosaveFlushReason = "projectSwitch",
): Promise<boolean> {
  return guardMapDrawingNavigation(async () => {}, flushReasonToUnsavedContext(reason));
}

