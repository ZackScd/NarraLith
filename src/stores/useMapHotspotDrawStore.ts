import { create } from "zustand";

export type MapHotspotDrawTool = "lasso" | "rect" | "circle";

interface MapHotspotDrawState {
  tool: MapHotspotDrawTool;
  setTool: (tool: MapHotspotDrawTool) => void;
}

export const useMapHotspotDrawStore = create<MapHotspotDrawState>((set) => ({
  tool: "lasso",
  setTool: (tool) => set({ tool }),
}));
