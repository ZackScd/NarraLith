import { useTranslation } from "react-i18next";

import { useSettingsStore } from "@/stores/useSettingsStore";

export function MapSettingsSection() {
  const { t } = useTranslation("settings");
  const mapAutosaveEnabled = useSettingsStore((s) => s.mapAutosaveEnabled);
  const setMapSave = useSettingsStore((s) => s.setMapSave);

  return (
    <section className="space-y-4 border-t border-border pt-4">
      <h3 className="text-sm font-medium">{t("maps.sectionTitle")}</h3>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 rounded border-input"
          checked={mapAutosaveEnabled}
          onChange={(e) => setMapSave({ mapAutosaveEnabled: e.target.checked })}
        />
        {t("maps.autosaveLabel")}
      </label>

      {mapAutosaveEnabled ? (
        <p className="text-xs text-muted-foreground">{t("maps.autosaveHint")}</p>
      ) : (
        <p className="text-xs text-muted-foreground">{t("maps.manualHint")}</p>
      )}
    </section>
  );
}
