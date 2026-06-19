import { Eye, Loader2, Map as MapIcon, Pencil, Plus, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useMapAutosave } from "@/hooks/useMapAutosave";
import { useMapProject } from "@/hooks/useMapProject";
import { useProjectTimeline } from "@/hooks/useProjectTimeline";
import { useMapDrawingSession } from "@/hooks/useMapDrawingSession";
import { useMapSaveShortcut } from "@/hooks/useMapSaveShortcut";
import { useMapDrawingGuardRegistration, guardMapDrawingNavigation } from "@/hooks/useMapDrawingGuardRegistration";
import { usePersistMapDrawingDraft } from "@/hooks/usePersistMapDrawingDraft";
import { trackAction } from "@/lib/action-audit/trackAction";
import type { MapCreateDraft, OpenPreference } from "@/lib/types/maps";
import { cn } from "@/lib/utils";
import { CreateMapDialog } from "@/modules/maps/CreateMapDialog";
import {
  MapCanvasSizeDialog,
  type MapCanvasSizeMode,
} from "@/modules/maps/MapCanvasSizeDialog";
import { useMapStudioShortcuts } from "@/hooks/useMapStudioShortcuts";
import { MapDesdeField } from "@/modules/maps/MapDesdeField";
import { MapEditStudio } from "@/modules/maps/MapEditStudio";
import { MapLayersPanel } from "@/modules/maps/MapLayersPanel";
import { MapViewport } from "@/modules/maps/MapViewport";
import { useMapStore } from "@/stores/useMapStore";
import { useCalendarStore } from "@/stores/useCalendarStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

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
    updateMapDesde,
    applyDefaultDesde,
    ensureTimelineAndCalendar,
  } = useMapProject();

  const { events: timelineEvents } = useProjectTimeline();
  const calendar = useCalendarStore((s) => s.config);
  const baselineConfig = useCalendarStore((s) => s.baselineConfig);
  const loadCalendar = useCalendarStore((s) => s.loadCalendar);

  const [createOpen, setCreateOpen] = useState(false);
  const [canvasDialogOpen, setCanvasDialogOpen] = useState(false);
  const [canvasMode, setCanvasMode] = useState<MapCanvasSizeMode>("expand");

  const activeSummary = maps.find((map) => map.id === activeMapId);
  const isPinned = activeSummary?.defaultOnOpen === true;
  const showEmpty = !loading && maps.length === 0;
  const isEditMode = viewMode === "edit";
  const mapAutosaveEnabled = useSettingsStore((s) => s.mapAutosaveEnabled);

  const drawingSession = useMapDrawingSession({
    sessionKey,
    sourceDrawing: drawing,
    mapId: activeMapId,
    projectRoot: rootPath,
  });

  usePersistMapDrawingDraft({
    enabled: isEditMode && Boolean(rootPath) && Boolean(activeMapId),
    projectRoot: rootPath,
    mapId: activeMapId,
    isDirty: drawingSession.isDirty,
    drawing: drawingSession.drawing,
    undoDepth: drawingSession.undoDepth,
    redoDepth: drawingSession.redoDepth,
    exportDraft: drawingSession.exportDraftSnapshot,
  });

  useMapStudioShortcuts({
    viewMode,
    canUndo: drawingSession.canUndo,
    canRedo: drawingSession.canRedo,
    onUndo: drawingSession.undo,
    onRedo: drawingSession.redo,
  });

  const { flushAutosave } = useMapAutosave({
    enabled: isEditMode && mapAutosaveEnabled,
    mapId: activeMapId,
    drawing: drawingSession.drawing,
    activeLayerId: drawingSession.activeLayerId,
    isDirty: drawingSession.isDirty,
    setSaveStatus: drawingSession.setSaveStatus,
    markSaved: drawingSession.markSaved,
    saveDrawing,
  });

  useMapSaveShortcut({
    viewMode,
    isDirty: drawingSession.isDirty,
    onSave: () => flushAutosave("manual"),
  });

  const viewportDrawing =
    isEditMode && drawingSession.drawing ? drawingSession.drawing : drawing;
  const previewStroke = isEditMode ? drawingSession.currentStroke : null;

  const handleCreate = async (draft: MapCreateDraft) => {
    await createMap(draft);
  };

  useMapDrawingGuardRegistration({
    enabled: isEditMode && Boolean(rootPath) && Boolean(activeMapId),
    projectRoot: rootPath,
    mapId: activeMapId,
    diskDrawing: drawing,
    isDirty: drawingSession.isDirty,
    flushAutosave,
    resetFromSource: drawingSession.resetFromSource,
  });

  useEffect(() => {
    if (!rootPath || calendar) return;
    void loadCalendar();
  }, [calendar, loadCalendar, rootPath]);

  const handleDesdeUpdate = async (desde: string | null) => {
    if (!activeMapId) return;
    await updateMapDesde(activeMapId, desde);
  };

  const handleDesdeSuggest = async () => {
    if (!activeMapId) return;
    const { events, config, baselineConfig: baseline } = await ensureTimelineAndCalendar();
    if (!config) return;
    await applyDefaultDesde(activeMapId, {
      events,
      config,
      baselineConfig: baseline,
      trackAs: "suggest",
    });
  };

  const openCanvasDialog = (mode: MapCanvasSizeMode) => {
    setCanvasMode(mode);
    setCanvasDialogOpen(true);
  };

  const handleMapChange = (mapId: string) => {
    if (!mapId || mapId === activeMapId) return;
    void guardMapDrawingNavigation(async () => {
      await selectMap(mapId);
    }, "mapSwitch");
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
    void guardMapDrawingNavigation(async () => {
      const fromMode = viewMode;
      setViewMode("interactive");
      trackAction("map", "setViewMode", {
        mapId: activeMapId,
        mode: "interactive",
        fromMode,
      });
    }, "exitEdit");
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex shrink-0 flex-col gap-3 border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <MapIcon className="size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h1 className="text-sm font-semibold">{t("title")}</h1>
                {document ? (
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t("principal.badge")}
                  </span>
                ) : null}
              </div>
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

      {activeMapId && document ? (
        <div className="shrink-0 border-b border-border/60 px-4 py-2">
          <MapDesdeField
            mapId={activeMapId}
            desde={document.desde}
            calendar={calendar}
            baselineConfig={baselineConfig}
            events={timelineEvents}
            onUpdate={handleDesdeUpdate}
            onSuggest={handleDesdeSuggest}
          />
        </div>
      ) : null}

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
            <div className="flex min-h-0 flex-1">
              <MapViewport
                mapId={activeMapId}
                document={document}
                drawing={viewportDrawing}
                viewMode={viewMode}
                activeLayerId={isEditMode ? drawingSession.activeLayerId : null}
                previewStroke={previewStroke}
                onPreviewStroke={drawingSession.setPreviewStroke}
                onCommitStroke={drawingSession.commitStroke}
              />
              {isEditMode && drawingSession.drawing ? (
                <MapLayersPanel
                  mapId={activeMapId}
                  drawing={drawingSession.drawing}
                  activeLayerId={drawingSession.activeLayerId}
                  onSelectLayer={drawingSession.selectActiveLayer}
                  onCreateLayer={() => {
                    drawingSession.createLayer(t("studio.layers.defaultName", {
                      index: drawingSession.drawing!.layers.length + 1,
                    }));
                  }}
                  onDeleteLayer={drawingSession.deleteLayer}
                  onPatchLayer={drawingSession.patchLayer}
                  onReorderLayer={drawingSession.reorderLayer}
                />
              ) : null}
            </div>
            {isEditMode && activeMapId ? (
              <MapEditStudio
                mapId={activeMapId}
                canvasBusy={canvasBusy}
                isDirty={drawingSession.isDirty}
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
            const ok = await guardMapDrawingNavigation(async () => {
              await expandCanvas(addRight, addBottom);
            }, "canvasOp");
            if (!ok) {
              throw new Error("guard");
            }
          }}
          onCrop={async (newWidth, newHeight) => {
            const ok = await guardMapDrawingNavigation(async () => {
              await cropCanvas(newWidth, newHeight);
            }, "canvasOp");
            if (!ok) {
              throw new Error("guard");
            }
          }}
        />
      ) : null}
    </div>
  );
}
