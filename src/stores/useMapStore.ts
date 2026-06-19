import { create } from "zustand";

import type { MapDrawingRef } from "@/lib/types/maps";
import { DEFAULT_MAP_DRAWING_REF } from "@/lib/types/maps";

export type MapViewMode = "interactive" | "edit";

interface MapStoreV2 {
  activeMapId: string | null;
  viewMode: MapViewMode;
  activeDrawingRef: MapDrawingRef;
  previewTimeTRaw: string | null;
  setActiveMap: (mapId: string | null) => void;
  setViewMode: (mode: MapViewMode) => void;
  setActiveDrawingRef: (ref: MapDrawingRef) => void;
  setPreviewTimeTRaw: (raw: string | null) => void;
  resetMapSessionState: (previewDefault?: string | null) => void;
  reset: () => void;
}

const initial = {
  activeMapId: null as string | null,
  viewMode: "interactive" as MapViewMode,
  activeDrawingRef: DEFAULT_MAP_DRAWING_REF,
  previewTimeTRaw: null as string | null,
};

export const useMapStore = create<MapStoreV2>((set) => ({
  ...initial,
  setActiveMap: (mapId) =>
    set((state) => ({
      activeMapId: mapId,
      viewMode: state.activeMapId !== mapId ? "interactive" : state.viewMode,
      activeDrawingRef: DEFAULT_MAP_DRAWING_REF,
      previewTimeTRaw: null,
    })),
  setViewMode: (mode) => set({ viewMode: mode }),
  setActiveDrawingRef: (ref) => set({ activeDrawingRef: ref }),
  setPreviewTimeTRaw: (raw) => set({ previewTimeTRaw: raw }),
  resetMapSessionState: (previewDefault) =>
    set({
      previewTimeTRaw: previewDefault ?? null,
    }),
  reset: () => set({ ...initial }),
}));
