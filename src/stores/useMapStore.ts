import { create } from "zustand";

import type { MapDrawingRef } from "@/lib/types/maps";
import { DEFAULT_MAP_DRAWING_REF } from "@/lib/types/maps";

export type MapViewMode = "interactive" | "edit";

export interface PendingEditorLocationPin {
  locationKey: string;
  label: string;
  previewTRaw: string | null;
}

interface MapStoreV2 {
  activeMapId: string | null;
  activeMapTitle: string | null;
  viewMode: MapViewMode;
  activeDrawingRef: MapDrawingRef;
  previewTimeTRaw: string | null;
  previewTimeByMapId: Record<string, string>;
  pendingEditorLocationPin: PendingEditorLocationPin | null;
  setActiveMap: (mapId: string | null) => void;
  setViewMode: (mode: MapViewMode) => void;
  setActiveDrawingRef: (ref: MapDrawingRef) => void;
  setPreviewTimeTRaw: (raw: string | null, mapId?: string | null) => void;
  setPendingEditorLocationPin: (payload: PendingEditorLocationPin | null) => void;
  setActiveMapTitle: (title: string | null) => void;
  resetMapSessionState: (previewDefault?: string | null) => void;
  reset: () => void;
}

const initial = {
  activeMapId: null as string | null,
  activeMapTitle: null as string | null,
  viewMode: "interactive" as MapViewMode,
  activeDrawingRef: DEFAULT_MAP_DRAWING_REF,
  previewTimeTRaw: null as string | null,
  previewTimeByMapId: {} as Record<string, string>,
  pendingEditorLocationPin: null as PendingEditorLocationPin | null,
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
        previewTimeTRaw: restored,
        previewTimeByMapId: nextByMapId,
      };
    }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setActiveDrawingRef: (ref) => set({ activeDrawingRef: ref }),
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
  setPendingEditorLocationPin: (payload) => set({ pendingEditorLocationPin: payload }),
  setActiveMapTitle: (title) => set({ activeMapTitle: title }),
  resetMapSessionState: (previewDefault) =>
    set({
      previewTimeTRaw: previewDefault ?? null,
      pendingEditorLocationPin: null,
    }),
  reset: () => set({ ...initial }),
}));
