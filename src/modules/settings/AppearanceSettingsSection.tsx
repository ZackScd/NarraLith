import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import i18n from "@/i18n/config";
import type { AppLocale, AppTheme } from "@/lib/theme";
import { useSettingsStore } from "@/stores/useSettingsStore";

export function AppearanceSettingsSection() {
  const { t } = useTranslation("settings");
  const theme = useSettingsStore((s) => s.theme);
  const locale = useSettingsStore((s) => s.locale);
  const setAppearance = useSettingsStore((s) => s.setAppearance);

  const onThemeChange = (value: AppTheme) => {
    setAppearance({ theme: value });
  };

  const onLocaleChange = (value: AppLocale) => {
    setAppearance({ locale: value });
    void i18n.changeLanguage(value);
    document.documentElement.lang = value;
  };

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-medium">{t("appearance.sectionTitle")}</h3>

      <div className="space-y-1.5">
        <Label htmlFor="settings-theme">{t("appearance.themeLabel")}</Label>
        <select
          id="settings-theme"
          value={theme}
          onChange={(e) => onThemeChange(e.target.value as AppTheme)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="light">{t("appearance.themeLight")}</option>
          <option value="dark">{t("appearance.themeDark")}</option>
        </select>
        <p className="text-xs text-muted-foreground">{t("appearance.themeHint")}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="settings-locale">{t("appearance.languageLabel")}</Label>
        <select
          id="settings-locale"
          value={locale}
          onChange={(e) => onLocaleChange(e.target.value as AppLocale)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="es">{t("appearance.languageEs")}</option>
          <option value="en">{t("appearance.languageEn")}</option>
        </select>
        <p className="text-xs text-muted-foreground">{t("appearance.languageHint")}</p>
      </div>
    </section>
  );
}
