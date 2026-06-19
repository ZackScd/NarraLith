import { useEffect, useRef } from "react";

import {
  guardMapDrawingNavigation,
  registerMapDrawingGuard,
  unsavedContextToFlushReason,
  type MapUnsavedContext,
} from "@/lib/maps/mapDrawingGuard";
import { clearMapDrawingDraft } from "@/lib/maps/mapDrawingDraft";
import type { MapSaveDrawingObsReason } from "@/lib/maps/mapSaveObs";
import type { MapDrawingV2 } from "@/lib/types/maps";
import { useSettingsStore } from "@/stores/useSettingsStore";

interface UseMapDrawingGuardRegistrationOptions {
  enabled: boolean;
  projectRoot: string;
  mapId: string | null;
  diskDrawing: MapDrawingV2 | null;
  isDirty: boolean;
  flushAutosave: (
    reason: ReturnType<typeof unsavedContextToFlushReason>,
    obsReason?: MapSaveDrawingObsReason,
  ) => Promise<boolean>;
  resetFromSource: (drawing: MapDrawingV2 | null) => void;
}

export function useMapDrawingGuardRegistration({
  enabled,
  projectRoot,
  mapId,
  diskDrawing,
  isDirty,
  flushAutosave,
  resetFromSource,
}: UseMapDrawingGuardRegistrationOptions): void {
  const isDirtyRef = useRef(isDirty);
  const diskDrawingRef = useRef(diskDrawing);
  const mapIdRef = useRef(mapId);
  const projectRootRef = useRef(projectRoot);

  isDirtyRef.current = isDirty;
  diskDrawingRef.current = diskDrawing;
  mapIdRef.current = mapId;
  projectRootRef.current = projectRoot;

  useEffect(() => {
    if (!enabled) {
      return registerMapDrawingGuard(null);
    }

    return registerMapDrawingGuard({
      shouldGuard: () => isDirtyRef.current,
      mapId: () => mapIdRef.current,
      save: (context, options) =>
        flushAutosave(unsavedContextToFlushReason(context), options?.obsReason),
      discard: () => {
        resetFromSource(diskDrawingRef.current);
        const root = projectRootRef.current;
        const id = mapIdRef.current;
        if (root && id) {
          clearMapDrawingDraft(root, id);
        }
      },
      mapAutosaveEnabled: () => useSettingsStore.getState().mapAutosaveEnabled,
    });
  }, [enabled, flushAutosave, resetFromSource]);
}

export { guardMapDrawingNavigation, type MapUnsavedContext };
