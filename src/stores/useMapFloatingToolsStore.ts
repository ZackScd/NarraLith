import { create } from "zustand";

import { clampFloatingPosition } from "@/lib/ui/clampFloatingPosition";

export type MapFloatingToolsSectionId =
  | "maps"
  | "layers"
  | "patches"
  | "nav"
  | "hotspots"
  | "locations"
  | "studio"
  | "canvas"
  | "settings";

const STORAGE_KEY = "narralith.mapFloatingTools.v1";
const DEFAULT_SECTION: MapFloatingToolsSectionId = "layers";
const LEGACY_LAYER_SECTIONS = new Set<MapFloatingToolsSectionId>([
  "patches",
  "nav",
  "hotspots",
]);
export const MAP_FLOATING_PANEL_WIDTH = 256;
export const MAP_FLOATING_PANEL_MIN_HEIGHT = 360;
export const MAP_SIDE_RAIL_WIDTH = 40;
const DEFAULT_TOP_OFFSET = 80;

interface MapFloatingToolsPersist {
  isOpen: boolean;
  position: { x: number; y: number };
  activeSection: MapFloatingToolsSectionId;
}

interface MapFloatingToolsState {
  mapId: string | null;
  isOpen: boolean;
  position: { x: number; y: number };
  activeSection: MapFloatingToolsSectionId;
  setPosition: (position: { x: number; y: number }) => void;
  setActiveSection: (section: MapFloatingToolsSectionId) => void;
  toggleOpen: () => void;
  openSection: (section: MapFloatingToolsSectionId) => void;
  close: () => void;
  syncForMap: (mapId: string) => void;
}

export function defaultMapFloatingToolsPosition(): { x: number; y: number } {
  if (typeof window === "undefined") {
    return { x: 200, y: DEFAULT_TOP_OFFSET };
  }
  return clampFloatingPosition(
    window.innerWidth - MAP_SIDE_RAIL_WIDTH - MAP_FLOATING_PANEL_WIDTH - 8,
    DEFAULT_TOP_OFFSET,
    { width: MAP_FLOATING_PANEL_WIDTH, height: MAP_FLOATING_PANEL_MIN_HEIGHT },
  );
}

function readPersist(mapId: string): MapFloatingToolsPersist | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, MapFloatingToolsPersist>;
    const entry = parsed[mapId];
    if (
      !entry ||
      typeof entry.isOpen !== "boolean" ||
      typeof entry.position?.x !== "number" ||
      typeof entry.position?.y !== "number"
    ) {
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function writePersist(mapId: string, state: MapFloatingToolsPersist) {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, MapFloatingToolsPersist>) : {};
    parsed[mapId] = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore quota / private mode
  }
}

function persistSnapshot(state: MapFloatingToolsState) {
  if (!state.mapId) return;
  writePersist(state.mapId, {
    isOpen: state.isOpen,
    position: state.position,
    activeSection: state.activeSection,
  });
}

export const useMapFloatingToolsStore = create<MapFloatingToolsState>((set, get) => ({
  mapId: null,
  isOpen: false,
  position: defaultMapFloatingToolsPosition(),
  activeSection: DEFAULT_SECTION,

  syncForMap: (mapId) => {
    const saved = readPersist(mapId);
    let savedSection = saved?.activeSection ?? DEFAULT_SECTION;
    if (savedSection === "maps" || LEGACY_LAYER_SECTIONS.has(savedSection)) {
      savedSection = DEFAULT_SECTION;
    }
    set({
      mapId,
      activeSection: savedSection,
      isOpen: false,
      position: saved?.position ?? defaultMapFloatingToolsPosition(),
    });
  },

  setPosition: (position) => {
    set({ position });
    persistSnapshot(get());
  },

  setActiveSection: (section) => {
    set({ activeSection: section });
    persistSnapshot(get());
  },

  toggleOpen: () => {
    set((state) => ({ isOpen: !state.isOpen }));
    persistSnapshot(get());
  },

  openSection: (section) => {
    set({ activeSection: section, isOpen: true });
    persistSnapshot(get());
  },

  close: () => {
    set({ isOpen: false });
    persistSnapshot(get());
  },
}));
