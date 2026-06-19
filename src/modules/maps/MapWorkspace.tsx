import { Loader2, Map as MapIcon, Plus, Star } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useMapProject } from "@/hooks/useMapProject";
import type { MapCreateDraft, OpenPreference } from "@/lib/types/maps";
import { cn } from "@/lib/utils";
import { CreateMapDialog } from "@/modules/maps/CreateMapDialog";
import {
  MapCanvasSizeDialog,
  type MapCanvasSizeMode,
} from "@/modules/maps/MapCanvasSizeDialog";
import { useMapStore } from "@/stores/useMapStore";

const SELECT_CLASS =
  "flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm";

export function MapWorkspace() {
  const { t } = useTranslation("maps");
  const activeMapId = useMapStore((s) => s.activeMapId);
  const {
    maps,
    openPreference,
    document,
    drawing,
    loading,
    creating,
    canvasBusy,
    errorKey,
    selectMap,
    setOpenPreference,
    setDefaultOnOpen,
    createMap,
    expandCanvas,
    cropCanvas,
  } = useMapProject();

  const [createOpen, setCreateOpen] = useState(false);
  const [canvasDialogOpen, setCanvasDialogOpen] = useState(false);
  const [canvasMode, setCanvasMode] = useState<MapCanvasSizeMode>("expand");

  const activeSummary = maps.find((map) => map.id === activeMapId);
  const isPinned = activeSummary?.defaultOnOpen === true;
  const showEmpty = !loading && maps.length === 0;

  const handleCreate = async (draft: MapCreateDraft) => {
    await createMap(draft);
  };

  const openCanvasDialog = (mode: MapCanvasSizeMode) => {
    setCanvasMode(mode);
    setCanvasDialogOpen(true);
  };

  const handleMapChange = (mapId: string) => {
    if (!mapId) return;
    void selectMap(mapId);
  };

  const handlePreferenceChange = (value: OpenPreference) => {
    void setOpenPreference(value);
  };

  const handlePinToggle = () => {
    if (!activeMapId) return;
    void setDefaultOnOpen(activeMapId, !isPinned);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex shrink-0 flex-col gap-3 border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapIcon className="size-5 text-muted-foreground" />
            <h1 className="text-sm font-semibold">{t("title")}</h1>
          </div>
          <Button size="sm" disabled={creating} onClick={() => setCreateOpen(true)}>
            {creating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {t("createMap")}
          </Button>
        </div>

        {maps.length > 0 ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1 space-y-1.5">
              <Label htmlFor="map-selector">{t("selector.label")}</Label>
              <select
                id="map-selector"
                className={SELECT_CLASS}
                value={activeMapId ?? ""}
                onChange={(e) => handleMapChange(e.target.value)}
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

            <div className="min-w-[180px] flex-1 space-y-1.5">
              <Label htmlFor="map-open-preference">{t("openPreference.label")}</Label>
              <select
                id="map-open-preference"
                className={SELECT_CLASS}
                value={openPreference}
                onChange={(e) => handlePreferenceChange(e.target.value as OpenPreference)}
              >
                <option value="lastViewed">{t("openPreference.lastViewed")}</option>
                <option value="pinned">{t("openPreference.pinned")}</option>
                <option value="lastModified">{t("openPreference.lastModified")}</option>
              </select>
            </div>

            {activeMapId ? (
              <div className="space-y-1.5">
                <span className="block text-sm font-medium leading-none">{t("pin.label")}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9"
                  aria-pressed={isPinned}
                  title={isPinned ? t("pin.unpin") : t("pin.pin")}
                  onClick={handlePinToggle}
                >
                  <Star
                    className={cn(
                      "size-4",
                      isPinned ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
                    )}
                  />
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {loading && maps.length === 0 ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t("loadingMaps")}
          </div>
        ) : null}

        {errorKey ? (
          <p className="mb-4 text-sm text-destructive">{t(errorKey)}</p>
        ) : null}

        {showEmpty ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
            <MapIcon className="size-10 text-muted-foreground/60" />
            <h2 className="text-lg font-medium">{t("emptyTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("emptyDescription")}</p>
            <Button onClick={() => setCreateOpen(true)}>{t("createMap")}</Button>
          </div>
        ) : null}

        {activeMapId && document && drawing ? (
          <section className="rounded-lg border border-border/60 p-4">
            <h2 className="text-sm font-semibold">{document.name}</h2>
            <dl className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide">{t("detail.id")}</dt>
                <dd className="font-mono text-xs text-foreground">{document.id}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">{t("detail.canvas")}</dt>
                <dd>
                  {document.width} × {document.height}
                </dd>
              </div>
              {document.baseImageRel ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide">{t("detail.baseImage")}</dt>
                  <dd className="font-mono text-xs text-foreground">{document.baseImageRel}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs uppercase tracking-wide">{t("detail.layers")}</dt>
                <dd>{drawing.layers.length}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide">{t("detail.strokes")}</dt>
                <dd>
                  {drawing.layers.reduce((n, layer) => n + layer.strokes.length, 0)}
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={canvasBusy}
                onClick={() => openCanvasDialog("expand")}
              >
                {t("canvas.expandAction")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={canvasBusy}
                onClick={() => openCanvasDialog("crop")}
              >
                {t("canvas.cropAction")}
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">{t("placeholderHint")}</p>
          </section>
        ) : null}
      </div>

      <CreateMapDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        creating={creating}
        onCreate={handleCreate}
      />

      {document ? (
        <MapCanvasSizeDialog
          open={canvasDialogOpen}
          onOpenChange={setCanvasDialogOpen}
          mode={canvasMode}
          currentWidth={document.width}
          currentHeight={document.height}
          busy={canvasBusy}
          onExpand={async (addRight, addBottom) => {
            await expandCanvas(addRight, addBottom);
          }}
          onCrop={async (newWidth, newHeight) => {
            await cropCanvas(newWidth, newHeight);
          }}
        />
      ) : null}
    </div>
  );
}
