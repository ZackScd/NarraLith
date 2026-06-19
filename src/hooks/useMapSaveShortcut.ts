import { useEffect } from "react";

import type { MapViewMode } from "@/stores/useMapStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

interface UseMapSaveShortcutOptions {
  viewMode: MapViewMode;
  isDirty: boolean;
  onSave: () => Promise<boolean>;
}

/** Ctrl+S en vista mapa + modo edición (MAP-005b D23). */
export function useMapSaveShortcut({
  viewMode,
  isDirty,
  onSave,
}: UseMapSaveShortcutOptions) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (useWorkspaceStore.getState().mainView !== "map" || viewMode !== "edit") {
        return;
      }
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") {
        return;
      }
      if (event.shiftKey) {
        return;
      }
      event.preventDefault();
      if (!isDirty) {
        return;
      }
      void onSave();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDirty, onSave, viewMode]);
}
