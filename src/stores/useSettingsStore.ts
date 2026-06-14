import { create } from "zustand";

import { trackAction } from "@/lib/action-audit/trackAction";
import {
  applyTheme,
  loadStoredLocale,
  loadStoredTheme,
  LOCALE_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from "@/lib/theme";
import {
  DEFAULT_APPEARANCE,
  type AppAppearanceSettings,
  type PanelDateDisplayFormat,
} from "@/lib/types/appPreferences";
import {
  DEFAULT_EDITOR_SAVE_SETTINGS,
  EDITOR_SAVE_LIMITS,
  type EditorSaveSettings,
} from "@/lib/types/editorSettings";

const STORAGE_KEY = "narralith-settings-v1";

function clampEditorSave(settings: EditorSaveSettings): EditorSaveSettings {
  return {
    autosaveEnabled: settings.autosaveEnabled,
    autosaveDebounceSec: Math.min(
      EDITOR_SAVE_LIMITS.debounceMax,
      Math.max(
        EDITOR_SAVE_LIMITS.debounceMin,
        Math.round(settings.autosaveDebounceSec),
      ),
    ),
    autosaveIntervalSec: Math.min(
      EDITOR_SAVE_LIMITS.intervalMax,
      Math.max(
        EDITOR_SAVE_LIMITS.intervalMin,
        Math.round(settings.autosaveIntervalSec),
      ),
    ),
    graphAutoRebuildOnView: Boolean(settings.graphAutoRebuildOnView),
  };
}

interface PersistedSettings
  extends Partial<EditorSaveSettings>, Partial<AppAppearanceSettings> {}

function loadPersisted(): EditorSaveSettings & AppAppearanceSettings {
  let parsed: PersistedSettings = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      parsed = JSON.parse(raw) as PersistedSettings;
    }
  } catch {
    parsed = {};
  }

  const theme =
    parsed.theme === "light" || parsed.theme === "dark"
      ? parsed.theme
      : loadStoredTheme();
  const locale =
    parsed.locale === "es" || parsed.locale === "en"
      ? parsed.locale
      : (loadStoredLocale() ?? DEFAULT_APPEARANCE.locale);
  const panelDateDisplayFormat: PanelDateDisplayFormat =
    parsed.panelDateDisplayFormat === "short" ||
    parsed.panelDateDisplayFormat === "long"
      ? parsed.panelDateDisplayFormat
      : DEFAULT_APPEARANCE.panelDateDisplayFormat;

  return {
    ...clampEditorSave({ ...DEFAULT_EDITOR_SAVE_SETTINGS, ...parsed }),
    theme,
    locale,
    panelDateDisplayFormat,
  };
}

function persistSettings(state: EditorSaveSettings & AppAppearanceSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  localStorage.setItem(THEME_STORAGE_KEY, state.theme);
  localStorage.setItem(LOCALE_STORAGE_KEY, state.locale);
}

interface SettingsState extends EditorSaveSettings, AppAppearanceSettings {
  setEditorSave: (patch: Partial<EditorSaveSettings>) => void;
  setAppearance: (patch: Partial<AppAppearanceSettings>) => void;
}

const initial = loadPersisted();
applyTheme(initial.theme);

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...initial,

  setEditorSave: (patch) => {
    const prev = get();
    const next = { ...prev, ...clampEditorSave({ ...prev, ...patch }) };
    if (
      patch.autosaveEnabled !== undefined &&
      patch.autosaveEnabled !== prev.autosaveEnabled
    ) {
      trackAction("settings", "autosave", { enabled: patch.autosaveEnabled });
    }
    persistSettings(next);
    set(next);
  },

  setAppearance: (patch) => {
    const prev = get();
    if (patch.theme !== undefined && patch.theme !== prev.theme) {
      trackAction("settings", "theme", { theme: patch.theme });
    }
    if (patch.locale !== undefined && patch.locale !== prev.locale) {
      trackAction("settings", "locale", { locale: patch.locale });
    }
    const next = {
      ...prev,
      theme: patch.theme ?? prev.theme,
      locale: patch.locale ?? prev.locale,
      panelDateDisplayFormat:
        patch.panelDateDisplayFormat ?? prev.panelDateDisplayFormat,
    };
    applyTheme(next.theme);
    persistSettings(next);
    set({
      theme: next.theme,
      locale: next.locale,
      panelDateDisplayFormat: next.panelDateDisplayFormat,
    });
  },
}));
