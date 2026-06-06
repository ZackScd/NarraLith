import type { CalendarDisplayDateMode } from "@/lib/calendar/formatCalendarDisplayDate";
import type { AppLocale, AppTheme } from "@/lib/theme";

export type PanelDateDisplayFormat = CalendarDisplayDateMode;

export interface AppAppearanceSettings {
  theme: AppTheme;
  locale: AppLocale;
  panelDateDisplayFormat: PanelDateDisplayFormat;
}

export const DEFAULT_APPEARANCE: AppAppearanceSettings = {
  theme: "light",
  locale: "es",
  panelDateDisplayFormat: "long",
};
