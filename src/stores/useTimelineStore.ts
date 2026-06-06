import { create } from "zustand";

export type TimelineOrientation = "horizontal" | "vertical";
export type TimelineZoomUnit = "year" | "month" | "week" | "day";
export type TimelineZoomLevel =
  | "all"
  | "years4"
  | "years2"
  | "year1"
  | "months"
  | "days"
  | "hours";

export interface TimelineFilterState {
  manuscript: boolean;
  events: boolean;
  festivals: boolean;
  anniversaries: boolean;
  cosmic: boolean;
}

export interface TimelineCollapseLevels {
  years: boolean;
  months: boolean;
  days: boolean;
  hours: boolean;
}

export type TimelineCollapseLevelKey = keyof TimelineCollapseLevels;

interface TimelineState {
  orientation: TimelineOrientation;
  zoomLevel: TimelineZoomLevel;
  zoomButtonsMode: boolean;
  focusYear: number | null;
  focusMonth: number | null;
  focusDay: number | null;
  collapseDeadTime: boolean;
  collapseLevels: TimelineCollapseLevels;
  showHours: boolean;
  filters: TimelineFilterState;
  setOrientation: (orientation: TimelineOrientation) => void;
  setZoomLevel: (level: TimelineZoomLevel) => void;
  setZoomButtonsMode: (enabled: boolean) => void;
  zoomInLevel: (allowHours: boolean) => void;
  zoomOutLevel: () => void;
  setFocusDate: (parts: {
    year: number;
    month?: number | null;
    day?: number | null;
  }) => void;
  setCollapseDeadTime: (collapse: boolean) => void;
  setCollapseLevel: (level: TimelineCollapseLevelKey, checked: boolean) => void;
  setShowHours: (show: boolean) => void;
  toggleFilter: (key: keyof TimelineFilterState) => void;
  panLeft: () => void;
  panRight: () => void;
  reset: () => void;
}

const defaultFilters: TimelineFilterState = {
  manuscript: true,
  events: true,
  festivals: true,
  anniversaries: true,
  cosmic: false,
};

const defaultCollapseLevels: TimelineCollapseLevels = {
  years: true,
  months: false,
  days: false,
  hours: false,
};

const BASE_LEVELS: TimelineZoomLevel[] = [
  "all",
  "years4",
  "years2",
  "year1",
  "months",
  "days",
];

function levels(allowHours: boolean): TimelineZoomLevel[] {
  return allowHours ? [...BASE_LEVELS, "hours"] : BASE_LEVELS;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  orientation: "horizontal",
  zoomLevel: "years4",
  zoomButtonsMode: true,
  focusYear: null,
  focusMonth: 1,
  focusDay: 1,
  collapseDeadTime: true,
  collapseLevels: { ...defaultCollapseLevels },
  showHours: false,
  filters: { ...defaultFilters },

  setOrientation: (orientation) => set({ orientation }),

  setZoomLevel: (zoomLevel) => set({ zoomLevel }),
  setZoomButtonsMode: (zoomButtonsMode) => set({ zoomButtonsMode }),

  zoomInLevel: (allowHours) =>
    set((s) => {
      const order = levels(allowHours);
      const idx = order.indexOf(s.zoomLevel);
      const nextIdx = Math.min(order.length - 1, Math.max(0, idx) + 1);
      return { zoomLevel: order[nextIdx] };
    }),

  zoomOutLevel: () =>
    set((s) => {
      const order = levels(true);
      const idx = order.indexOf(s.zoomLevel);
      const nextIdx = Math.max(0, idx - 1);
      return { zoomLevel: order[nextIdx] };
    }),

  setFocusDate: ({ year, month, day }) =>
    set({
      focusYear: year,
      focusMonth: month ?? 1,
      focusDay: day ?? 1,
    }),

  setCollapseDeadTime: (collapseDeadTime) => set({ collapseDeadTime }),

  setCollapseLevel: (level, checked) =>
    set((s) => {
      const next = { ...s.collapseLevels };

      if (checked) {
        if (level === "hours") {
          next.hours = true;
          next.days = true;
          next.months = true;
          next.years = true;
        } else if (level === "days") {
          next.days = true;
          next.months = true;
          next.years = true;
        } else if (level === "months") {
          next.months = true;
          next.years = true;
        } else {
          next.years = true;
        }
      } else {
        if (level === "years") {
          next.years = false;
          next.months = false;
          next.days = false;
          next.hours = false;
        } else if (level === "months") {
          next.months = false;
          next.days = false;
          next.hours = false;
        } else if (level === "days") {
          next.days = false;
          next.hours = false;
        } else {
          next.hours = false;
        }
      }

      return { collapseLevels: next };
    }),

  setShowHours: (showHours) => set({ showHours }),

  toggleFilter: (key) =>
    set((s) => ({
      filters: { ...s.filters, [key]: !s.filters[key] },
    })),

  panLeft: () => {
    const { zoomLevel, focusYear, focusMonth, focusDay } = get();
    if (focusYear === null) return;
    if (zoomLevel === "months") {
      if ((focusMonth ?? 1) <= 1) {
        set({
          focusYear: focusYear - 1,
          focusMonth: 12,
          focusDay: 1,
        });
        return;
      }
      set({
        focusMonth: (focusMonth ?? 1) - 1,
        focusDay: 1,
      });
      return;
    }
    if (zoomLevel === "days" || zoomLevel === "hours") {
      set({ focusDay: Math.max(1, (focusDay ?? 1) - 1) });
      return;
    }
    set({ focusYear: focusYear - 1 });
  },

  panRight: () => {
    const { zoomLevel, focusYear, focusMonth, focusDay } = get();
    if (focusYear === null) return;
    if (zoomLevel === "months") {
      if ((focusMonth ?? 1) >= 12) {
        set({
          focusYear: focusYear + 1,
          focusMonth: 1,
          focusDay: 1,
        });
        return;
      }
      set({
        focusMonth: (focusMonth ?? 1) + 1,
        focusDay: 1,
      });
      return;
    }
    if (zoomLevel === "days" || zoomLevel === "hours") {
      set({ focusDay: (focusDay ?? 1) + 1 });
      return;
    }
    set({ focusYear: focusYear + 1 });
  },

  reset: () =>
    set({
      orientation: "horizontal",
      zoomLevel: "years4",
      zoomButtonsMode: true,
      focusYear: null,
      focusMonth: 1,
      focusDay: 1,
      collapseDeadTime: true,
      collapseLevels: { ...defaultCollapseLevels },
      showHours: false,
      filters: { ...defaultFilters },
    }),
}));
