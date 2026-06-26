import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useMapDrawGesture } from "@/hooks/useMapDrawGesture";
import { useHotspotDrawGesture } from "@/hooks/useHotspotDrawGesture";
import { useMapHotspotCircleGesture } from "@/hooks/useMapHotspotCircleGesture";
import { useMapHotspotRectGesture } from "@/hooks/useMapHotspotRectGesture";
import { useMapLocationPinGesture } from "@/hooks/useMapLocationPinGesture";
import { getDrawBlockReason } from "@/lib/maps/mapDrawingSession";
import { circleShapeFromDraft, type MapHotspotCircleDraft } from "@/lib/maps/mapHotspotCircle";
import { rectShapeFromBounds } from "@/lib/maps/mapHotspotShape";
import type {
  MapDocumentV1,
  MapDrawingV2,
  MapHotspotBoundsV1,
  MapHotspotPointV2,
  MapHotspotShapeV2,
  MapHotspotV2,
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
import { useMapHotspotDrawStore } from "@/stores/useMapHotspotDrawStore";
import { cn } from "@/lib/utils";

import { MapHotspotDrawOverlay } from "./MapHotspotDrawOverlay";

interface MapViewportProps {
  mapId: string;
  document: MapDocumentV1;
  principalDrawing: MapDrawingV2;
  overlayDrawings?: MapViewportComposeLayer[];
  activeDrawingRefKey?: string;
  previewTimeTRaw?: string | null;
  activeSecondaryIds?: string[];
  secondaryCount?: number;
  openNavWindowCount?: number;
  hostHotspotCount?: number;
  allowHostHotspotTools?: boolean;
  hotspotOverlays?: MapHotspotV2[];
  hotspotOverlayStyle?: "edit" | "interactive";
  hotspotDrawMode?: boolean;
  hotspotZoneEditActive?: boolean;
  hotspotHighlightId?: string | null;
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
  onHotspotCircleComplete?: (circle: MapHotspotCircleDraft) => void;
  onHotspotPolygonComplete?: (points: MapHotspotPointV2[]) => void;
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
  openNavWindowCount = 0,
  hostHotspotCount = 0,
  allowHostHotspotTools = true,
  hotspotOverlays = [],
  hotspotOverlayStyle = "edit",
  hotspotDrawMode = false,
  hotspotZoneEditActive = false,
  hotspotHighlightId = null,
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
  onHotspotCircleComplete,
  onHotspotPolygonComplete,
}: MapViewportProps) {
  const { t } = useTranslation("maps");
  const hotspotDrawTool = useMapHotspotDrawStore((s) => s.tool);
  const tool = useMapStudioStore((s) => s.tool);
  const brushId = useMapStudioStore((s) => s.brushId);
  const color = useMapStudioStore((s) => s.color);
  const baseSize = useMapStudioStore((s) => s.baseSize);
  const baseOpacity = useMapStudioStore((s) => s.baseOpacity);
  const [layerNotice, setLayerNotice] = useState<string | null>(null);
  const [hotspotDraftBounds, setHotspotDraftBounds] = useState<MapHotspotBoundsV1 | null>(null);
  const [hotspotDraftShape, setHotspotDraftShape] = useState<MapHotspotShapeV2 | null>(null);
  const [locationPinDraft, setLocationPinDraft] = useState<{ x: number; y: number } | null>(null);

  const locationPinMode = locationPinPlacementActive || locationPinMoveActive;
  const interactiveLocationMarkers =
    viewMode === "interactive" ? locationMarkers : [];

  const activeEditingDrawing =
    activeDrawingRefKey === "principal"
      ? principalDrawing
      : overlayDrawings.find((layer) => layer.drawingRefKey === activeDrawingRefKey)?.drawing ??
        principalDrawing;

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
    openNavWindowCount,
    hostHotspotCount,
    viewMode,
    previewStroke,
    activeLayerId,
    studioTool: tool,
    hotspotOverlays,
    hotspotOverlayStyle,
    hotspotDraftBounds,
    hotspotDraftShape: hotspotDraftShape,
    hotspotHighlightId,
    locationMarkers: interactiveLocationMarkers,
    locationPinDraft: viewMode === "edit" ? locationPinDraft : null,
    locationCountAtT,
    unpinnedKeysAtT,
    pinnedKeysTotal,
    onInteractiveClick:
      viewMode === "interactive" ? onInteractiveClick : undefined,
  });

  const hotspotZoneActive =
    viewMode === "edit" && hotspotDrawMode && !locationPinMode && allowHostHotspotTools;

  const hotspotRect = useMapHotspotRectGesture({
    enabled: hotspotZoneActive && hotspotDrawTool === "rect",
    viewport,
    canvasWidth: document.width,
    canvasHeight: document.height,
    onDraftChange: (bounds) => {
      setHotspotDraftBounds(bounds);
      setHotspotDraftShape(
        bounds && bounds.width > 0 && bounds.height > 0
          ? rectShapeFromBounds(bounds)
          : null,
      );
    },
    onComplete: (bounds) => {
      setHotspotDraftBounds(null);
      setHotspotDraftShape(null);
      onHotspotRectComplete?.(bounds);
    },
  });

  const hotspotCircle = useMapHotspotCircleGesture({
    enabled: hotspotZoneActive && hotspotDrawTool === "circle",
    viewport,
    canvasWidth: document.width,
    canvasHeight: document.height,
    onDraftChange: (draft) => {
      setHotspotDraftShape(draft ? circleShapeFromDraft(draft) : null);
    },
    onComplete: (circle) => {
      setHotspotDraftShape(null);
      onHotspotCircleComplete?.(circle);
    },
  });

  const hotspotLasso = useHotspotDrawGesture({
    enabled: hotspotZoneActive && hotspotDrawTool === "lasso",
    viewport,
    canvasWidth: document.width,
    canvasHeight: document.height,
    onComplete: (points) => {
      onHotspotPolygonComplete?.(points);
    },
  });

  useEffect(() => {
    if (!hotspotDrawMode) {
      setHotspotDraftBounds(null);
      setHotspotDraftShape(null);
      hotspotLasso.clearDraft();
      hotspotCircle.clearDraft();
    }
  }, [hotspotCircle.clearDraft, hotspotDrawMode, hotspotLasso.clearDraft]);

  const locationPinGesture = useMapLocationPinGesture({
    placementMode:
      viewMode === "edit" && allowHostHotspotTools && locationPinPlacementActive,
    moveMode: viewMode === "edit" && allowHostHotspotTools && locationPinMoveActive,
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
      if (hotspotLasso.handlePointerDown(event)) return;
      if (hotspotCircle.handlePointerDown(event)) return;
      if (hotspotRect.handlePointerDown(event)) return;
      if (handleDrawDown(event)) return;
      handlePanDown(event);
    },
    [handleDrawDown, handlePanDown, hotspotCircle, hotspotLasso, hotspotRect, locationPinGesture],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (locationPinGesture.handlePointerMove(event)) return;
      if (hotspotLasso.handlePointerMove(event)) return;
      if (hotspotCircle.handlePointerMove(event)) return;
      if (hotspotRect.handlePointerMove(event)) return;
      if (handleDrawMove(event)) return;
      handlePanMove(event);
    },
    [handleDrawMove, handlePanMove, hotspotCircle, hotspotLasso, hotspotRect, locationPinGesture],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (locationPinGesture.handlePointerUp(event)) return;
      if (hotspotLasso.handlePointerUp(event)) return;
      if (hotspotCircle.handlePointerUp(event)) return;
      if (hotspotRect.handlePointerUp(event)) return;
      if (handleDrawUp(event)) return;
      handlePanUp(event);
    },
    [handleDrawUp, handlePanUp, hotspotCircle, hotspotLasso, hotspotRect, locationPinGesture],
  );

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (locationPinGesture.handlePointerCancel(event)) return;
      if (hotspotLasso.handlePointerCancel(event)) return;
      if (hotspotCircle.handlePointerCancel(event)) return;
      if (hotspotRect.handlePointerCancel(event)) return;
      if (handleDrawCancel(event)) return;
      handlePanUp(event);
    },
    [handleDrawCancel, handlePanUp, hotspotCircle, hotspotLasso, hotspotRect, locationPinGesture],
  );

  const hotspotDrawHint = hotspotZoneEditActive
    ? t("hotspot.zoneEdit.drawHint")
    : hotspotDrawTool === "lasso"
      ? t("hotspot.lasso.drawHint")
      : hotspotDrawTool === "circle"
        ? t("hotspot.circle.drawHint")
        : t("hotspot.drawHint");

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
        <p className="pointer-events-none absolute left-1/2 top-3 z-10 max-w-md -translate-x-1/2 rounded-md bg-primary/90 px-3 py-1.5 text-center text-xs text-primary-foreground shadow-sm">
          {hotspotDrawHint}
        </p>
      ) : null}
      <MapHotspotDrawOverlay draft={hotspotLasso.draft} viewport={viewport} />
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
