import { Loader2, Maximize2, Plus, Scissors, Star } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { MapSummaryV2, OpenPreference } from "@/lib/types/maps";
import { cn } from "@/lib/utils";

const SELECT_CLASS =
  "flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm";

interface MapMapsSectionProps {
  maps: MapSummaryV2[];
  activeMapId: string | null;
  openPreference: OpenPreference;
  isPinned: boolean;
  creating: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
  canvasBusy?: boolean;
  onMapChange: (mapId: string) => void;
  onPreferenceChange: (value: OpenPreference) => void;
  onPinToggle: () => void;
  onCreateMap: () => void;
  onExpandCanvas?: () => void;
  onCropCanvas?: () => void;
}

export function MapMapsSection({
  maps,
  activeMapId,
  openPreference,
  isPinned,
  creating,
  canvasWidth,
  canvasHeight,
  canvasBusy = false,
  onMapChange,
  onPreferenceChange,
  onPinToggle,
  onCreateMap,
  onExpandCanvas,
  onCropCanvas,
}: MapMapsSectionProps) {
  const { t } = useTranslation("maps");

  if (maps.length === 0) {
    return (
      <div className="flex flex-col gap-3 p-3">
        <p className="text-xs text-muted-foreground">{t("emptyDescription")}</p>
        <Button size="sm" disabled={creating} onClick={onCreateMap}>
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {t("createMap")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-3">
      <div className="space-y-1.5">
        <Label htmlFor="map-edit-selector">{t("selector.label")}</Label>
        <select
          id="map-edit-selector"
          className={SELECT_CLASS}
          value={activeMapId ?? ""}
          onChange={(e) => onMapChange(e.target.value)}
        >
          {maps.map((map) => (
            <option key={map.id} value={map.id}>
              {t("selector.option", {
                name: map.name,
                width: map.width,
                height: map.height,
              })}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="map-edit-open-preference">{t("openPreference.label")}</Label>
        <select
          id="map-edit-open-preference"
          className={SELECT_CLASS}
          value={openPreference}
          title={t("openPreference.tooltip")}
          onChange={(e) => onPreferenceChange(e.target.value as OpenPreference)}
        >
          <option value="lastViewed">{t("openPreference.lastViewed")}</option>
          <option value="pinned">{t("openPreference.pinned")}</option>
          <option value="lastModified">{t("openPreference.lastModified")}</option>
        </select>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{t("pin.label")}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9"
          aria-pressed={isPinned}
          title={isPinned ? t("pin.unpin") : t("pin.pin")}
          onClick={onPinToggle}
        >
          <Star
            className={cn(
              "size-4",
              isPinned ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
            )}
          />
        </Button>
      </div>

      <Button size="sm" variant="outline" disabled={creating} onClick={onCreateMap}>
        {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        {t("createMap")}
      </Button>

      {onExpandCanvas && onCropCanvas && canvasWidth && canvasHeight ? (
        <div className="space-y-2 border-t border-border/60 pt-3">
          <p className="text-xs font-medium">{t("canvas.sectionTitle")}</p>
          <p className="text-[11px] text-muted-foreground">
            {t("canvas.currentSize", { width: canvasWidth, height: canvasHeight })}
          </p>
          <div className="flex flex-col gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="justify-start gap-2"
              disabled={canvasBusy}
              onClick={onExpandCanvas}
            >
              <Maximize2 className="size-3.5" />
              {t("canvas.expandAction")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="justify-start gap-2"
              disabled={canvasBusy}
              onClick={onCropCanvas}
            >
              <Scissors className="size-3.5" />
              {t("canvas.cropAction")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
