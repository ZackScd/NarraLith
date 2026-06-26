import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { FloatingPanelFrame } from "@/components/workspace-ui/FloatingPanelFrame";
import { useMapAutosave } from "@/hooks/useMapAutosave";
import { useMapDrawingSession } from "@/hooks/useMapDrawingSession";
import { usePersistMapDrawingDraft } from "@/hooks/usePersistMapDrawingDraft";
import { resolveInteractiveHotspotHit } from "@/lib/maps/mapInteractiveNavClick";
import {
  filterHotspotsForHost,
  openNavWindowFromHotspot,
} from "@/lib/maps/mapNavWindowFromHotspot";
import type { MapPreviewTSource } from "@/lib/maps/mapPreviewT";
import type { CalendarConfig } from "@/lib/types/calendar";
import type {
  MapDocumentV1,
  MapDrawingRef,
  MapDrawingV2,
  MapHotspotV2,
  MapNavSummaryV1,
  MapSecondarySummaryV1,
} from "@/lib/types/maps";
import { MapEditStudio } from "@/modules/maps/MapEditStudio";
import { MapTimelineBar } from "@/modules/maps/MapTimelineBar";
import { MapViewport } from "@/modules/maps/MapViewport";
import {
  MAP_NAV_CHILD_WINDOW_MIN_HEIGHT,
  MAP_NAV_CHILD_WINDOW_WIDTH,
  type MapNavWindowEntry,
} from "@/stores/useMapNavWindowsStore";

interface MapNavChildWindowProps {
  mapId: string;
  document: MapDocumentV1;
  entry: MapNavWindowEntry;
  navName: string;
  navDrawing: MapDrawingV2;
  hotspots: MapHotspotV2[];
  navDrawings: MapNavSummaryV1[];
  loadNavFile: (navId: string) => Promise<unknown>;
  calendar: CalendarConfig | null;
  previewT: string | null;
  secondaries: MapSecondarySummaryV1[];
  rootPath: string;
  mapAutosaveEnabled: boolean;
  onPreviewTChange: (raw: string, source: MapPreviewTSource) => void;
  onClose: () => void;
  onPositionChange: (position: { x: number; y: number }) => void;
  onFocus: () => void;
  saveActiveDrawing: (
    mapId: string,
    drawing: MapDrawingV2,
    ref: MapDrawingRef,
  ) => Promise<void>;
}

export function MapNavChildWindow({
  mapId,
  document,
  entry,
  navName,
  navDrawing,
  hotspots,
  navDrawings,
  loadNavFile,
  calendar,
  previewT,
  secondaries,
  rootPath,
  mapAutosaveEnabled,
  onPreviewTChange,
  onClose,
  onPositionChange,
  onFocus,
  saveActiveDrawing,
}: MapNavChildWindowProps) {
  const { t } = useTranslation("maps");
  const isEdit = entry.mode === "edit";
  const navRefKey = `nav:${entry.navId}`;
  const drawingRef: MapDrawingRef = { kind: "nav", id: entry.navId };
  const sessionKey = `${rootPath}:${mapId}:${navRefKey}`;
  const hostDrawingRef = useMemo(
    () => ({ kind: "nav" as const, id: entry.navId }),
    [entry.navId],
  );
  const hostHotspots = useMemo(
    () => filterHotspotsForHost(hotspots, hostDrawingRef),
    [hostDrawingRef, hotspots],
  );

  const drawingSession = useMapDrawingSession({
    sessionKey,
    sourceDrawing: navDrawing,
    mapId,
    projectRoot: rootPath,
    drawingRefKey: navRefKey,
  });

  usePersistMapDrawingDraft({
    enabled: isEdit,
    projectRoot: rootPath,
    mapId,
    drawingRefKey: navRefKey,
    isDirty: drawingSession.isDirty,
    drawing: drawingSession.drawing,
    undoDepth: drawingSession.undoDepth,
    redoDepth: drawingSession.redoDepth,
    exportDraft: drawingSession.exportDraftSnapshot,
  });

  useMapAutosave({
    enabled: isEdit && mapAutosaveEnabled,
    mapId,
    drawing: drawingSession.drawing,
    activeLayerId: drawingSession.activeLayerId,
    isDirty: drawingSession.isDirty,
    setSaveStatus: drawingSession.setSaveStatus,
    markSaved: drawingSession.markSaved,
    saveDrawing: (targetMapId, targetDrawing) =>
      saveActiveDrawing(targetMapId, targetDrawing, drawingRef),
    getDrawingRef: () => drawingRef,
  });

  const viewportDrawing =
    isEdit && drawingSession.drawing ? drawingSession.drawing : navDrawing;

  const handleInteractiveClick = useCallback(
    (worldX: number, worldY: number) => {
      const hit = resolveInteractiveHotspotHit(
        "interactive",
        worldX,
        worldY,
        hostHotspots,
        hostDrawingRef,
      );
      if (!hit) return false;
      void openNavWindowFromHotspot({
        mapId,
        hotspot: hit,
        navDrawings,
        loadNavFile,
        parentNavId: entry.navId,
      });
      return true;
    },
    [entry.navId, hostDrawingRef, hostHotspots, loadNavFile, mapId, navDrawings],
  );

  const handlePanelPointerDown = useCallback(() => {
    onFocus();
  }, [onFocus]);

  return (
    <div onPointerDown={handlePanelPointerDown}>
      <FloatingPanelFrame
        position={entry.position}
        onPositionChange={onPositionChange}
        title={`${navName}${isEdit ? ` · ${t("navChildWindow.editBadge")}` : ""}`}
        ariaLabel={t("navChildWindow.ariaLabel", { name: navName })}
        onClose={onClose}
        closeAriaLabel={t("editPanel.closeWindow")}
        minWidth={MAP_NAV_CHILD_WINDOW_WIDTH}
        minHeight={MAP_NAV_CHILD_WINDOW_MIN_HEIGHT}
        width={MAP_NAV_CHILD_WINDOW_WIDTH}
        className="z-[55] max-h-[min(80vh,720px)]"
        bodyClassName="flex min-h-0 flex-col overflow-hidden"
        footer={
          calendar ? (
            <div className="border-t border-border/60 bg-card/40">
              <MapTimelineBar
                mapId={mapId}
                desde={document.desde}
                previewT={previewT}
                secondaries={secondaries}
                calendar={calendar}
                interactive
                onPreviewTChange={onPreviewTChange}
              />
            </div>
          ) : null
        }
      >
        {isEdit ? (
          <div className="border-b border-border/60 bg-muted/20">
            <MapEditStudio
              embedded
              mapId={mapId}
              canvasBusy={false}
              isDirty={drawingSession.isDirty}
              saveStatus={drawingSession.saveStatus}
              canUndo={drawingSession.canUndo}
              canRedo={drawingSession.canRedo}
              onUndo={drawingSession.undo}
              onRedo={drawingSession.redo}
            />
          </div>
        ) : null}
        <div className="relative h-[min(42vh,360px)] min-h-[220px] w-full">
          <MapViewport
            mapId={mapId}
            document={document}
            principalDrawing={viewportDrawing}
            activeDrawingRefKey={navRefKey}
            previewTimeTRaw={previewT}
            viewMode={isEdit ? "edit" : "interactive"}
            activeLayerId={isEdit ? drawingSession.activeLayerId : null}
            previewStroke={isEdit ? drawingSession.currentStroke : null}
            onPreviewStroke={drawingSession.setPreviewStroke}
            onCommitStroke={drawingSession.commitStroke}
            hotspotDrawMode={false}
            allowHostHotspotTools={false}
            hotspotOverlays={isEdit ? [] : hostHotspots}
            hotspotOverlayStyle="interactive"
            onInteractiveClick={isEdit ? undefined : handleInteractiveClick}
          />
        </div>
      </FloatingPanelFrame>
    </div>
  );
}
