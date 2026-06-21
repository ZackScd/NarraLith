import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import type { OpenPreference } from "@/lib/types/maps";
import { useSettingsStore } from "@/stores/useSettingsStore";

const SELECT_CLASS =
  "flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm";

interface MapModuleSettingsSectionProps {
  openPreference: OpenPreference;
  onPreferenceChange: (value: OpenPreference) => void;
}

export function MapModuleSettingsSection({
  openPreference,
  onPreferenceChange,
}: MapModuleSettingsSectionProps) {
  const { t } = useTranslation("maps");
  const { t: tSettings } = useTranslation("settings");
  const mapAutosaveEnabled = useSettingsStore((s) => s.mapAutosaveEnabled);
  const setMapSave = useSettingsStore((s) => s.setMapSave);

  return (
    <div className="flex flex-col gap-4 p-3">
      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 rounded border-input"
          checked={mapAutosaveEnabled}
          onChange={(event) => setMapSave({ mapAutosaveEnabled: event.target.checked })}
        />
        <span>{tSettings("maps.autosaveLabel")}</span>
      </label>
      <p className="text-xs text-muted-foreground">
        {mapAutosaveEnabled ? tSettings("maps.autosaveHint") : tSettings("maps.manualHint")}
      </p>

      <div className="space-y-1.5 border-t border-border/60 pt-3">
        <Label htmlFor="map-module-open-preference">{t("openPreference.label")}</Label>
        <select
          id="map-module-open-preference"
          className={SELECT_CLASS}
          value={openPreference}
          title={t("openPreference.tooltip")}
          onChange={(event) => onPreferenceChange(event.target.value as OpenPreference)}
        >
          <option value="lastViewed">{t("openPreference.lastViewed")}</option>
          <option value="pinned">{t("openPreference.pinned")}</option>
          <option value="lastModified">{t("openPreference.lastModified")}</option>
        </select>
        <p className="text-xs text-muted-foreground">{t("moduleSettings.openPreferenceHint")}</p>
      </div>
    </div>
  );
}
