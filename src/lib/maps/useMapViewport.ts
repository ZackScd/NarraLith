import { useCallback, useEffect, useRef, useState } from "react";

import { invokeCommand } from "@/lib/ipc";
import { countMapStrokes } from "@/lib/maps/mapDrawingStats";
import { formatMapDesdeDisplay } from "@/lib/maps/mapDesde";
import { drawLocationMarkers, drawLocationPinDraft } from "@/lib/maps/mapLocationMarkers";
import { mapAssetProjectPath } from "@/lib/maps/mapAssetPath";
import { paintStrokeLayer } from "@/lib/maps/mapStrokeBuffer";
import { collectDrawingImageAssetPaths } from "@/lib/maps/mapImageLayerRender";
import {
  drawHotspotShape,
  rectShapeFromBounds,
  type HotspotOverlayStyle,
} from "@/lib/maps/mapHotspotShape";
import { drawMapStrokes } from "@/lib/maps/mapStrokeRender";
import { renderAudit } from "@/lib/render-audit";
import { UI_EVENTS } from "@/lib/render-audit/events";
import type { MapDocumentV1, MapDrawingV2, MapHotspotBoundsV1, MapHotspotShapeV2, MapHotspotV2, MapStrokeV2 } from "@/lib/types/maps";
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
  hotspotOverlays?: MapHotspotV2[];
  hotspotDraftBounds?: MapHotspotBoundsV1 | null;
  hotspotDraftShape?: MapHotspotShapeV2 | null;
  hotspotHighlightId?: string | null;
  hotspotOverlayStyle?: HotspotOverlayStyle;
  locationMarkers?: MapLocatedMarkerV1[];
  locationPinDraft?: { x: number; y: number } | null;
  /** Caché de bitmaps de capas imagen (clave = assetPath). */
  layerImages?: ReadonlyMap<string, HTMLImageElement>;
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
export const INTERACTIVE_CLICK_MOVE_PX = 5;

interface UseMapViewportOptions {
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
  viewMode: MapViewMode;
  previewStroke?: MapStrokeV2 | null;
  activeLayerId?: string | null;
  studioTool?: MapStudioTool;
  /** Clic en interactivo (coords documento). true = consumido (p. ej. hotspot). */
  onInteractiveClick?: (worldX: number, worldY: number) => boolean;
  hotspotOverlays?: MapHotspotV2[];
  hotspotDraftBounds?: MapHotspotBoundsV1 | null;
  hotspotDraftShape?: MapHotspotShapeV2 | null;
  hotspotHighlightId?: string | null;
  hotspotOverlayStyle?: HotspotOverlayStyle;
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

export type { HotspotOverlayStyle };

function drawHotspotOverlays(
  ctx: CanvasRenderingContext2D,
  hotspots: MapHotspotV2[],
  draftBounds: MapHotspotBoundsV1 | null | undefined,
  draftShape: MapHotspotShapeV2 | null | undefined,
  style: HotspotOverlayStyle = "edit",
  highlightHotspotId?: string | null,
): void {
  for (const hotspot of hotspots) {
    const isHighlight = highlightHotspotId === hotspot.id;
    if (style === "interactive") {
      drawHotspotShape(
        ctx,
        hotspot.shape,
        isHighlight ? "rgba(234, 179, 8, 0.95)" : "rgba(59, 130, 246, 0.55)",
        isHighlight ? "rgba(234, 179, 8, 0.22)" : "rgba(59, 130, 246, 0.1)",
        style,
      );
    } else {
      drawHotspotShape(
        ctx,
        hotspot.shape,
        isHighlight ? "rgba(234, 179, 8, 0.95)" : "rgba(59, 130, 246, 0.95)",
        isHighlight ? "rgba(234, 179, 8, 0.28)" : "rgba(59, 130, 246, 0.18)",
        style,
      );
    }
  }
  const draft =
    draftShape ??
    (draftBounds && draftBounds.width > 0 && draftBounds.height > 0
      ? rectShapeFromBounds(draftBounds)
      : null);
  if (draft) {
    drawHotspotShape(
      ctx,
      draft,
      "rgba(234, 179, 8, 0.95)",
      "rgba(234, 179, 8, 0.2)",
      style,
    );
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

function paintDrawingSurface(
  ctx: CanvasRenderingContext2D,
  drawing: MapDrawingV2,
  baseImage: HTMLImageElement | null,
  allowLegacyBaseImage: boolean,
): void {
  const { width, height, backgroundColor } = drawing;
  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    return;
  }
  if (allowLegacyBaseImage && baseImage) {
    ctx.drawImage(baseImage, 0, 0, width, height);
    return;
  }
  if (allowLegacyBaseImage) {
    drawGrid(ctx, width, height);
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

  paintDrawingSurface(ctx, principalDrawing, baseImage, true);

  const principalLayer = paintStrokeLayer(mapId, "principal", document, (bufferCtx) => {
    const isActive = activeDrawingRefKey === "principal";
    drawMapStrokes(
      bufferCtx,
      principalDrawing,
      isActive ? options.previewStroke : null,
      isActive ? options.activeLayerId : null,
      options.layerImages,
    );
  });
  ctx.drawImage(principalLayer, 0, 0);

  for (const overlay of options.overlayDrawings ?? []) {
    paintDrawingSurface(ctx, overlay.drawing, null, false);
    const strokeLayer = paintStrokeLayer(mapId, overlay.drawingRefKey, document, (bufferCtx) => {
      const isActive = activeDrawingRefKey === overlay.drawingRefKey;
      drawMapStrokes(
        bufferCtx,
        overlay.drawing,
        isActive ? options.previewStroke : null,
        isActive ? options.activeLayerId : null,
        options.layerImages,
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
    options.hotspotDraftShape,
    options.hotspotOverlayStyle ?? "edit",
    options.hotspotHighlightId,
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
  openNavWindowCount = 0,
  hostHotspotCount = 0,
  viewMode,
  previewStroke = null,
  activeLayerId = null,
  studioTool = "brush",
  onInteractiveClick,
  hotspotOverlays = [],
  hotspotDraftBounds = null,
  hotspotDraftShape = null,
  hotspotHighlightId = null,
  hotspotOverlayStyle = "edit",
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
  const [layerImages, setLayerImages] = useState<Map<string, HTMLImageElement>>(new Map());
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

  const activeEditingDrawing =
    activeDrawingRefKey === "principal"
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
        openNavWindowCount,
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
      activeSecondaryIds,
      document.desde,
      hostHotspotCount,
      locationCountAtT,
      mapId,
      openNavWindowCount,
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
        hotspotOverlays,
        hotspotDraftBounds,
        hotspotDraftShape,
        hotspotOverlayStyle,
        hotspotHighlightId,
        locationMarkers,
        locationPinDraft,
        layerImages,
      },
    );
  }, [
    activeDrawingRefKey,
    activeLayerId,
    baseImage,
    layerImages,
    containerSize,
    document,
    hotspotDraftBounds,
    hotspotDraftShape,
    hotspotHighlightId,
    hotspotOverlayStyle,
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
    let cancelled = false;
    const assetPaths = new Set<string>([
      ...collectDrawingImageAssetPaths(principalDrawing),
      ...overlayDrawings.flatMap((overlay) => collectDrawingImageAssetPaths(overlay.drawing)),
    ]);

    if (assetPaths.size === 0) {
      setLayerImages((prev) => (prev.size === 0 ? prev : new Map()));
      return;
    }

    void Promise.all(
      [...assetPaths].map(async (assetPath) => {
        const image = await loadBaseImage(mapId, assetPath);
        return [assetPath, image] as const;
      }),
    )
      .then((entries) => {
        if (cancelled) return;
        const next = new Map<string, HTMLImageElement>();
        for (const [assetPath, image] of entries) {
          if (image) next.set(assetPath, image);
        }
        setLayerImages(next);
      })
      .catch(() => {
        if (!cancelled) setLayerImages(new Map());
      });

    return () => {
      cancelled = true;
    };
  }, [mapId, overlayDrawings, principalDrawing]);

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
        openNavWindowCount,
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
    activeSecondaryIds,
    document.desde,
    hostHotspotCount,
    mapId,
    openNavWindowCount,
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
