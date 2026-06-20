import { useCallback, useEffect, useRef, useState } from "react";

import { invokeCommand } from "@/lib/ipc";
import { countMapStrokes } from "@/lib/maps/mapDrawingStats";
import { formatMapDesdeDisplay } from "@/lib/maps/mapDesde";
import { drawLocationMarkers, drawLocationPinDraft } from "@/lib/maps/mapLocationMarkers";
import { mapAssetProjectPath } from "@/lib/maps/mapAssetPath";
import { paintStrokeLayer } from "@/lib/maps/mapStrokeBuffer";
import { drawMapStrokes } from "@/lib/maps/mapStrokeRender";
import { renderAudit } from "@/lib/render-audit";
import { UI_EVENTS } from "@/lib/render-audit/events";
import type { MapDocumentV1, MapDrawingV2, MapHotspotBoundsV1, MapHotspotV1, MapStrokeV2 } from "@/lib/types/maps";
import type { MapLocatedMarkerV1 } from "@/lib/types/mapLocations";
import type { MapViewMode } from "@/stores/useMapStore";
import type { MapStudioTool } from "@/stores/useMapStudioStore";

import { shouldPanPointer } from "@/lib/maps/mapDrawGesture";
import { documentDistance, screenToDocument } from "@/lib/maps/mapDrawCoords";

export interface MapViewportComposeLayer {
  drawingRefKey: string;
  drawing: MapDrawingV2;
}

export interface MapViewportPaintOptions {
  overlayDrawings?: MapViewportComposeLayer[];
  activeDrawingRefKey?: string;
  previewStroke?: MapStrokeV2 | null;
  activeLayerId?: string | null;
  /** Sustituye principal + overlays por dibujo nav (MAP-010). */
  composeNavDrawing?: MapDrawingV2 | null;
  composeNavDrawingRefKey?: string;
  hotspotOverlays?: MapHotspotV1[];
  hotspotDraftBounds?: MapHotspotBoundsV1 | null;
  locationMarkers?: MapLocatedMarkerV1[];
  locationPinDraft?: { x: number; y: number } | null;
}

export interface MapViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

export const MAP_VIEWPORT_MIN_ZOOM = 0.25;
export const MAP_VIEWPORT_MAX_ZOOM = 2;

const GRID_SIZE = 32;
const MAX_DPR = 2;
const COMPOSITOR_AUDIT_DEBOUNCE_MS = 150;
const INTERACTIVE_CLICK_MOVE_PX = 5;

interface UseMapViewportOptions {
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
  viewMode: MapViewMode;
  previewStroke?: MapStrokeV2 | null;
  activeLayerId?: string | null;
  studioTool?: MapStudioTool;
  /** Clic en interactivo (coords documento). true = consumido (p. ej. hotspot). */
  onInteractiveClick?: (worldX: number, worldY: number) => boolean;
  hotspotOverlays?: MapHotspotV1[];
  hotspotDraftBounds?: MapHotspotBoundsV1 | null;
  locationMarkers?: MapLocatedMarkerV1[];
  locationPinDraft?: { x: number; y: number } | null;
  locationCountAtT?: number;
  unpinnedKeysAtT?: number;
  pinnedKeysTotal?: number;
}

interface ContainerSize {
  width: number;
  height: number;
}

const imageCache = new Map<string, HTMLImageElement>();

function cacheKey(mapId: string, baseImageRel: string): string {
  return `${mapId}:${baseImageRel}`;
}

function isDarkTheme(): boolean {
  return document.documentElement.classList.contains("dark");
}

function canvasBackgroundColor(): string {
  return isDarkTheme() ? "#18181b" : "#fafafa";
}

function gridLineColor(): string {
  return isDarkTheme() ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
}

export function computeFitViewport(
  containerW: number,
  containerH: number,
  docW: number,
  docH: number,
): MapViewportState {
  const padding = 32;
  const availW = Math.max(1, containerW - padding * 2);
  const availH = Math.max(1, containerH - padding * 2);
  const zoom = Math.min(availW / docW, availH / docH, 1);
  return {
    zoom,
    panX: (containerW - docW * zoom) / 2,
    panY: (containerH - docH * zoom) / 2,
  };
}

function clampZoom(value: number): number {
  return Math.min(MAP_VIEWPORT_MAX_ZOOM, Math.max(MAP_VIEWPORT_MIN_ZOOM, value));
}

function zoomAtPoint(
  viewport: MapViewportState,
  clientX: number,
  clientY: number,
  deltaY: number,
): MapViewportState {
  const factor = deltaY > 0 ? 0.9 : 1.1;
  const nextZoom = clampZoom(viewport.zoom * factor);
  const worldX = (clientX - viewport.panX) / viewport.zoom;
  const worldY = (clientY - viewport.panY) / viewport.zoom;
  return {
    zoom: nextZoom,
    panX: clientX - worldX * nextZoom,
    panY: clientY - worldY * nextZoom,
  };
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.strokeStyle = gridLineColor();
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }
}

function drawHotspotOverlays(
  ctx: CanvasRenderingContext2D,
  hotspots: MapHotspotV1[],
  draftBounds: MapHotspotBoundsV1 | null | undefined,
): void {
  const drawRect = (bounds: MapHotspotBoundsV1, stroke: string, fill: string) => {
    ctx.fillStyle = fill;
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(bounds.x + 0.5, bounds.y + 0.5, bounds.width - 1, bounds.height - 1);
  };

  for (const hotspot of hotspots) {
    drawRect(hotspot.bounds, "rgba(59, 130, 246, 0.95)", "rgba(59, 130, 246, 0.18)");
  }
  if (draftBounds && draftBounds.width > 0 && draftBounds.height > 0) {
    drawRect(draftBounds, "rgba(234, 179, 8, 0.95)", "rgba(234, 179, 8, 0.2)");
  }
}

function drawLocationOverlays(
  ctx: CanvasRenderingContext2D,
  markers: MapLocatedMarkerV1[],
  draftPoint: { x: number; y: number } | null | undefined,
): void {
  if (markers.length > 0) {
    drawLocationMarkers(ctx, markers);
  }
  if (draftPoint) {
    drawLocationPinDraft(ctx, draftPoint.x, draftPoint.y);
  }
}

export function paintMapViewport(
  ctx: CanvasRenderingContext2D,
  size: ContainerSize,
  viewport: MapViewportState,
  document: MapDocumentV1,
  principalDrawing: MapDrawingV2,
  baseImage: HTMLImageElement | null,
  mapId: string,
  options: MapViewportPaintOptions = {},
): void {
  const activeDrawingRefKey = options.activeDrawingRefKey ?? "principal";
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size.width, size.height);
  ctx.fillStyle = canvasBackgroundColor();
  ctx.fillRect(0, 0, size.width, size.height);

  ctx.save();
  ctx.translate(viewport.panX, viewport.panY);
  ctx.scale(viewport.zoom, viewport.zoom);

  ctx.fillStyle = canvasBackgroundColor();
  ctx.fillRect(0, 0, document.width, document.height);

  if (baseImage) {
    ctx.drawImage(baseImage, 0, 0, document.width, document.height);
  } else {
    drawGrid(ctx, document.width, document.height);
  }

  const navDrawing = options.composeNavDrawing;
  if (navDrawing) {
    const navRefKey = options.composeNavDrawingRefKey ?? "nav:unknown";
    const navLayer = paintStrokeLayer(mapId, navRefKey, document, (bufferCtx) => {
      const isActive = activeDrawingRefKey === navRefKey;
      drawMapStrokes(
        bufferCtx,
        navDrawing,
        isActive ? options.previewStroke : null,
        isActive ? options.activeLayerId : null,
      );
    });
    ctx.drawImage(navLayer, 0, 0);
    drawLocationOverlays(
      ctx,
      options.locationMarkers ?? [],
      options.locationPinDraft,
    );
    drawHotspotOverlays(
      ctx,
      options.hotspotOverlays ?? [],
      options.hotspotDraftBounds,
    );
    ctx.restore();
    return;
  }

  const principalLayer = paintStrokeLayer(mapId, "principal", document, (bufferCtx) => {
    const isActive = activeDrawingRefKey === "principal";
    drawMapStrokes(
      bufferCtx,
      principalDrawing,
      isActive ? options.previewStroke : null,
      isActive ? options.activeLayerId : null,
    );
  });
  ctx.drawImage(principalLayer, 0, 0);

  for (const overlay of options.overlayDrawings ?? []) {
    const strokeLayer = paintStrokeLayer(mapId, overlay.drawingRefKey, document, (bufferCtx) => {
      const isActive = activeDrawingRefKey === overlay.drawingRefKey;
      drawMapStrokes(
        bufferCtx,
        overlay.drawing,
        isActive ? options.previewStroke : null,
        isActive ? options.activeLayerId : null,
      );
    });
    ctx.drawImage(strokeLayer, 0, 0);
  }

  drawLocationOverlays(
    ctx,
    options.locationMarkers ?? [],
    options.locationPinDraft,
  );
  drawHotspotOverlays(
    ctx,
    options.hotspotOverlays ?? [],
    options.hotspotDraftBounds,
  );

  ctx.restore();
}

async function loadBaseImage(
  mapId: string,
  baseImageRel: string,
): Promise<HTMLImageElement | null> {
  const key = cacheKey(mapId, baseImageRel);
  const cached = imageCache.get(key);
  if (cached) return cached;

  const relativePath = mapAssetProjectPath(mapId, baseImageRel);
  const dataUrl = await invokeCommand<string>("read_project_image_cmd", {
    relativePath,
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("map_base_image_load_failed"));
    img.src = dataUrl;
  });
  imageCache.set(key, image);
  return image;
}

export function useMapViewport({
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
  viewMode,
  previewStroke = null,
  activeLayerId = null,
  studioTool = "brush",
  onInteractiveClick,
  hotspotOverlays = [],
  hotspotDraftBounds = null,
  locationMarkers = [],
  locationPinDraft = null,
  locationCountAtT = 0,
  unpinnedKeysAtT = 0,
  pinnedKeysTotal = 0,
}: UseMapViewportOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [containerSize, setContainerSize] = useState<ContainerSize>({
    width: 640,
    height: 480,
  });
  const [viewport, setViewport] = useState<MapViewportState>({
    zoom: 1,
    panX: 0,
    panY: 0,
  });
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const panSession = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originPanX: number;
    originPanY: number;
  } | null>(null);
  const deferredClick = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const spacePressed = useRef(false);

  const activeEditingDrawing = composeNavDrawing
    ? composeNavDrawing
    : activeDrawingRefKey === "principal"
      ? principalDrawing
      : overlayDrawings.find((layer) => layer.drawingRefKey === activeDrawingRefKey)?.drawing ??
        principalDrawing;

  const emitRenderAudit = useCallback(
    (nextViewport: MapViewportState) => {
      if (!renderAudit.isStandardEnabled()) return;
      renderAudit.ui(UI_EVENTS.maps.viewport, {
        stub: false,
        mapId,
        zoom: nextViewport.zoom,
        pan: { x: nextViewport.panX, y: nextViewport.panY },
        viewMode,
      });
      renderAudit.ui(UI_EVENTS.maps.compositor, {
        stub: false,
        mapId,
        previewTRaw: previewTimeTRaw,
        timeT: previewTimeTRaw,
        previewTDisplay: formatMapDesdeDisplay(previewTimeTRaw),
        desdeRaw: document.desde,
        desdeDisplay: formatMapDesdeDisplay(document.desde),
        activeDrawingRef: activeDrawingRefKey,
        activeSecondaryIds,
        secondaryCount,
        navDepth,
        activeNavId,
        navStackIds,
        hostHotspotCount,
        locationCountAtT,
        unpinnedKeysAtT,
        pinnedKeysTotal,
        visibleLayers: activeEditingDrawing.layers
          .filter((layer) => layer.visible)
          .map((layer) => layer.id),
      });
    },
    [
      activeDrawingRefKey,
      activeEditingDrawing.layers,
      activeNavId,
      activeSecondaryIds,
      document.desde,
      hostHotspotCount,
      locationCountAtT,
      mapId,
      navDepth,
      navStackIds,
      pinnedKeysTotal,
      previewTimeTRaw,
      secondaryCount,
      unpinnedKeysAtT,
      viewMode,
    ],
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    paintMapViewport(
      ctx,
      containerSize,
      viewport,
      document,
      principalDrawing,
      baseImage,
      mapId,
      {
        overlayDrawings,
        activeDrawingRefKey,
        previewStroke,
        activeLayerId,
        composeNavDrawing,
        composeNavDrawingRefKey,
        hotspotOverlays,
        hotspotDraftBounds,
        locationMarkers,
        locationPinDraft,
      },
    );
  }, [
    activeDrawingRefKey,
    activeLayerId,
    baseImage,
    composeNavDrawing,
    composeNavDrawingRefKey,
    containerSize,
    document,
    hotspotDraftBounds,
    hotspotOverlays,
    locationMarkers,
    locationPinDraft,
    mapId,
    overlayDrawings,
    previewStroke,
    principalDrawing,
    viewport,
  ]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const update = () => {
      setContainerSize({
        width: Math.max(320, node.clientWidth),
        height: Math.max(240, node.clientHeight),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setViewport(
      computeFitViewport(
        containerSize.width,
        containerSize.height,
        document.width,
        document.height,
      ),
    );
  }, [containerSize.height, containerSize.width, document.height, document.width, mapId]);

  useEffect(() => {
    let cancelled = false;
    const baseImageRel = document.baseImageRel;
    if (!baseImageRel) {
      setBaseImage(null);
      return;
    }

    void loadBaseImage(mapId, baseImageRel)
      .then((image) => {
        if (!cancelled) setBaseImage(image);
      })
      .catch(() => {
        if (!cancelled) setBaseImage(null);
      });

    return () => {
      cancelled = true;
    };
  }, [document.baseImageRel, mapId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.round(containerSize.width * dpr);
    canvas.height = Math.round(containerSize.height * dpr);
    canvas.style.width = `${containerSize.width}px`;
    canvas.style.height = `${containerSize.height}px`;
    redraw();
  }, [containerSize, redraw]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    emitRenderAudit(viewport);
  }, [emitRenderAudit, viewport]);

  useEffect(() => {
    if (!renderAudit.isStandardEnabled()) return;
    const strokeCount = countMapStrokes(activeEditingDrawing);
    const visibleLayers = activeEditingDrawing.layers
      .filter((layer) => layer.visible)
      .map((layer) => layer.id);
    const timer = window.setTimeout(() => {
      renderAudit.ui(UI_EVENTS.maps.compositor, {
        stub: false,
        mapId,
        previewTRaw: previewTimeTRaw,
        timeT: previewTimeTRaw,
        previewTDisplay: formatMapDesdeDisplay(previewTimeTRaw),
        desdeRaw: document.desde,
        desdeDisplay: formatMapDesdeDisplay(document.desde),
        activeDrawingRef: activeDrawingRefKey,
        activeSecondaryIds,
        secondaryCount,
        navDepth,
        activeNavId,
        navStackIds,
        hostHotspotCount,
        visibleLayers,
        strokeCount,
        layerCount: activeEditingDrawing.layers.length,
        activeLayerId,
        layers: activeEditingDrawing.layers.map((layer) => ({
          id: layer.id,
          visible: layer.visible,
          locked: layer.locked,
          opacity: layer.opacity,
        })),
      });
    }, COMPOSITOR_AUDIT_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [
    activeDrawingRefKey,
    activeEditingDrawing,
    activeLayerId,
    activeNavId,
    activeSecondaryIds,
    document.desde,
    hostHotspotCount,
    mapId,
    navDepth,
    navStackIds,
    previewTimeTRaw,
    secondaryCount,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") spacePressed.current = true;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") spacePressed.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const canPan = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      return shouldPanPointer(viewMode, studioTool, event.button, spacePressed.current);
    },
    [studioTool, viewMode],
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      const clientX = event.clientX - rect.left;
      const clientY = event.clientY - rect.top;
      setViewport((prev) => zoomAtPoint(prev, clientX, clientY, event.deltaY));
    },
    [],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (
        viewMode === "interactive" &&
        onInteractiveClick &&
        event.button === 0 &&
        !spacePressed.current
      ) {
        deferredClick.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        return;
      }
      if (!canPan(event)) return;
      panSession.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originPanX: viewport.panX,
        originPanY: viewport.panY,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [canPan, onInteractiveClick, viewMode, viewport.panX, viewport.panY],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const pendingClick = deferredClick.current;
      if (pendingClick && pendingClick.pointerId === event.pointerId) {
        const moved = documentDistance(
          { x: pendingClick.startX, y: pendingClick.startY },
          { x: event.clientX, y: event.clientY },
        );
        if (moved >= INTERACTIVE_CLICK_MOVE_PX) {
          deferredClick.current = null;
          panSession.current = {
            pointerId: event.pointerId,
            startX: pendingClick.startX,
            startY: pendingClick.startY,
            originPanX: viewport.panX,
            originPanY: viewport.panY,
          };
        } else {
          return;
        }
      }

      const session = panSession.current;
      if (!session || session.pointerId !== event.pointerId) return;
      const dx = event.clientX - session.startX;
      const dy = event.clientY - session.startY;
      setViewport((prev) => ({
        ...prev,
        panX: session.originPanX + dx,
        panY: session.originPanY + dy,
      }));
    },
    [viewport.panX, viewport.panY],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const pendingClick = deferredClick.current;
      if (pendingClick && pendingClick.pointerId === event.pointerId) {
        deferredClick.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        const rect = event.currentTarget.getBoundingClientRect();
        const { x, y } = screenToDocument(event.clientX, event.clientY, rect, viewport);
        onInteractiveClick?.(x, y);
        return;
      }

      const session = panSession.current;
      if (!session || session.pointerId !== event.pointerId) return;
      panSession.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [onInteractiveClick, viewport],
  );

  return {
    containerRef,
    canvasRef,
    viewport,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isSpacePressed: () => spacePressed.current,
  };
}
