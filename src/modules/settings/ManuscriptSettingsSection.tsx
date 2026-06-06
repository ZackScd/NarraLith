import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import type { PanelDateDisplayFormat } from "@/lib/types/appPreferences";
import { useSettingsStore } from "@/stores/useSettingsStore";

export function ManuscriptSettingsSection() {
  const { t } = useTranslation("settings");
  const panelDateDisplayFormat = useSettingsStore((s) => s.panelDateDisplayFormat);
  const setAppearance = useSettingsStore((s) => s.setAppearance);

  return (
    <section className="space-y-4 border-t border-border pt-4">
      <h3 className="text-sm font-medium">{t("manuscript.sectionTitle")}</h3>

      <div className="space-y-1.5">
        <Label htmlFor="settings-date-format">{t("manuscript.dateFormatLabel")}</Label>
        <select
          id="settings-date-format"
          value={panelDateDisplayFormat}
          onChange={(e) =>
            setAppearance({
              panelDateDisplayFormat: e.target.value as PanelDateDisplayFormat,
            })
          }
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="long">{t("manuscript.dateFormatLong")}</option>
          <option value="short">{t("manuscript.dateFormatShort")}</option>
        </select>
        <p className="text-xs text-muted-foreground">
          {t("manuscript.dateFormatHint")}
        </p>
      </div>
    </section>
  );
}
