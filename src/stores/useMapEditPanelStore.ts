import { create } from "zustand";

export type MapEditPanelSectionId =
  | "maps"
  | "layers"
  | "patches"
  | "nav"
  | "hotspots"
  | "locations"
  | "studio"
  | "canvas"
  | "settings";

const STORAGE_KEY = "narralith.mapEditPanel.v1";
const DEFAULT_SECTION: MapEditPanelSectionId = "layers";

interface MapEditPanelPersist {
  activeSection: MapEditPanelSectionId;
  contentExpanded: boolean;
}

interface MapEditPanelState {
  mapId: string | null;
  contentExpanded: boolean;
  activeSection: MapEditPanelSectionId;
  setActiveSection: (section: MapEditPanelSectionId) => void;
  toggleContentExpanded: () => void;
  openSection: (section: MapEditPanelSectionId) => void;
  syncForMap: (mapId: string) => void;
}

function readPersist(mapId: string): MapEditPanelPersist | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, MapEditPanelPersist>;
    const entry = parsed[mapId];
    if (!entry || typeof entry.contentExpanded !== "boolean") return null;
    return entry;
  } catch {
    return null;
  }
}

function writePersist(mapId: string, state: MapEditPanelPersist) {
  if (typeof sessionStorage === "undefined") return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, MapEditPanelPersist>) : {};
    parsed[mapId] = state;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore quota / private mode
  }
}

function persistSnapshot(state: MapEditPanelState) {
  if (!state.mapId) return;
  writePersist(state.mapId, {
    activeSection: state.activeSection,
    contentExpanded: state.contentExpanded,
  });
}

export const useMapEditPanelStore = create<MapEditPanelState>((set, get) => ({
  mapId: null,
  contentExpanded: false,
  activeSection: DEFAULT_SECTION,
  syncForMap: (mapId) => {
    const saved = readPersist(mapId);
    const savedSection = saved?.activeSection ?? DEFAULT_SECTION;
    set({
      mapId,
      activeSection: savedSection === "maps" ? DEFAULT_SECTION : savedSection,
      contentExpanded: saved?.contentExpanded ?? false,
    });
  },
  setActiveSection: (section) => {
    set({ activeSection: section });
    persistSnapshot(get());
  },
  toggleContentExpanded: () => {
    set((state) => ({ contentExpanded: !state.contentExpanded }));
    persistSnapshot(get());
  },
  openSection: (section) => {
    set({ activeSection: section, contentExpanded: true });
    persistSnapshot(get());
  },
}));
