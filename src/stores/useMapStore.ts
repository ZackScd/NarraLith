import { create } from "zustand";

interface MapStoreV2 {
  activeMapId: string | null;
  setActiveMap: (mapId: string | null) => void;
  reset: () => void;
}

const initial = {
  activeMapId: null as string | null,
};

export const useMapStore = create<MapStoreV2>((set) => ({
  ...initial,
  setActiveMap: (mapId) => set({ activeMapId: mapId }),
  reset: () => set({ ...initial }),
}));
