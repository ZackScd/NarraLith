import { create } from "zustand";

import { trackAction } from "@/lib/action-audit/trackAction";
import { collectDescendantNavWindowIds } from "@/lib/maps/mapNavWindowFromHotspot";
import { clampFloatingPosition } from "@/lib/ui/clampFloatingPosition";

export type MapNavWindowMode = "interactive" | "edit";

export interface MapNavWindowEntry {
  navId: string;
  mode: MapNavWindowMode;
  position: { x: number; y: number };
  parentNavId?: string;
}

export const MAP_NAV_CHILD_WINDOW_WIDTH = 520;
export const MAP_NAV_CHILD_WINDOW_MIN_HEIGHT = 360;

const WINDOW_STAGGER = 28;
const DEFAULT_ORIGIN = { x: 96, y: 72 };

interface MapNavWindowsState {
  mapId: string | null;
  openWindows: MapNavWindowEntry[];
  openWindow: (
    navId: string,
    mode: MapNavWindowMode,
    options?: { parentNavId?: string; mapId?: string },
  ) => void;
  closeWindow: (navId: string) => void;
  closeAll: () => void;
  closeByMode: (mode: MapNavWindowMode) => void;
  setWindowPosition: (navId: string, position: { x: number; y: number }) => void;
  focusWindow: (navId: string) => void;
  syncForMap: (mapId: string) => void;
}

function defaultWindowPosition(index: number): { x: number; y: number } {
  if (typeof window === "undefined") {
    return DEFAULT_ORIGIN;
  }
  return clampFloatingPosition(
    DEFAULT_ORIGIN.x + index * WINDOW_STAGGER,
    DEFAULT_ORIGIN.y + index * WINDOW_STAGGER,
    { width: MAP_NAV_CHILD_WINDOW_WIDTH, height: MAP_NAV_CHILD_WINDOW_MIN_HEIGHT },
  );
}

function windowPositionForOpen(
  index: number,
  parentNavId: string | undefined,
  openWindows: MapNavWindowEntry[],
): { x: number; y: number } {
  if (!parentNavId) {
    return defaultWindowPosition(index);
  }
  const parent = openWindows.find((item) => item.navId === parentNavId);
  if (!parent) {
    return defaultWindowPosition(index);
  }
  return clampFloatingPosition(
    parent.position.x + WINDOW_STAGGER,
    parent.position.y + WINDOW_STAGGER,
    { width: MAP_NAV_CHILD_WINDOW_WIDTH, height: MAP_NAV_CHILD_WINDOW_MIN_HEIGHT },
  );
}

export const useMapNavWindowsStore = create<MapNavWindowsState>((set, get) => ({
  mapId: null,
  openWindows: [],

  openWindow: (navId, mode, options) => {
    const mapId = options?.mapId ?? get().mapId;
    const existing = get().openWindows.find((item) => item.navId === navId);
    if (existing) {
      set((state) => ({
        openWindows: [
          ...state.openWindows.filter((item) => item.navId !== navId),
          {
            ...existing,
            mode,
            parentNavId: options?.parentNavId ?? existing.parentNavId,
          },
        ],
      }));
      trackAction("map", "navWindowOpen", { mapId, navId, mode, focus: true });
      return;
    }
    const openWindows = get().openWindows;
    const entry: MapNavWindowEntry = {
      navId,
      mode,
      position: windowPositionForOpen(openWindows.length, options?.parentNavId, openWindows),
      parentNavId: options?.parentNavId,
    };
    set((state) => ({
      mapId: mapId ?? state.mapId,
      openWindows: [...state.openWindows, entry],
    }));
    trackAction("map", "navWindowOpen", { mapId, navId, mode, focus: false });
  },

  closeWindow: (navId) => {
    const mapId = get().mapId;
    const removeIds = collectDescendantNavWindowIds(navId, get().openWindows);
    set((state) => ({
      openWindows: state.openWindows.filter((item) => !removeIds.has(item.navId)),
    }));
    trackAction("map", "navWindowClose", { mapId, navId, cascade: removeIds.size > 1 });
  },

  closeAll: () => set({ openWindows: [] }),

  closeByMode: (mode) =>
    set((state) => ({
      openWindows: state.openWindows.filter((item) => item.mode !== mode),
    })),

  setWindowPosition: (navId, position) =>
    set((state) => ({
      openWindows: state.openWindows.map((item) =>
        item.navId === navId ? { ...item, position } : item,
      ),
    })),

  focusWindow: (navId) =>
    set((state) => {
      const target = state.openWindows.find((item) => item.navId === navId);
      if (!target) return state;
      return {
        openWindows: [
          ...state.openWindows.filter((item) => item.navId !== navId),
          target,
        ],
      };
    }),

  syncForMap: (mapId) => {
    if (get().mapId === mapId) return;
    set({ mapId, openWindows: [] });
  },
}));
