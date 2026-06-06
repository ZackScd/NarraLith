export type AppTheme = "light" | "dark";
export type AppLocale = "es" | "en";

export const THEME_STORAGE_KEY = "narralith-theme";
export const LOCALE_STORAGE_KEY = "narralith-locale";

export function loadStoredTheme(): AppTheme {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "light" || raw === "dark") return raw;
  } catch {
    /* ignore */
  }
  return "light";
}

export function loadStoredLocale(): AppLocale | null {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (raw === "es" || raw === "en") return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function applyTheme(theme: AppTheme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.add("theme");
}
