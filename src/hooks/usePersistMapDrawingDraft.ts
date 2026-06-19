import { useEffect, useRef } from "react";

import { trackAction } from "@/lib/action-audit/trackAction";
import {
  clearMapDrawingDraft,
  setMapDrawingDraft,
  type MapDrawingDraft,
} from "@/lib/maps/mapDrawingDraft";
import { countMapStrokes } from "@/lib/maps/mapDrawingStats";
import type { MapDrawingV2 } from "@/lib/types/maps";

const PERSIST_DEBOUNCE_MS = 400;

interface UsePersistMapDrawingDraftOptions {
  enabled: boolean;
  projectRoot: string;
  mapId: string | null;
  isDirty: boolean;
  drawing: MapDrawingV2 | null;
  undoDepth: number;
  redoDepth: number;
  exportDraft: () => MapDrawingDraft | null;
}

/** Persiste borrador sucio del estudio mapas en localStorage (MAP-005b D19). */
export function usePersistMapDrawingDraft({
  enabled,
  projectRoot,
  mapId,
  isDirty,
  drawing,
  undoDepth,
  redoDepth,
  exportDraft,
}: UsePersistMapDrawingDraftOptions): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exportDraftRef = useRef(exportDraft);

  exportDraftRef.current = exportDraft;

  useEffect(() => {
    if (!enabled || !projectRoot || !mapId) {
      return;
    }

    const persistNow = () => {
      if (!isDirty) {
        clearMapDrawingDraft(projectRoot, mapId);
        return;
      }
      const draft = exportDraftRef.current();
      if (!draft) {
        clearMapDrawingDraft(projectRoot, mapId);
        return;
      }
      setMapDrawingDraft(projectRoot, mapId, draft);
      trackAction(
        "map",
        "draftPersist",
        {
          mapId,
          strokeCount: countMapStrokes(draft.drawing),
          layerCount: draft.drawing.layers.length,
          activeLayerId: draft.activeLayerId,
          undoDepth: draft.undoOps.length,
        },
        { channel: "verbose" },
      );
    };

    const persistDebounced = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        persistNow();
      }, PERSIST_DEBOUNCE_MS);
    };

    if (!isDirty) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      clearMapDrawingDraft(projectRoot, mapId);
      return;
    }

    persistDebounced();

    const flushOnHide = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      persistNow();
    };

    window.addEventListener("pagehide", flushOnHide);
    window.addEventListener("beforeunload", flushOnHide);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      window.removeEventListener("pagehide", flushOnHide);
      window.removeEventListener("beforeunload", flushOnHide);
      flushOnHide();
    };
  }, [drawing, enabled, isDirty, mapId, projectRoot, redoDepth, undoDepth]);
}
