import { useEffect } from "react";

import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import type { MapViewMode } from "@/stores/useMapStore";

interface UseMapStudioShortcutsOptions {
  viewMode: MapViewMode;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

/** Ctrl+Z / Ctrl+Y en vista mapa + modo edición (MAP-005 D8). */
export function useMapStudioShortcuts({
  viewMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: UseMapStudioShortcutsOptions) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (useWorkspaceStore.getState().mainView !== "map" || viewMode !== "edit") {
        return;
      }
      if (!(event.ctrlKey || event.metaKey)) return;

      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        if (!canUndo) return;
        event.preventDefault();
        onUndo();
        return;
      }
      if (key === "y" || (key === "z" && event.shiftKey)) {
        if (!canRedo) return;
        event.preventDefault();
        onRedo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canRedo, canUndo, onRedo, onUndo, viewMode]);
}
