import { create } from "zustand";

import {
  calendarConfigRevision,
  isCalendarDraftDirty,
} from "@/lib/calendar/calendarRevision";
import { effectiveCalendarForYear } from "@/lib/calendar/effectiveCalendar";
import { normalizeCalendarConfig } from "@/lib/calendar/normalizeCalendarConfig";
import { normalizeAnnualEventsForDraft } from "@/lib/calendar/recurringEvents";
import { calendarErrorKey } from "@/lib/calendar/calendarErrors";
import { invokeCommand, parseAppError } from "@/lib/ipc";
import type { SpecialMonthExpand } from "@/modules/calendar/SpecialYearMonthsEditor";
import type { CalendarConfig } from "@/lib/types/calendar";
import { useCalendarStore, validateCalendarDraft } from "@/stores/useCalendarStore";
import { useProjectTimelineStore } from "@/stores/useProjectTimelineStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

export type CalendarUnsavedContext = "leave" | "section";

interface CalendarViewState {
  viewYear: number;
  /** Proyecto para el que ya se aplicó el año inicial del manuscrito en esta sesión. */
  calendarYearHydratedProjectKey: string | null;
  /** Proyecto para el que ya se cargó el borrador del calendario en esta sesión. */
  calendarDraftInitializedProjectKey: string | null;
  expandedMonthIndex: number | null;
  selectedDay: number | null;
  editExpanded: boolean;
  recurringExpanded: boolean;
  specialYearExpanded: boolean;
  editingSpecialYearId: string | null;
  expandedSpecialMonth: SpecialMonthExpand | null;
  draft: CalendarConfig | null;
  savedRevision: string | null;
  draftValidationKey: string | null;
  isSavingDraft: boolean;
  isResettingCalendar: boolean;
  unsavedDialogOpen: boolean;
  unsavedContext: CalendarUnsavedContext;
  deleteDialogOpen: boolean;
  pendingNavigation: (() => void) | null;
  monthDeletePending: number | null;
  /** Incrementa tras reset calendario para invalidar memo de vistas. */
  dataRevision: number;
  returnView: "timeline" | "editor";
  setReturnView: (view: "timeline" | "editor") => void;
  setViewYear: (year: number) => void;
  setCalendarYearHydratedProjectKey: (key: string | null) => void;
  markCalendarDraftInitialized: (key: string) => void;
  resetCalendarSession: () => void;
  openMonth: (monthIndex: number) => void;
  closeMonth: () => void;
  shiftMonth: (delta: number) => void;
  selectDay: (day: number | null) => void;
  setEditExpanded: (open: boolean) => void;
  setRecurringExpanded: (open: boolean) => void;
  setSpecialYearExpanded: (open: boolean) => void;
  setEditingSpecialYearId: (id: string | null) => void;
  setExpandedSpecialMonth: (expand: SpecialMonthExpand | null) => void;
  setMonthDeletePending: (index: number | null) => void;
  initFromConfig: (config: CalendarConfig, initialYear?: number) => void;
  setDraft: (config: CalendarConfig) => void;
  patchDraft: (patch: Partial<CalendarConfig>) => void;
  isDirty: () => boolean;
  guardNavigation: (action: () => void, context?: CalendarUnsavedContext) => void;
  saveDraft: () => Promise<boolean>;
  discardDraft: () => void;
  cancelUnsaved: () => void;
  confirmDiscardUnsaved: () => void;
  confirmSaveUnsaved: () => Promise<void>;
  setDeleteDialogOpen: (open: boolean) => void;
  resetCalendarToDefault: () => Promise<boolean>;
  resetCalendarToBlank: () => Promise<boolean>;
  /** @deprecated Usar saveDraft */
  persistDraft: () => Promise<boolean>;
}

function applyDraftFromConfig(config: CalendarConfig): CalendarConfig {
  const cloned = structuredClone(config);
  cloned.annualEvents = normalizeAnnualEventsForDraft(cloned.annualEvents ?? []);
  return cloned;
}

export const useCalendarViewStore = create<CalendarViewState>((set, get) => ({
  viewYear: 1,
  calendarYearHydratedProjectKey: null,
  calendarDraftInitializedProjectKey: null,
  expandedMonthIndex: null,
  selectedDay: null,
  editExpanded: false,
  recurringExpanded: false,
  specialYearExpanded: false,
  editingSpecialYearId: null,
  expandedSpecialMonth: null,
  draft: null,
  savedRevision: null,
  draftValidationKey: null,
  isSavingDraft: false,
  isResettingCalendar: false,
  unsavedDialogOpen: false,
  unsavedContext: "leave",
  deleteDialogOpen: false,
  pendingNavigation: null,
  monthDeletePending: null,
  dataRevision: 0,
  returnView: "timeline",

  setReturnView: (returnView) => set({ returnView }),

  setViewYear: (viewYear) =>
    set({ viewYear, expandedMonthIndex: null, selectedDay: null }),

  setCalendarYearHydratedProjectKey: (calendarYearHydratedProjectKey) =>
    set({ calendarYearHydratedProjectKey }),

  markCalendarDraftInitialized: (calendarDraftInitializedProjectKey) =>
    set({ calendarDraftInitializedProjectKey }),

  resetCalendarSession: () =>
    set({
      calendarYearHydratedProjectKey: null,
      calendarDraftInitializedProjectKey: null,
    }),

  openMonth: (monthIndex) => {
    const run = () =>
      set({ expandedMonthIndex: monthIndex, selectedDay: null, editExpanded: false });
    if (get().expandedMonthIndex === monthIndex) return;
    get().guardNavigation(run, "section");
  },

  closeMonth: () => {
    if (get().expandedMonthIndex === null) return;
    get().guardNavigation(
      () => set({ expandedMonthIndex: null, selectedDay: null }),
      "section",
    );
  },

  shiftMonth: (delta) => {
    const { expandedMonthIndex, viewYear, draft } = get();
    if (expandedMonthIndex === null || !draft) return;
    let month = expandedMonthIndex + delta;
    let year = viewYear;
    if (month < 0) {
      year -= 1;
      const count = effectiveCalendarForYear(year, draft).months.length;
      month = Math.max(0, count - 1);
    } else {
      const count = effectiveCalendarForYear(year, draft).months.length;
      if (month >= count) {
        month = 0;
        year += 1;
      }
    }
    set({ expandedMonthIndex: month, viewYear: year, selectedDay: null });
  },

  selectDay: (selectedDay) => set({ selectedDay }),

  setEditExpanded: (editExpanded) => {
    const wasOpen = get().editExpanded;
    if (wasOpen && !editExpanded) {
      get().guardNavigation(() => set({ editExpanded: false }), "section");
      return;
    }
    set({ editExpanded });
  },

  setRecurringExpanded: (recurringExpanded) => set({ recurringExpanded }),
  setSpecialYearExpanded: (specialYearExpanded) => set({ specialYearExpanded }),

  setEditingSpecialYearId: (editingSpecialYearId) => {
    const prev = get().editingSpecialYearId;
    set({
      editingSpecialYearId,
      expandedSpecialMonth:
        editingSpecialYearId === prev ? get().expandedSpecialMonth : null,
    });
  },

  setExpandedSpecialMonth: (expandedSpecialMonth) => set({ expandedSpecialMonth }),
  setMonthDeletePending: (monthDeletePending) => set({ monthDeletePending }),

  initFromConfig: (config, initialYear) => {
    const draft = applyDraftFromConfig(config);
    set({
      draft,
      savedRevision: calendarConfigRevision(draft),
      draftValidationKey: null,
      unsavedDialogOpen: false,
      pendingNavigation: null,
      ...(initialYear !== undefined ? { viewYear: initialYear } : {}),
      editingSpecialYearId: null,
      expandedSpecialMonth: null,
      editExpanded: get().editExpanded,
      recurringExpanded: get().recurringExpanded,
    });
  },

  setDraft: (draft) => set({ draft }),

  patchDraft: (patch) => {
    const current = get().draft;
    if (!current) return;
    set({ draft: { ...current, ...patch } });
  },

  isDirty: () => isCalendarDraftDirty(get().draft, get().savedRevision),

  guardNavigation: (action, context = "leave") => {
    if (!get().isDirty()) {
      action();
      return;
    }
    set({
      unsavedDialogOpen: true,
      unsavedContext: context,
      pendingNavigation: action,
    });
  },

  saveDraft: async () => {
    const draft = get().draft;
    if (!draft) return false;

    const normalized = normalizeCalendarConfig(draft);
    const err = validateCalendarDraft(normalized);
    if (err) {
      set({ draft: normalized, draftValidationKey: err });
      return false;
    }

    if (calendarConfigRevision(normalized) !== calendarConfigRevision(draft)) {
      set({ draft: normalized });
    }

    set({ draftValidationKey: null, isSavingDraft: true });
    const ok = await useCalendarStore.getState().saveCalendar(normalized);
    const lastErrorKey = useCalendarStore.getState().lastErrorKey;
    set({ isSavingDraft: false });

    if (ok) {
      set({
        savedRevision: calendarConfigRevision(normalized),
        draftValidationKey: null,
      });
    } else if (lastErrorKey) {
      set({ draftValidationKey: calendarErrorKey(lastErrorKey) });
    }
    return ok;
  },

  discardDraft: () => {
    const config = useCalendarStore.getState().config;
    if (!config) return;
    get().initFromConfig(config);
  },

  cancelUnsaved: () => set({ unsavedDialogOpen: false, pendingNavigation: null }),

  confirmDiscardUnsaved: () => {
    const action = get().pendingNavigation;
    get().discardDraft();
    set({ unsavedDialogOpen: false, pendingNavigation: null });
    action?.();
  },

  confirmSaveUnsaved: async () => {
    const action = get().pendingNavigation;
    const ok = await get().saveDraft();
    if (!ok) return;
    set({ unsavedDialogOpen: false, pendingNavigation: null });
    action?.();
  },

  setDeleteDialogOpen: (deleteDialogOpen) => set({ deleteDialogOpen }),

  resetCalendarToDefault: async () => {
    const locale = useSettingsStore.getState().locale;
    set({ isResettingCalendar: true });
    try {
      const config = await invokeCommand<CalendarConfig>("reset_calendar_config", {
        locale,
        mode: "default",
      });
      useCalendarStore.setState({ config, baselineConfig: config, lastErrorKey: null });
      get().initFromConfig(config);
      void useProjectTimelineStore.getState().load();
      set({
        deleteDialogOpen: false,
        editExpanded: true,
        draftValidationKey: null,
        dataRevision: get().dataRevision + 1,
      });
      return true;
    } catch (err) {
      set({
        draftValidationKey:
          calendarErrorKey(parseAppError(err)?.key) ?? "errors.unknown",
      });
      return false;
    } finally {
      set({ isResettingCalendar: false });
    }
  },

  resetCalendarToBlank: async () => {
    const locale = useSettingsStore.getState().locale;
    set({ isResettingCalendar: true });
    try {
      const config = await invokeCommand<CalendarConfig>("reset_calendar_config", {
        locale,
        mode: "blank",
      });
      useCalendarStore.setState({ config, baselineConfig: config, lastErrorKey: null });
      get().initFromConfig(config);
      void useProjectTimelineStore.getState().load();
      set({
        deleteDialogOpen: false,
        editExpanded: true,
        draftValidationKey: null,
        dataRevision: get().dataRevision + 1,
      });
      return true;
    } catch (err) {
      set({
        draftValidationKey:
          calendarErrorKey(parseAppError(err)?.key) ?? "errors.unknown",
      });
      return false;
    } finally {
      set({ isResettingCalendar: false });
    }
  },

  persistDraft: async () => get().saveDraft(),
}));

export function guardCalendarNavigation(
  action: () => void,
  context: CalendarUnsavedContext = "leave",
): void {
  useCalendarViewStore.getState().guardNavigation(action, context);
}
