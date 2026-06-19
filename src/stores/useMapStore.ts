import { create } from "zustand";

export type MapViewMode = "interactive" | "edit";

interface MapStoreV2 {
  activeMapId: string | null;
  viewMode: MapViewMode;
  setActiveMap: (mapId: string | null) => void;
  setViewMode: (mode: MapViewMode) => void;
  reset: () => void;
}

const initial = {
  activeMapId: null as string | null,
  viewMode: "interactive" as MapViewMode,
};

export const useMapStore = create<MapStoreV2>((set) => ({
  ...initial,
  setActiveMap: (mapId) =>
    set((state) => ({
      activeMapId: mapId,
      viewMode: state.activeMapId !== mapId ? "interactive" : state.viewMode,
    })),
  setViewMode: (mode) => set({ viewMode: mode }),
  reset: () => set({ ...initial }),
}));
