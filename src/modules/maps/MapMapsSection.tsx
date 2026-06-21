import { Loader2, Plus, Star } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { MapSummaryV2 } from "@/lib/types/maps";
import { cn } from "@/lib/utils";

const SELECT_CLASS =
  "flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm";

interface MapMapsSectionProps {
  maps: MapSummaryV2[];
  activeMapId: string | null;
  isPinned: boolean;
  creating: boolean;
  onMapChange: (mapId: string) => void;
  onPinToggle: () => void;
  onCreateMap: () => void;
}

export function MapMapsSection({
  maps,
  activeMapId,
  isPinned,
  creating,
  onMapChange,
  onPinToggle,
  onCreateMap,
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
    </div>
  );
}
