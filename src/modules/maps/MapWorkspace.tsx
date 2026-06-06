import { PenLine } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useMapProject } from "@/hooks/useMapProject";
import {
  addFeature,
  newMapFeatureId,
  removeFeature,
  updateFeature,
} from "@/lib/maps/mapMutations";
import type { MapData, MapFeature, MapFeatureKind } from "@/lib/types/maps";
import { CreateMapDialog } from "@/modules/maps/CreateMapDialog";
import { MapBreadcrumb } from "@/modules/maps/MapBreadcrumb";
import { MapDrawToolbar } from "@/modules/maps/MapDrawToolbar";
import { MapEmptyState } from "@/modules/maps/MapEmptyState";
import { MapLayerPanel } from "@/modules/maps/MapLayerPanel";
import { MapLeafletCanvas } from "@/modules/maps/MapLeafletCanvas";
import { MapOverlayPanel } from "@/modules/maps/MapOverlayPanel";
import { MapDrawStudio } from "@/modules/maps/studio/MapDrawStudio";
import { useMapStore } from "@/stores/useMapStore";
import { useProjectStore } from "@/stores/useProjectStore";

export function MapWorkspace() {
  const { t } = useTranslation("maps");
  const projectRoot = useProjectStore((s) => s.activeProject?.rootPath ?? "");
  const {
    maps,
    data,
    displayData,
    previewState,
    loading,
    saving,
    errorKey,
    loadMaps,
    reloadActiveMap,
    scheduleSave,
  } = useMapProject();

  const activeMapId = useMapStore((s) => s.activeMapId);
  const setActiveMap = useMapStore((s) => s.setActiveMap);
  const pushMap = useMapStore((s) => s.pushMap);
  const mapEditorMode = useMapStore((s) => s.mapEditorMode);
  const setMapEditorMode = useMapStore((s) => s.setMapEditorMode);
  const drawMode = useMapStore((s) => s.drawMode);
  const setDrawMode = useMapStore((s) => s.setDrawMode);
  const selectedFeatureId = useMapStore((s) => s.selectedFeatureId);
  const setSelectedFeatureId = useMapStore((s) => s.setSelectedFeatureId);

  const [createOpen, setCreateOpen] = useState(false);
  const [polygonDraft, setPolygonDraft] = useState<[number, number][]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeMapId && maps.length > 0) {
      setActiveMap(maps[0].id);
    }
  }, [activeMapId, maps, setActiveMap]);

  const workingData = data;
  const canvasManifest = displayData?.manifest ?? data?.manifest;
  const canvasLayers = displayData?.layers ?? data?.layers;
  const activeOverlays =
    previewState?.activeOverlays ??
    data?.manifest.overlays.filter((o) => !o.fromTimestamp) ??
    [];

  const defaultLayerId =
    workingData?.layers.layers.find((l) => l.visible)?.id ??
    workingData?.layers.layers[0]?.id ??
    "layer-default";

  const mutate = useCallback(
    (next: MapData) => {
      scheduleSave(next);
    },
    [scheduleSave],
  );

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (!workingData) return;

      if (drawMode === "pin") {
        const feature: MapFeature = {
          id: newMapFeatureId(),
          layerId: defaultLayerId,
          kind: "pin" as MapFeatureKind,
          latlng: [[lat, lng]],
          entityPath: null,
          label: null,
          childMapId: null,
          style: { color: "#3b82f6", fillOpacity: 0.9 },
        };
        mutate(addFeature(workingData, feature));
        setDrawMode("select");
        setSelectedFeatureId(feature.id);
        return;
      }

      if (drawMode === "polygon") {
        setPolygonDraft((prev) => [...prev, [lat, lng]]);
      }

      if (drawMode === "delete" && selectedFeatureId) {
        mutate(removeFeature(workingData, selectedFeatureId));
        setSelectedFeatureId(null);
      }
    },
    [
      workingData,
      drawMode,
      defaultLayerId,
      mutate,
      setDrawMode,
      setSelectedFeatureId,
      selectedFeatureId,
    ],
  );

  const finishPolygon = useCallback(() => {
    if (!workingData || polygonDraft.length < 3) {
      setPolygonDraft([]);
      return;
    }
    const feature: MapFeature = {
      id: newMapFeatureId(),
      layerId: defaultLayerId,
      kind: "polygon",
      latlng: polygonDraft,
      entityPath: null,
      label: null,
      childMapId: null,
      style: { color: "#22c55e", fillOpacity: 0.3 },
    };
    mutate(addFeature(workingData, feature));
    setPolygonDraft([]);
    setDrawMode("select");
    setSelectedFeatureId(feature.id);
  }, [
    workingData,
    polygonDraft,
    defaultLayerId,
    mutate,
    setDrawMode,
    setSelectedFeatureId,
  ]);

  const handleFeatureMove = useCallback(
    (featureId: string, lat: number, lng: number) => {
      if (!workingData) return;
      mutate(
        updateFeature(workingData, featureId, {
          latlng: [[lat, lng]],
        }),
      );
    },
    [workingData, mutate],
  );

  if (!projectRoot) {
    return null;
  }

  const showEmpty = !loading && maps.length === 0;
  const showCanvas = Boolean(canvasManifest && canvasLayers && activeMapId);
  const inStudio = mapEditorMode === "studio" && showCanvas;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card/40 px-4 py-2">
        <MapBreadcrumb maps={maps} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {maps.length > 0 ? (
            <>
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={activeMapId ?? ""}
                onChange={(e) => setActiveMap(e.target.value || null)}
                aria-label={t("selectMap")}
              >
                {maps.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>

              {inStudio ? (
                <span className="text-xs text-muted-foreground">
                  {t("studio.modeLabel")}
                </span>
              ) : (
                <>
                  <MapDrawToolbar mode={drawMode} onModeChange={setDrawMode} />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => setMapEditorMode("studio")}
                  >
                    <PenLine className="size-3.5" />
                    {t("studio.editDrawing")}
                  </Button>
                </>
              )}
            </>
          ) : null}
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            onClick={() => setCreateOpen(true)}
          >
            {t("createMap")}
          </button>
        </div>
      </header>

      {(errorKey || localError) && (
        <p className="shrink-0 border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {t(errorKey ?? localError ?? "errors.generic", {
            defaultValue: errorKey ?? localError ?? "",
          })}
        </p>
      )}

      {saving ? (
        <p className="shrink-0 border-b border-border/60 px-4 py-1 text-[11px] text-muted-foreground">
          {t("saving")}
        </p>
      ) : null}

      {loading && maps.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">{t("loadingMaps")}</p>
      ) : null}

      {showEmpty ? <MapEmptyState onCreate={() => setCreateOpen(true)} /> : null}

      {inStudio && canvasManifest ? (
        <MapDrawStudio
          mapId={activeMapId!}
          manifest={canvasManifest}
          onSaved={() => void reloadActiveMap()}
          onSwitchToMap={() => setMapEditorMode("interactive")}
          onError={setLocalError}
        />
      ) : null}

      {showCanvas && !inStudio ? (
        <div className="flex min-h-0 flex-1">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {drawMode === "polygon" && polygonDraft.length > 0 ? (
              <p className="shrink-0 border-b border-border/60 bg-muted/20 px-4 py-1.5 text-[11px] text-muted-foreground">
                {t("polygonHint", { count: polygonDraft.length })}
              </p>
            ) : null}

            <div className="min-h-0 flex-1">
              <MapLeafletCanvas
                projectRoot={projectRoot}
                manifest={canvasManifest!}
                layers={canvasLayers!}
                activeOverlays={activeOverlays}
                drawMode={drawMode}
                selectedFeatureId={selectedFeatureId}
                polygonDraft={polygonDraft}
                onMapClick={handleMapClick}
                onMapDoubleClick={finishPolygon}
                onSelectFeature={setSelectedFeatureId}
                onFeatureMove={handleFeatureMove}
                onDrillDown={pushMap}
              />
            </div>
          </div>

          <aside className="flex w-72 shrink-0 flex-col overflow-hidden border-l border-border bg-card/30">
            {workingData ? (
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
                <MapLayerPanel data={workingData} maps={maps} onChange={mutate} />
                <MapOverlayPanel
                  data={workingData}
                  onChange={mutate}
                  onError={setLocalError}
                />
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}

      <CreateMapDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(summary) => {
          void loadMaps();
          setActiveMap(summary.id);
          setMapEditorMode("studio");
        }}
      />
    </div>
  );
}
