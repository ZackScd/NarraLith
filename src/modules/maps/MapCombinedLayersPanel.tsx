import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { isSecondaryVisibleAtT } from "@/lib/maps/mapSecondaryVisibility";
import { sortSecondariesForPanel } from "@/lib/maps/mapSecondaryPanelSort";
import { layersForPanel } from "@/lib/maps/mapDrawingSession";
import { isImageLayer } from "@/lib/maps/mapImageLayers";
import type { CalendarConfig } from "@/lib/types/calendar";
import type {
  MapDrawingLayerV2,
  MapDrawingRef,
  MapDrawingV2,
  MapSecondaryDrawingFileV1,
  MapSecondarySummaryV1,
} from "@/lib/types/maps";
import { cn } from "@/lib/utils";
import { useMapLayersWindowStore } from "@/stores/useMapLayersWindowStore";

import { MapPatchesToolbar } from "./MapPatchesToolbar";
import { CreateSecondaryDialog } from "./CreateSecondaryDialog";

interface MapCombinedLayersPanelProps {
  mapDesde: string | null;
  previewT: string | null;
  calendar: CalendarConfig | null;
  secondaries: MapSecondarySummaryV1[];
  secondaryFiles: Record<string, MapSecondaryDrawingFileV1>;
  principalDrawing: MapDrawingV2;
  activeDrawingRef: MapDrawingRef;
  activeLayerId: string | null;
  busy?: boolean;
  defaultTiempoInicio: string | null;
  onSelectDrawing: (ref: MapDrawingRef) => void;
  onSelectLayer: (layerId: string) => void;
  onCreate: (draft: {
    name: string;
    tiempoInicio: string;
    tiempoFin?: string | null;
  }) => Promise<void>;
  onLoadSecondary: (secondaryId: string) => void;
}

export function MapCombinedLayersPanel({
  mapDesde,
  previewT,
  calendar,
  secondaries,
  secondaryFiles,
  principalDrawing,
  activeDrawingRef,
  activeLayerId,
  busy = false,
  defaultTiempoInicio,
  onSelectDrawing,
  onSelectLayer,
  onCreate,
  onLoadSecondary,
}: MapCombinedLayersPanelProps) {
  const { t } = useTranslation("maps");
  const [createOpen, setCreateOpen] = useState(false);
  const showInactiveAtT = useMapLayersWindowStore((s) => s.showInactiveAtT);
  const patchSortMode = useMapLayersWindowStore((s) => s.patchSortMode);
  const expandedSecondaryIds = useMapLayersWindowStore((s) => s.expandedSecondaryIds);
  const toggleShowInactiveAtT = useMapLayersWindowStore((s) => s.toggleShowInactiveAtT);
  const cyclePatchSortMode = useMapLayersWindowStore((s) => s.cyclePatchSortMode);
  const toggleCombinedCapasParches = useMapLayersWindowStore((s) => s.toggleCombinedCapasParches);
  const toggleSecondaryExpanded = useMapLayersWindowStore((s) => s.toggleSecondaryExpanded);

  const previewActive = Boolean(previewT && calendar);

  const isVisibleAtT = (item: MapSecondarySummaryV1) => {
    if (!previewActive || !previewT || !calendar) return true;
    return isSecondaryVisibleAtT(item, mapDesde, previewT, calendar);
  };

  const sortedSecondaries = sortSecondariesForPanel(secondaries, patchSortMode, calendar);
  const visibleSecondaries = sortedSecondaries.filter(
    (item) => showInactiveAtT || isVisibleAtT(item),
  );

  useEffect(() => {
    for (const id of expandedSecondaryIds) {
      if (!secondaryFiles[id]) {
        onLoadSecondary(id);
      }
    }
  }, [expandedSecondaryIds, onLoadSecondary, secondaryFiles]);

  const renderLayerChip = (
    layer: MapDrawingLayerV2,
    drawingRef: MapDrawingRef,
    nested = false,
  ) => {
    const isActive =
      activeDrawingRef.kind === drawingRef.kind &&
      (drawingRef.kind === "principal" ||
        (drawingRef.kind === "secondary" && activeDrawingRef.kind === "secondary" &&
          activeDrawingRef.id === drawingRef.id) ||
        (drawingRef.kind === "nav" && activeDrawingRef.kind === "nav" &&
          activeDrawingRef.id === drawingRef.id)) &&
      activeLayerId === layer.id;

    return (
      <button
        key={layer.id}
        type="button"
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[11px] transition-colors",
          nested && "ml-4",
          isActive ? "bg-primary/10 text-foreground" : "hover:bg-muted/60 text-muted-foreground",
          !layer.visible && "opacity-50",
        )}
        onClick={() => {
          onSelectDrawing(drawingRef);
          onSelectLayer(layer.id);
        }}
      >
        <span className="truncate font-medium">{layer.name}</span>
        {isImageLayer(layer) ? (
          <span className="shrink-0 text-[9px] uppercase tracking-wide opacity-70">
            {t("layersWindow.image.badge")}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MapPatchesToolbar
        busy={busy}
        sortMode={patchSortMode}
        showInactiveAtT={showInactiveAtT}
        combinedActive
        showCombineButton
        onCreate={() => setCreateOpen(true)}
        onToggleInactive={toggleShowInactiveAtT}
        onCycleSort={cyclePatchSortMode}
        onToggleCombine={toggleCombinedCapasParches}
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {visibleSecondaries.map((secondary) => {
          const expanded = expandedSecondaryIds.includes(secondary.id);
          const file = secondaryFiles[secondary.id];
          const visibleAtT = isVisibleAtT(secondary);
          const drawingRef: MapDrawingRef = { kind: "secondary", id: secondary.id };

          return (
            <div
              key={secondary.id}
              className={cn(
                "mb-1 rounded-md border",
                activeDrawingRef.kind === "secondary" && activeDrawingRef.id === secondary.id
                  ? "border-primary/40 bg-muted/40"
                  : "border-border/50",
                previewActive && !visibleAtT && showInactiveAtT && "opacity-45",
              )}
            >
              <button
                type="button"
                className="flex w-full items-center gap-1 px-2 py-2 text-left text-xs"
                onClick={() => {
                  toggleSecondaryExpanded(secondary.id);
                  onSelectDrawing(drawingRef);
                  if (!file) {
                    onLoadSecondary(secondary.id);
                  }
                }}
              >
                {expanded ? (
                  <ChevronDown className="size-3.5 shrink-0" />
                ) : (
                  <ChevronRight className="size-3.5 shrink-0" />
                )}
                <span className="font-medium">{secondary.name}</span>
              </button>
              {expanded ? (
                <div className="space-y-0.5 border-t border-border/40 px-1 py-1">
                  {file ? (
                    layersForPanel(file.drawing).map((layer) =>
                      renderLayerChip(layer, drawingRef, true),
                    )
                  ) : (
                    <p className="px-2 py-1 text-[11px] text-muted-foreground">
                      {t("layersWindow.combined.loadingLayers")}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}

        <div className="mt-2 rounded-md border border-dashed border-border/70">
          <div className="border-b border-border/40 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("layersWindow.combined.principal")}
          </div>
          <div className="space-y-0.5 p-1">
            {layersForPanel(principalDrawing).map((layer) =>
              renderLayerChip(layer, { kind: "principal" }),
            )}
            {principalDrawing.backgroundColor != null ? (
              <div className="px-2 py-1 text-[11px] text-muted-foreground">
                {t("layersWindow.background.name")}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <CreateSecondaryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        calendar={calendar}
        defaultTiempoInicio={defaultTiempoInicio}
        mapDesde={mapDesde}
        busy={busy}
        onCreate={onCreate}
      />
    </div>
  );
}
