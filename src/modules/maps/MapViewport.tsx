import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useMapDrawGesture } from "@/hooks/useMapDrawGesture";
import { useMapHotspotRectGesture } from "@/hooks/useMapHotspotRectGesture";
import { useMapLocationPinGesture } from "@/hooks/useMapLocationPinGesture";
import { getDrawBlockReason } from "@/lib/maps/mapDrawingSession";
import type {
  MapDocumentV1,
  MapDrawingV2,
  MapHotspotBoundsV1,
  MapHotspotV1,
  MapStrokeV2,
} from "@/lib/types/maps";
import type { MapLocatedMarkerV1 } from "@/lib/types/mapLocations";
import {
  useMapViewport,
  type MapViewportComposeLayer,
} from "@/lib/maps/useMapViewport";
import type { MapViewMode } from "@/stores/useMapStore";
import {
  useMapStudioStore,
  type MapStudioTool,
} from "@/stores/useMapStudioStore";
import { cn } from "@/lib/utils";

interface MapViewportProps {
  mapId: string;
  document: MapDocumentV1;
  principalDrawing: MapDrawingV2;
  overlayDrawings?: MapViewportComposeLayer[];
  activeDrawingRefKey?: string;
  previewTimeTRaw?: string | null;
  activeSecondaryIds?: string[];
  secondaryCount?: number;
  navDepth?: number;
  activeNavId?: string | null;
  navStackIds?: string[];
  hostHotspotCount?: number;
  composeNavDrawing?: MapDrawingV2 | null;
  composeNavDrawingRefKey?: string;
  hotspotOverlays?: MapHotspotV1[];
  hotspotOverlayStyle?: "edit" | "interactive";
  hotspotDrawMode?: boolean;
  locationMarkers?: MapLocatedMarkerV1[];
  locationPinPlacementActive?: boolean;
  locationPinMoveActive?: boolean;
  locationCountAtT?: number;
  unpinnedKeysAtT?: number;
  pinnedKeysTotal?: number;
  onLocationPinPlace?: (x: number, y: number) => void;
  onLocationPinMove?: (x: number, y: number) => void;
  viewMode: MapViewMode;
  activeLayerId?: string | null;
  previewStroke?: MapStrokeV2 | null;
  onPreviewStroke: (stroke: MapStrokeV2 | null) => void;
  onCommitStroke: (stroke: MapStrokeV2) => void;
  onInteractiveClick?: (worldX: number, worldY: number) => boolean;
  onHotspotRectComplete?: (bounds: MapHotspotBoundsV1) => void;
}

function viewportCursor(
  viewMode: MapViewMode,
  tool: MapStudioTool,
  hotspotDrawMode: boolean,
  locationPinMode: boolean,
  hasHotspots: boolean,
): string {
  if (viewMode === "interactive" && hasHotspots) {
    return "cursor-pointer";
  }
  if (viewMode !== "edit") {
    return "cursor-grab active:cursor-grabbing";
  }
  if (hotspotDrawMode || locationPinMode) {
    return "cursor-crosshair";
  }
  if (tool === "pan") {
    return "cursor-grab active:cursor-grabbing";
  }
  return "cursor-crosshair";
}

export function MapViewport({
  mapId,
  document,
  principalDrawing,
  overlayDrawings = [],
  activeDrawingRefKey = "principal",
  previewTimeTRaw = null,
  activeSecondaryIds = [],
  secondaryCount = 0,
  navDepth = 0,
  activeNavId = null,
  navStackIds = [],
  hostHotspotCount = 0,
  composeNavDrawing = null,
  composeNavDrawingRefKey,
  hotspotOverlays = [],
  hotspotOverlayStyle = "edit",
  hotspotDrawMode = false,
  locationMarkers = [],
  locationPinPlacementActive = false,
  locationPinMoveActive = false,
  locationCountAtT = 0,
  unpinnedKeysAtT = 0,
  pinnedKeysTotal = 0,
  onLocationPinPlace,
  onLocationPinMove,
  viewMode,
  activeLayerId = null,
  previewStroke = null,
  onPreviewStroke,
  onCommitStroke,
  onInteractiveClick,
  onHotspotRectComplete,
}: MapViewportProps) {
  const { t } = useTranslation("maps");
  const tool = useMapStudioStore((s) => s.tool);
  const brushId = useMapStudioStore((s) => s.brushId);
  const color = useMapStudioStore((s) => s.color);
  const baseSize = useMapStudioStore((s) => s.baseSize);
  const baseOpacity = useMapStudioStore((s) => s.baseOpacity);
  const [layerNotice, setLayerNotice] = useState<string | null>(null);
  const [hotspotDraftBounds, setHotspotDraftBounds] = useState<MapHotspotBoundsV1 | null>(null);
  const [locationPinDraft, setLocationPinDraft] = useState<{ x: number; y: number } | null>(null);

  const locationPinMode = locationPinPlacementActive || locationPinMoveActive;
  const interactiveLocationMarkers =
    viewMode === "interactive" ? locationMarkers : [];

  const activeEditingDrawing =
    composeNavDrawing ??
    (activeDrawingRefKey === "principal"
      ? principalDrawing
      : overlayDrawings.find((layer) => layer.drawingRefKey === activeDrawingRefKey)?.drawing ??
        principalDrawing);

  const drawBlockReason = getDrawBlockReason(activeEditingDrawing, activeLayerId);
  const canDraw = drawBlockReason === null && !hotspotDrawMode && !locationPinMode;

  const {
    containerRef,
    canvasRef,
    viewport,
    handleWheel,
    handlePointerDown: handlePanDown,
    handlePointerMove: handlePanMove,
    handlePointerUp: handlePanUp,
    isSpacePressed,
  } = useMapViewport({
    mapId,
    document,
    principalDrawing,
    overlayDrawings,
    activeDrawingRefKey,
    previewTimeTRaw,
    activeSecondaryIds,
    secondaryCount,
    navDepth,
    activeNavId,
    navStackIds,
    hostHotspotCount,
    composeNavDrawing,
    composeNavDrawingRefKey,
    viewMode,
    previewStroke,
    activeLayerId,
    studioTool: tool,
    hotspotOverlays,
    hotspotOverlayStyle,
    hotspotDraftBounds,
    locationMarkers: interactiveLocationMarkers,
    locationPinDraft: viewMode === "edit" ? locationPinDraft : null,
    locationCountAtT,
    unpinnedKeysAtT,
    pinnedKeysTotal,
    onInteractiveClick:
      viewMode === "interactive" ? onInteractiveClick : undefined,
  });

  const hotspotRect = useMapHotspotRectGesture({
    enabled: viewMode === "edit" && hotspotDrawMode && !locationPinMode && navDepth === 0,
    viewport,
    canvasWidth: document.width,
    canvasHeight: document.height,
    onDraftChange: setHotspotDraftBounds,
    onComplete: (bounds) => {
      setHotspotDraftBounds(null);
      onHotspotRectComplete?.(bounds);
    },
  });

  useEffect(() => {
    if (!hotspotDrawMode) {
      setHotspotDraftBounds(null);
    }
  }, [hotspotDrawMode]);

  const locationPinGesture = useMapLocationPinGesture({
    placementMode:
      viewMode === "edit" && navDepth === 0 && locationPinPlacementActive,
    moveMode: viewMode === "edit" && navDepth === 0 && locationPinMoveActive,
    viewport,
    canvasWidth: document.width,
    canvasHeight: document.height,
    onDraftChange: setLocationPinDraft,
    onPlace: (x, y) => onLocationPinPlace?.(x, y),
    onMove: (x, y) => onLocationPinMove?.(x, y),
  });

  useEffect(() => {
    if (!locationPinMode) {
      setLocationPinDraft(null);
    }
  }, [locationPinMode]);

  const handleDrawBlocked = useCallback(
    (reason: "locked" | "no_layer") => {
      setLayerNotice(
        reason === "locked"
          ? t("studio.layers.lockedToast")
          : t("studio.layers.noLayerToast"),
      );
    },
    [t],
  );

  useEffect(() => {
    if (!layerNotice) return;
    const timer = window.setTimeout(() => setLayerNotice(null), 2500);
    return () => window.clearTimeout(timer);
  }, [layerNotice]);

  const {
    handlePointerDown: handleDrawDown,
    handlePointerMove: handleDrawMove,
    handlePointerUp: handleDrawUp,
    handlePointerCancel: handleDrawCancel,
  } = useMapDrawGesture({
    enabled: viewMode === "edit" && !hotspotDrawMode && !locationPinMode,
    viewMode,
    tool,
    brushId,
    color,
    baseSize,
    baseOpacity,
    viewport,
    canDraw,
    drawBlockReason,
    isSpacePressed,
    onPreviewStroke,
    onCommitStroke,
    onDrawBlocked: handleDrawBlocked,
  });

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (locationPinGesture.handlePointerDown(event)) return;
      if (hotspotRect.handlePointerDown(event)) return;
      if (handleDrawDown(event)) return;
      handlePanDown(event);
    },
    [handleDrawDown, handlePanDown, hotspotRect, locationPinGesture],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (locationPinGesture.handlePointerMove(event)) return;
      if (hotspotRect.handlePointerMove(event)) return;
      if (handleDrawMove(event)) return;
      handlePanMove(event);
    },
    [handleDrawMove, handlePanMove, hotspotRect, locationPinGesture],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (locationPinGesture.handlePointerUp(event)) return;
      if (hotspotRect.handlePointerUp(event)) return;
      if (handleDrawUp(event)) return;
      handlePanUp(event);
    },
    [handleDrawUp, handlePanUp, hotspotRect, locationPinGesture],
  );

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (locationPinGesture.handlePointerCancel(event)) return;
      if (hotspotRect.handlePointerCancel(event)) return;
      if (handleDrawCancel(event)) return;
      handlePanUp(event);
    },
    [handleDrawCancel, handlePanUp, hotspotRect, locationPinGesture],
  );

  return (
    <div
      ref={containerRef}
      className="relative min-h-0 flex-1 overflow-hidden bg-muted/20"
      aria-label={t("viewport.ariaLabel", { name: document.name })}
    >
      {layerNotice ? (
        <p
          className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-md bg-background/95 px-3 py-1.5 text-xs shadow-sm ring-1 ring-border"
          role="status"
        >
          {layerNotice}
        </p>
      ) : null}
      {hotspotDrawMode ? (
        <p className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-md bg-primary/90 px-3 py-1.5 text-xs text-primary-foreground shadow-sm">
          {t("hotspot.drawHint")}
        </p>
      ) : null}
      {locationPinMode ? (
        <p className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-md bg-amber-500/90 px-3 py-1.5 text-xs text-amber-950 shadow-sm">
          {locationPinPlacementActive ? t("location.placeHintBanner") : t("location.moveHintBanner")}
        </p>
      ) : null}
      <canvas
        ref={canvasRef}
        className={cn(
          "block h-full w-full touch-none",
          viewportCursor(viewMode, tool, hotspotDrawMode, locationPinMode, hotspotOverlays.length > 0),
        )}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      />
    </div>
  );
}
