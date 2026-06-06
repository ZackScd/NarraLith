import { create } from "zustand";

import { calendarErrorKey } from "@/lib/calendar/calendarErrors";
import { prepareCalendarConfigForSave } from "@/lib/calendar/prepareCalendarForSave";
import { invokeCommand, parseAppError } from "@/lib/ipc";
import type {
  CalendarConfig,
  CalendarMonth,
  CalendarMonthDay,
  CalendarSeason,
} from "@/lib/types/calendar";

interface CalendarState {
  config: CalendarConfig | null;
  isLoading: boolean;
  isSaving: boolean;
  lastErrorKey: string | null;
  loadCalendar: () => Promise<void>;
  saveCalendar: (config: CalendarConfig) => Promise<boolean>;
  reset: () => void;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  config: null,
  isLoading: false,
  isSaving: false,
  lastErrorKey: null,

  loadCalendar: async () => {
    set({ isLoading: true, lastErrorKey: null });
    try {
      const config = await invokeCommand<CalendarConfig>("get_calendar_config");
      set({ config, isLoading: false });
    } catch (err) {
      set({
        config: null,
        isLoading: false,
        lastErrorKey: parseAppError(err)?.key ?? "error.unknown",
      });
    }
  },

  saveCalendar: async (config) => {
    set({ isSaving: true, lastErrorKey: null });
    try {
      const toSave = prepareCalendarConfigForSave(config);
      await invokeCommand("set_calendar_config", { config: toSave });
      set({ config, isSaving: false });
      return true;
    } catch (err) {
      set({
        isSaving: false,
        lastErrorKey: parseAppError(err)?.key ?? "error.unknown",
      });
      return false;
    }
  },

  reset: () => {
    set({ config: null, isLoading: false, isSaving: false, lastErrorKey: null });
  },
}));

export function validateCalendarDraft(config: CalendarConfig): string | null {
  if (config.months.length === 0) {
    return "validation.monthsRequired";
  }
  if (!Number.isFinite(config.daysPerWeek) || config.daysPerWeek < 1) {
    return "validation.daysPerWeekRequired";
  }
  if (!Number.isFinite(config.hoursPerDay) || config.hoursPerDay < 1) {
    return "validation.hoursPerDayRequired";
  }
  for (const month of config.months) {
    if (!month.name.trim()) {
      return "validation.monthNameRequired";
    }
    if (!Number.isFinite(month.days) || month.days < 1) {
      return "validation.monthDaysRequired";
    }
  }
  for (const event of config.annualEvents ?? []) {
    if (!event.name.trim()) {
      return "validation.eventNameRequired";
    }
    if (event.month < 1 || event.month > config.months.length) {
      return "validation.eventMonthRequired";
    }
    const monthDays = config.months[event.month - 1]?.days ?? 0;
    if (event.day !== 0 && (event.day < 1 || event.day > monthDays)) {
      return "validation.eventDayRequired";
    }
    if (event.repeatEveryYears != null && event.repeatEveryYears < 0) {
      return "validation.eventRepeatRequired";
    }
    if (
      event.hour != null &&
      (!Number.isFinite(event.hour) ||
        event.hour < 0 ||
        event.hour >= config.hoursPerDay)
    ) {
      return "validation.eventHourRequired";
    }
  }
  for (const season of config.seasons ?? []) {
    if (!season.name.trim()) {
      return "validation.seasonNameRequired";
    }
    if (!isValidMonthDay(season.from, config.months)) {
      return "validation.seasonFromRequired";
    }
    if (!isValidMonthDay(season.to, config.months)) {
      return "validation.seasonToRequired";
    }
  }
  const phasesToValidate =
    config.dayPhasesMode === "global"
      ? (config.globalDayPhases ?? [])
      : (config.seasonDayPhases ?? []).flatMap((s) => s.phases);
  for (const phase of phasesToValidate) {
    if (
      !Number.isFinite(phase.hour) ||
      phase.hour < 0 ||
      phase.hour >= config.hoursPerDay
    ) {
      return "validation.phaseHourRequired";
    }
  }
  return null;
}

export function createEmptyMonth(): CalendarMonth {
  return { name: "", days: 30 };
}

export function createEmptySeason(months: CalendarMonth[]): CalendarSeason {
  const firstMonth = Math.max(1, months.length);
  const firstMonthDays = Math.max(1, months[0]?.days ?? 1);
  return {
    id: `season-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    from: { month: 1, day: 1 },
    to: { month: firstMonth, day: firstMonthDays },
    linkedPath: "",
    highlightColor: "#3b82f6",
    highlightOpacity: 0.18,
  };
}

function isValidMonthDay(date: CalendarMonthDay, months: CalendarMonth[]): boolean {
  if (!Number.isFinite(date.month) || !Number.isFinite(date.day)) {
    return false;
  }
  if (date.month < 1 || date.month > months.length) {
    return false;
  }
  const maxDay = months[date.month - 1]?.days ?? 0;
  return date.day >= 1 && date.day <= maxDay;
}

export function calendarErrorI18nKey(key: string | null): string {
  return calendarErrorKey(key);
}
