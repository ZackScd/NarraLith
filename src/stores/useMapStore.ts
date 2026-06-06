import { create } from "zustand";

import type { MapDrawMode } from "@/lib/types/maps";

export type MapEditorMode = "studio" | "interactive";

interface MapUiState {
  activeMapId: string | null;
  /** Pila de mapas para drill-down (el último es el activo). */
  mapStack: string[];
  /** Estudio de dibujo (Sketchbook) vs mapa interactivo (Leaflet). */
  mapEditorMode: MapEditorMode;
  previewTimestamp: string | null;
  drawMode: MapDrawMode;
  selectedFeatureId: string | null;
  isPlaying: boolean;
  sketchesVisible: boolean;
  setActiveMap: (mapId: string | null) => void;
  pushMap: (mapId: string) => void;
  popToMap: (mapId: string) => void;
  resetStack: () => void;
  setPreviewTimestamp: (ts: string | null) => void;
  setDrawMode: (mode: MapDrawMode) => void;
  setSelectedFeatureId: (id: string | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setSketchesVisible: (visible: boolean) => void;
  setMapEditorMode: (mode: MapEditorMode) => void;
  reset: () => void;
}

const initial = {
  activeMapId: null as string | null,
  mapStack: [] as string[],
  mapEditorMode: "studio" as MapEditorMode,
  previewTimestamp: null as string | null,
  drawMode: "select" as MapDrawMode,
  selectedFeatureId: null as string | null,
  isPlaying: false,
  sketchesVisible: false,
};

export const useMapStore = create<MapUiState>((set, get) => ({
  ...initial,
  setActiveMap: (mapId) =>
    set({
      activeMapId: mapId,
      mapStack: mapId ? [mapId] : [],
      previewTimestamp: null,
      selectedFeatureId: null,
      sketchesVisible: false,
    }),
  pushMap: (mapId) => {
    const stack = [...get().mapStack];
    if (stack[stack.length - 1] !== mapId) {
      stack.push(mapId);
    }
    set({ activeMapId: mapId, mapStack: stack, selectedFeatureId: null });
  },
  popToMap: (mapId) => {
    const stack = get().mapStack;
    const idx = stack.indexOf(mapId);
    if (idx < 0) {
      set({ activeMapId: mapId, mapStack: [mapId] });
      return;
    }
    set({
      activeMapId: mapId,
      mapStack: stack.slice(0, idx + 1),
      selectedFeatureId: null,
    });
  },
  resetStack: () => set({ ...initial }),
  setPreviewTimestamp: (ts) => set({ previewTimestamp: ts }),
  setDrawMode: (mode) => set({ drawMode: mode, selectedFeatureId: null }),
  setSelectedFeatureId: (id) => set({ selectedFeatureId: id }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setSketchesVisible: (visible) => set({ sketchesVisible: visible }),
  setMapEditorMode: (mode) => set({ mapEditorMode: mode }),
  reset: () => set({ ...initial }),
}));
