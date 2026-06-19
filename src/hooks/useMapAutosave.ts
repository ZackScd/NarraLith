import { useCallback, useEffect, useRef } from "react";

import { trackAction } from "@/lib/action-audit/trackAction";
import { countMapStrokes } from "@/lib/maps/mapDrawingStats";
import {
  MAP_AUTOSAVE_DEBOUNCE_MS,
  type MapAutosaveFlushReason,
} from "@/lib/maps/mapAutosave";
import type { MapSaveDrawingObsReason } from "@/lib/maps/mapSaveObs";
import { resolveMapSaveDrawingObsReason } from "@/lib/maps/mapSaveObs";
import type { MapDrawingSaveStatus } from "@/lib/maps/mapDrawingSession";
import type { MapDrawingV2 } from "@/lib/types/maps";

interface UseMapAutosaveOptions {
  enabled: boolean;
  mapId: string | null;
  drawing: MapDrawingV2 | null;
  activeLayerId?: string | null;
  isDirty: boolean;
  setSaveStatus: (status: MapDrawingSaveStatus) => void;
  markSaved: () => void;
  saveDrawing: (mapId: string, drawing: MapDrawingV2) => Promise<void>;
}

export function useMapAutosave({
  enabled,
  mapId,
  drawing,
  activeLayerId = null,
  isDirty,
  setSaveStatus,
  markSaved,
  saveDrawing,
}: UseMapAutosaveOptions) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savePromiseRef = useRef<Promise<boolean> | null>(null);
  const mapIdRef = useRef(mapId);
  const drawingRef = useRef(drawing);
  const activeLayerIdRef = useRef(activeLayerId);
  const isDirtyRef = useRef(isDirty);

  mapIdRef.current = mapId;
  drawingRef.current = drawing;
  activeLayerIdRef.current = activeLayerId;
  isDirtyRef.current = isDirty;

  const performSave = useCallback(
    async (
      _reason: MapAutosaveFlushReason,
      obsReasonOverride?: MapSaveDrawingObsReason,
    ): Promise<boolean> => {
      if (savePromiseRef.current) {
        const prior = await savePromiseRef.current;
        if (!isDirtyRef.current) {
          return prior;
        }
      }

      const targetMapId = mapIdRef.current;
      const targetDrawing = drawingRef.current;
      if (!targetMapId || !targetDrawing || !isDirtyRef.current) {
        return true;
      }

      const mapIdAtStart = targetMapId;
      setSaveStatus("saving");

      const promise = (async (): Promise<boolean> => {
        try {
          await saveDrawing(mapIdAtStart, targetDrawing);
          if (mapIdRef.current !== mapIdAtStart) {
            return true;
          }
          markSaved();
          trackAction("map", "saveDrawing", {
            mapId: mapIdAtStart,
            strokeCount: countMapStrokes(targetDrawing),
            layerCount: targetDrawing.layers.length,
            activeLayerId: activeLayerIdRef.current,
            visibleLayerIds: targetDrawing.layers
              .filter((layer) => layer.visible)
              .map((layer) => layer.id),
            reason: resolveMapSaveDrawingObsReason(_reason, obsReasonOverride),
          });
          return true;
        } catch {
          if (mapIdRef.current === mapIdAtStart) {
            setSaveStatus("error");
          }
          return false;
        } finally {
          savePromiseRef.current = null;
        }
      })();

      savePromiseRef.current = promise;
      return promise;
    },
    [markSaved, saveDrawing, setSaveStatus],
  );

  const flushAutosave = useCallback(
    (reason: MapAutosaveFlushReason, obsReasonOverride?: MapSaveDrawingObsReason) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      return performSave(reason, obsReasonOverride);
    },
    [performSave],
  );

  useEffect(() => {
    if (!enabled || !isDirty || !mapId || !drawing) {
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void performSave("debounce");
    }, MAP_AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [drawing, enabled, isDirty, mapId, performSave]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, [mapId]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const onPageHide = () => {
      void flushAutosave("pagehide");
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void flushAutosave("pagehide");
      }
    };

    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, flushAutosave]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      void performSave("pagehide");
    };
  }, [enabled, performSave]);

  return { flushAutosave };
}
