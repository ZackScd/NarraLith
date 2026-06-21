import { Loader2, Plus, Star } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useCalendarStore } from "@/stores/useCalendarStore";
import { useMapToolbarStore } from "@/stores/useMapToolbarStore";
import { cn } from "@/lib/utils";

import { MapDesdeToolbarButton } from "./MapDesdeToolbarButton";
import { MapMapListMenu } from "./MapMapListMenu";

export function MapTopBarControls() {
  const { t } = useTranslation("maps");
  const active = useMapToolbarStore((s) => s.active);
  const mapTitle = useMapToolbarStore((s) => s.mapTitle);
  const maps = useMapToolbarStore((s) => s.maps);
  const activeMapId = useMapToolbarStore((s) => s.activeMapId);
  const isPinned = useMapToolbarStore((s) => s.isPinned);
  const creating = useMapToolbarStore((s) => s.creating);
  const calendarReady = useMapToolbarStore((s) => s.calendarReady);
  const desde = useMapToolbarStore((s) => s.desde);
  const desdeDisplay = useMapToolbarStore((s) => s.desdeDisplay);
  const mapId = useMapToolbarStore((s) => s.mapId);
  const baselineConfig = useMapToolbarStore((s) => s.baselineConfig);
  const events = useMapToolbarStore((s) => s.events);
  const onSelectMap = useMapToolbarStore((s) => s.onSelectMap);
  const onPinToggle = useMapToolbarStore((s) => s.onPinToggle);
  const onCreateMap = useMapToolbarStore((s) => s.onCreateMap);
  const onDesdeUpdate = useMapToolbarStore((s) => s.onDesdeUpdate);
  const onDesdeSuggest = useMapToolbarStore((s) => s.onDesdeSuggest);
  const calendar = useCalendarStore((s) => s.config);

  if (!active) {
    return (
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2 px-1">
        <h1 className="text-sm font-semibold">{t("title")}</h1>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-7 shrink-0"
          title={t("topBar.createMap")}
          aria-label={t("topBar.createMap")}
          disabled={creating}
          onClick={onCreateMap}
        >
          {creating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <h1 className="flex min-w-0 items-center gap-2 truncate text-sm">
          <span className="shrink-0 font-semibold text-foreground">{t("title")}</span>
          {mapTitle ? (
            <>
              <span className="shrink-0 font-normal text-muted-foreground">|</span>
              <span className="truncate font-medium text-foreground">{mapTitle}</span>
            </>
          ) : null}
        </h1>
        <MapMapListMenu maps={maps} activeMapId={activeMapId} onSelectMap={onSelectMap} />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        {mapId ? (
          <MapDesdeToolbarButton
            mapId={mapId}
            desde={desde}
            desdeDisplay={desdeDisplay}
            calendar={calendar}
            baselineConfig={baselineConfig}
            events={events}
            disabled={!calendarReady}
            onUpdate={onDesdeUpdate}
            onSuggest={onDesdeSuggest}
          />
        ) : null}
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-7 shrink-0"
          disabled={!activeMapId}
          aria-pressed={isPinned}
          title={isPinned ? t("topBar.unpinMap") : t("topBar.pinMap")}
          aria-label={isPinned ? t("topBar.unpinMap") : t("topBar.pinMap")}
          onClick={onPinToggle}
        >
          <Star
            className={cn(
              "size-3.5",
              isPinned ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
            )}
          />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-7 shrink-0"
          title={t("topBar.createMap")}
          aria-label={t("topBar.createMap")}
          disabled={creating}
          onClick={onCreateMap}
        >
          {creating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
