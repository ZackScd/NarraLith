import { create } from "zustand";

export type MapEditPanelSectionId =
  | "maps"
  | "layers"
  | "patches"
  | "nav"
  | "hotspots"
  | "locations"
  | "studio";

interface MapEditPanelState {
  contentExpanded: boolean;
  activeSection: MapEditPanelSectionId;
  setActiveSection: (section: MapEditPanelSectionId) => void;
  toggleContentExpanded: () => void;
  openSection: (section: MapEditPanelSectionId) => void;
}

export const useMapEditPanelStore = create<MapEditPanelState>((set) => ({
  contentExpanded: true,
  activeSection: "layers",
  setActiveSection: (section) => set({ activeSection: section }),
  toggleContentExpanded: () =>
    set((state) => ({ contentExpanded: !state.contentExpanded })),
  openSection: (section) =>
    set({ activeSection: section, contentExpanded: true }),
}));
