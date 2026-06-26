import { create } from "zustand";

export type MapLayersWindowTab = "layers" | "patches" | "nav";

export type PatchListSortMode = "manual" | "baseFirst" | "chrono";

const STORAGE_KEY = "narralith.mapLayersWindow.v1";

interface MapLayersWindowPersist {
  activeTab: MapLayersWindowTab;
  combinedCapasParches: boolean;
  showInactiveAtT: boolean;
  patchSortMode: PatchListSortMode;
  expandedSecondaryIds: string[];
}

interface MapLayersWindowState {
  mapId: string | null;
  activeTab: MapLayersWindowTab;
  combinedCapasParches: boolean;
  showInactiveAtT: boolean;
  patchSortMode: PatchListSortMode;
  expandedSecondaryIds: string[];
  setActiveTab: (tab: MapLayersWindowTab) => void;
  toggleCombinedCapasParches: () => void;
  toggleShowInactiveAtT: () => void;
  cyclePatchSortMode: () => void;
  toggleSecondaryExpanded: (secondaryId: string) => void;
  syncForMap: (mapId: string) => void;
}

function readPersist(mapId: string): MapLayersWindowPersist | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, MapLayersWindowPersist>;
    return parsed[mapId] ?? null;
  } catch {
    return null;
  }
}

function writePersist(mapId: string, state: MapLayersWindowPersist) {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, MapLayersWindowPersist>) : {};
    parsed[mapId] = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore
  }
}

function persistSnapshot(state: MapLayersWindowState) {
  if (!state.mapId) return;
  writePersist(state.mapId, {
    activeTab: state.activeTab,
    combinedCapasParches: state.combinedCapasParches,
    showInactiveAtT: state.showInactiveAtT,
    patchSortMode: state.patchSortMode,
    expandedSecondaryIds: state.expandedSecondaryIds,
  });
}

export function cyclePatchSortMode(mode: PatchListSortMode): PatchListSortMode {
  if (mode === "manual") return "baseFirst";
  if (mode === "baseFirst") return "chrono";
  return "manual";
}

export const useMapLayersWindowStore = create<MapLayersWindowState>((set, get) => ({
  mapId: null,
  activeTab: "layers",
  combinedCapasParches: false,
  showInactiveAtT: false,
  patchSortMode: "manual",
  expandedSecondaryIds: [],

  syncForMap: (mapId) => {
    const saved = readPersist(mapId);
    set({
      mapId,
      activeTab: saved?.activeTab ?? "layers",
      combinedCapasParches: saved?.combinedCapasParches ?? false,
      showInactiveAtT: saved?.showInactiveAtT ?? false,
      patchSortMode: saved?.patchSortMode ?? "manual",
      expandedSecondaryIds: saved?.expandedSecondaryIds ?? [],
    });
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
    persistSnapshot(get());
  },

  toggleCombinedCapasParches: () => {
    set((state) => ({
      combinedCapasParches: !state.combinedCapasParches,
      activeTab: "layers",
    }));
    persistSnapshot(get());
  },

  toggleShowInactiveAtT: () => {
    set((state) => ({ showInactiveAtT: !state.showInactiveAtT }));
    persistSnapshot(get());
  },

  cyclePatchSortMode: () => {
    set((state) => ({ patchSortMode: cyclePatchSortMode(state.patchSortMode) }));
    persistSnapshot(get());
  },

  toggleSecondaryExpanded: (secondaryId) => {
    set((state) => {
      const expanded = state.expandedSecondaryIds.includes(secondaryId)
        ? state.expandedSecondaryIds.filter((id) => id !== secondaryId)
        : [...state.expandedSecondaryIds, secondaryId];
      return { expandedSecondaryIds: expanded };
    });
    persistSnapshot(get());
  },
}));
