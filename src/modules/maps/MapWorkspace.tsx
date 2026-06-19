import { Eye, Loader2, Map as MapIcon, Pencil, Plus, Star } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useMapAutosave } from "@/hooks/useMapAutosave";
import { useMapProject } from "@/hooks/useMapProject";
import { useMapDrawingSession } from "@/hooks/useMapDrawingSession";
import { trackAction } from "@/lib/action-audit/trackAction";
import type { MapCreateDraft, OpenPreference } from "@/lib/types/maps";
import { cn } from "@/lib/utils";
import { CreateMapDialog } from "@/modules/maps/CreateMapDialog";
import {
  MapCanvasSizeDialog,
  type MapCanvasSizeMode,
} from "@/modules/maps/MapCanvasSizeDialog";
import { useMapStudioShortcuts } from "@/hooks/useMapStudioShortcuts";
import { MapEditStudio } from "@/modules/maps/MapEditStudio";
import { MapViewport } from "@/modules/maps/MapViewport";
import { useMapStore } from "@/stores/useMapStore";
import { useProjectStore } from "@/stores/useProjectStore";

const SELECT_CLASS =
  "flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm";

export function MapWorkspace() {
  const { t } = useTranslation("maps");
  const activeMapId = useMapStore((s) => s.activeMapId);
  const viewMode = useMapStore((s) => s.viewMode);
  const setViewMode = useMapStore((s) => s.setViewMode);
  const rootPath = useProjectStore((s) => s.activeProject?.rootPath ?? "");
  const sessionKey = `${rootPath}:${activeMapId ?? ""}`;
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
    saveDrawing,
  } = useMapProject();

  const [createOpen, setCreateOpen] = useState(false);
  const [canvasDialogOpen, setCanvasDialogOpen] = useState(false);
  const [canvasMode, setCanvasMode] = useState<MapCanvasSizeMode>("expand");

  const activeSummary = maps.find((map) => map.id === activeMapId);
  const isPinned = activeSummary?.defaultOnOpen === true;
  const showEmpty = !loading && maps.length === 0;
  const isEditMode = viewMode === "edit";

  const drawingSession = useMapDrawingSession({
    sessionKey,
    sourceDrawing: drawing,
    mapId: activeMapId,
  });

  useMapStudioShortcuts({
    viewMode,
    canUndo: drawingSession.canUndo,
    canRedo: drawingSession.canRedo,
    onUndo: drawingSession.undo,
    onRedo: drawingSession.redo,
  });

  const { flushAutosave } = useMapAutosave({
    enabled: isEditMode,
    mapId: activeMapId,
    drawing: drawingSession.drawing,
    isDirty: drawingSession.isDirty,
    setSaveStatus: drawingSession.setSaveStatus,
    markSaved: drawingSession.markSaved,
    saveDrawing,
  });

  const viewportDrawing =
    isEditMode && drawingSession.drawing ? drawingSession.drawing : drawing;
  const previewStroke = isEditMode ? drawingSession.currentStroke : null;

  const handleCreate = async (draft: MapCreateDraft) => {
    await createMap(draft);
  };

  const openCanvasDialog = (mode: MapCanvasSizeMode) => {
    setCanvasMode(mode);
    setCanvasDialogOpen(true);
  };

  const handleMapChange = (mapId: string) => {
    if (!mapId || mapId === activeMapId) return;
    void (async () => {
      const ok = await flushAutosave("mapSwitch");
      if (!ok) return;
      await selectMap(mapId);
    })();
  };

  const handlePreferenceChange = (value: OpenPreference) => {
    void setOpenPreference(value);
  };

  const handlePinToggle = () => {
    if (!activeMapId) return;
    void setDefaultOnOpen(activeMapId, !isPinned);
  };

  const handleEnterEdit = () => {
    if (!activeMapId) return;
    const fromMode = viewMode;
    setViewMode("edit");
    trackAction("map", "setViewMode", { mapId: activeMapId, mode: "edit", fromMode });
  };

  const handleExitEdit = () => {
    if (!activeMapId) return;
    void (async () => {
      if (drawingSession.isDirty) {
        const ok = await flushAutosave("exitEdit");
        if (!ok) return;
      }
      const fromMode = viewMode;
      setViewMode("interactive");
      trackAction("map", "setViewMode", {
        mapId: activeMapId,
        mode: "interactive",
        fromMode,
      });
    })();
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex shrink-0 flex-col gap-3 border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <MapIcon className="size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <h1 className="text-sm font-semibold">{t("title")}</h1>
              {document ? (
                <p className="truncate text-xs text-muted-foreground">{document.name}</p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {activeMapId && document ? (
              isEditMode ? (
                <Button size="sm" onClick={handleExitEdit}>
                  <Eye className="size-4" />
                  {t("viewMode.exitEdit")}
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={handleEnterEdit}>
                  <Pencil className="size-4" />
                  {t("viewMode.enterEdit")}
                </Button>
              )
            ) : null}
            <Button size="sm" disabled={creating} onClick={() => setCreateOpen(true)}>
              {creating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {t("createMap")}
            </Button>
          </div>
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

      <div className="flex min-h-0 flex-1 flex-col">
        {loading && maps.length === 0 ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t("loadingMaps")}
          </div>
        ) : null}

        {errorKey ? (
          <p className="shrink-0 px-4 pt-4 text-sm text-destructive">{t(errorKey)}</p>
        ) : null}

        {showEmpty ? (
          <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
            <MapIcon className="size-10 text-muted-foreground/60" />
            <h2 className="text-lg font-medium">{t("emptyTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("emptyDescription")}</p>
            <Button onClick={() => setCreateOpen(true)}>{t("createMap")}</Button>
          </div>
        ) : null}

        {activeMapId && document && viewportDrawing ? (
          <>
            <MapViewport
              mapId={activeMapId}
              document={document}
              drawing={viewportDrawing}
              viewMode={viewMode}
              previewStroke={previewStroke}
              onPreviewStroke={drawingSession.setPreviewStroke}
              onCommitStroke={drawingSession.commitStroke}
            />
            {isEditMode && activeMapId ? (
              <MapEditStudio
                mapId={activeMapId}
                canvasBusy={canvasBusy}
                saveStatus={drawingSession.saveStatus}
                canUndo={drawingSession.canUndo}
                canRedo={drawingSession.canRedo}
                onUndo={drawingSession.undo}
                onRedo={drawingSession.redo}
                onExpand={() => openCanvasDialog("expand")}
                onCrop={() => openCanvasDialog("crop")}
              />
            ) : null}
          </>
        ) : null}

        {loading && maps.length > 0 && (!document || !drawing) ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t("loadingMaps")}
          </div>
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
            const ok = await flushAutosave("canvasOp");
            if (!ok) return;
            await expandCanvas(addRight, addBottom);
          }}
          onCrop={async (newWidth, newHeight) => {
            const ok = await flushAutosave("canvasOp");
            if (!ok) return;
            await cropCanvas(newWidth, newHeight);
          }}
        />
      ) : null}
    </div>
  );
}
