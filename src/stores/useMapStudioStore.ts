import { create } from "zustand";

import {
  clampStudioOpacity,
  clampStudioSize,
  getBrushPreset,
  MAP_STUDIO_DEFAULT_BRUSH_ID,
  MAP_STUDIO_DEFAULT_COLOR,
  MAP_STUDIO_PALETTE,
  type MapBrushId,
} from "@/lib/maps/mapBrushes";

export type MapStudioTool = "brush" | "eraser" | "pan";

interface MapStudioState {
  tool: MapStudioTool;
  brushId: MapBrushId;
  color: string;
  baseSize: number;
  baseOpacity: number;
  setTool: (tool: MapStudioTool) => void;
  setBrushId: (brushId: MapBrushId) => void;
  setColor: (color: string) => void;
  setBaseSize: (size: number) => void;
  setBaseOpacity: (opacity: number) => void;
  reset: () => void;
}

function defaultBrushValues(brushId: MapBrushId = MAP_STUDIO_DEFAULT_BRUSH_ID) {
  const preset = getBrushPreset(brushId);
  return {
    brushId,
    baseSize: preset.defaultSize,
    baseOpacity: preset.defaultOpacity,
  };
}

const initial = {
  tool: "brush" as MapStudioTool,
  color: MAP_STUDIO_DEFAULT_COLOR,
  ...defaultBrushValues(),
};

export const useMapStudioStore = create<MapStudioState>((set) => ({
  ...initial,
  setTool: (tool) => set({ tool }),
  setBrushId: (brushId) =>
    set({
      ...defaultBrushValues(brushId),
    }),
  setColor: (color) => set({ color }),
  setBaseSize: (size) => set({ baseSize: clampStudioSize(size) }),
  setBaseOpacity: (opacity) => set({ baseOpacity: clampStudioOpacity(opacity) }),
  reset: () => set({ ...initial }),
}));

export { MAP_STUDIO_PALETTE };
