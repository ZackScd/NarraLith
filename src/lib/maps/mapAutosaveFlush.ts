import type { MapAutosaveFlushReason } from "@/lib/maps/mapAutosave";

type MapAutosaveFlushFn = (reason: MapAutosaveFlushReason) => Promise<boolean>;

let activeFlush: MapAutosaveFlushFn | null = null;

export function registerMapAutosaveFlush(fn: MapAutosaveFlushFn): () => void {
  activeFlush = fn;
  return () => {
    if (activeFlush === fn) {
      activeFlush = null;
    }
  };
}

/** Flush síncrono antes de cambio de proyecto (D15). No-op si el estudio no está montado. */
export async function flushMapDrawingAutosave(
  reason: MapAutosaveFlushReason = "projectSwitch",
): Promise<boolean> {
  if (!activeFlush) {
    return true;
  }
  return activeFlush(reason);
}
