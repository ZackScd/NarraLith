import { useCallback, useEffect, useRef, useState } from "react";

import { invokeCommand } from "@/lib/ipc";
import { mapAssetProjectPath } from "@/lib/maps/mapAssetPath";
import { drawMapStrokes } from "@/lib/maps/mapStrokeRender";
import { renderAudit } from "@/lib/render-audit";
import { UI_EVENTS } from "@/lib/render-audit/events";
import type { MapDocumentV1, MapDrawingV2 } from "@/lib/types/maps";
import type { MapViewMode } from "@/stores/useMapStore";

export interface MapViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

export const MAP_VIEWPORT_MIN_ZOOM = 0.25;
export const MAP_VIEWPORT_MAX_ZOOM = 2;

const GRID_SIZE = 32;
const MAX_DPR = 2;

interface UseMapViewportOptions {
  mapId: string;
  document: MapDocumentV1;
  drawing: MapDrawingV2;
  viewMode: MapViewMode;
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

export function paintMapViewport(
  ctx: CanvasRenderingContext2D,
  size: ContainerSize,
  viewport: MapViewportState,
  document: MapDocumentV1,
  drawing: MapDrawingV2,
  baseImage: HTMLImageElement | null,
): void {
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

  drawMapStrokes(ctx, drawing);
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
  drawing,
  viewMode,
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
  const spacePressed = useRef(false);

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
        timeT: null,
        visibleLayers: drawing.layers.filter((layer) => layer.visible).map((layer) => layer.id),
      });
    },
    [drawing.layers, mapId, viewMode],
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    paintMapViewport(ctx, containerSize, viewport, document, drawing, baseImage);
  }, [baseImage, containerSize, document, drawing, viewport]);

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

  const canPan = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    return (
      event.button === 1 ||
      (event.button === 0 && spacePressed.current) ||
      event.button === 0
    );
  }, []);

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
    [canPan, viewport.panX, viewport.panY],
  );

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const session = panSession.current;
    if (!session || session.pointerId !== event.pointerId) return;
    const dx = event.clientX - session.startX;
    const dy = event.clientY - session.startY;
    setViewport((prev) => ({
      ...prev,
      panX: session.originPanX + dx,
      panY: session.originPanY + dy,
    }));
  }, []);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const session = panSession.current;
    if (!session || session.pointerId !== event.pointerId) return;
    panSession.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  return {
    containerRef,
    canvasRef,
    viewport,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
