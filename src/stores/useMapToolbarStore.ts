import { create } from "zustand";

import type { CalendarConfig } from "@/lib/types/calendar";
import type { MapSummaryV2 } from "@/lib/types/maps";
import type { TimelineEvent } from "@/lib/types/timeline";

export interface MapToolbarRegistration {
  active: boolean;
  mapTitle: string | null;
  maps: MapSummaryV2[];
  activeMapId: string | null;
  isPinned: boolean;
  creating: boolean;
  calendarReady: boolean;
  desde: string | null;
  desdeDisplay: string | null;
  mapId: string | null;
  baselineConfig: CalendarConfig | null;
  events: TimelineEvent[];
  onSelectMap: (mapId: string) => void;
  onPinToggle: () => void;
  onCreateMap: () => void;
  onDesdeUpdate: (desde: string | null) => Promise<void>;
  onDesdeSuggest: () => Promise<void>;
}

interface MapToolbarState extends MapToolbarRegistration {
  register: (snapshot: MapToolbarRegistration) => void;
  reset: () => void;
}

const noop = () => {};
const noopAsync = async () => {};

const idle: MapToolbarRegistration = {
  active: false,
  mapTitle: null,
  maps: [],
  activeMapId: null,
  isPinned: false,
  creating: false,
  calendarReady: false,
  desde: null,
  desdeDisplay: null,
  mapId: null,
  baselineConfig: null,
  events: [],
  onSelectMap: noop,
  onPinToggle: noop,
  onCreateMap: noop,
  onDesdeUpdate: noopAsync,
  onDesdeSuggest: noopAsync,
};

export const useMapToolbarStore = create<MapToolbarState>((set) => ({
  ...idle,
  register: (snapshot) => set(snapshot),
  reset: () => set(idle),
}));
