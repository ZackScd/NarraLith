import { create } from "zustand";

import type { MapDrawingRef, MapNavFrame } from "@/lib/types/maps";
import { DEFAULT_MAP_DRAWING_REF } from "@/lib/types/maps";

export type MapViewMode = "interactive" | "edit";

interface MapStoreV2 {
  activeMapId: string | null;
  viewMode: MapViewMode;
  activeDrawingRef: MapDrawingRef;
  navStack: MapNavFrame[];
  previewTimeTRaw: string | null;
  previewTimeByMapId: Record<string, string>;
  setActiveMap: (mapId: string | null) => void;
  setViewMode: (mode: MapViewMode) => void;
  setActiveDrawingRef: (ref: MapDrawingRef) => void;
  navPush: (frame: MapNavFrame) => void;
  navPop: (toDepth?: number) => void;
  resetNavStack: () => void;
  setPreviewTimeTRaw: (raw: string | null, mapId?: string | null) => void;
  resetMapSessionState: (previewDefault?: string | null) => void;
  reset: () => void;
}

const initial = {
  activeMapId: null as string | null,
  viewMode: "interactive" as MapViewMode,
  activeDrawingRef: DEFAULT_MAP_DRAWING_REF,
  navStack: [] as MapNavFrame[],
  previewTimeTRaw: null as string | null,
  previewTimeByMapId: {} as Record<string, string>,
};

export const useMapStore = create<MapStoreV2>((set) => ({
  ...initial,
  setActiveMap: (mapId) =>
    set((state) => {
      const nextByMapId = { ...state.previewTimeByMapId };
      if (state.activeMapId && state.previewTimeTRaw?.trim()) {
        nextByMapId[state.activeMapId] = state.previewTimeTRaw.trim();
      }
      const restored =
        mapId && nextByMapId[mapId] ? nextByMapId[mapId] : null;
      return {
        activeMapId: mapId,
        viewMode: state.activeMapId !== mapId ? "interactive" : state.viewMode,
        activeDrawingRef: DEFAULT_MAP_DRAWING_REF,
        navStack: state.activeMapId !== mapId ? [] : state.navStack,
        previewTimeTRaw: restored,
        previewTimeByMapId: nextByMapId,
      };
    }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setActiveDrawingRef: (ref) => set({ activeDrawingRef: ref }),
  navPush: (frame) =>
    set((state) => ({
      navStack: [...state.navStack, frame],
    })),
  navPop: (toDepth) =>
    set((state) => {
      if (state.navStack.length === 0) {
        return state;
      }
      if (toDepth === undefined) {
        return { navStack: state.navStack.slice(0, -1) };
      }
      return { navStack: state.navStack.slice(0, Math.max(0, toDepth)) };
    }),
  resetNavStack: () => set({ navStack: [] }),
  setPreviewTimeTRaw: (raw, mapId) =>
    set((state) => {
      const targetMapId = mapId ?? state.activeMapId;
      const trimmed = raw?.trim() ? raw.trim() : null;
      const nextByMapId =
        targetMapId && trimmed
          ? { ...state.previewTimeByMapId, [targetMapId]: trimmed }
          : state.previewTimeByMapId;
      return {
        previewTimeTRaw: trimmed,
        previewTimeByMapId: nextByMapId,
      };
    }),
  resetMapSessionState: (previewDefault) =>
    set({
      previewTimeTRaw: previewDefault ?? null,
      navStack: [],
    }),
  reset: () => set({ ...initial }),
}));
