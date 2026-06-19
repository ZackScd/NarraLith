import type { MapDocumentV1, MapStrokeV2 } from "@/lib/types/maps";

const strokeBufferCache = new Map<string, HTMLCanvasElement>();

function strokeBufferKey(
  mapId: string,
  drawingRefKey: string,
  width: number,
  height: number,
): string {
  return `${mapId}:${drawingRefKey}:${width}x${height}`;
}

function acquireStrokeBuffer(
  mapId: string,
  drawingRefKey: string,
  width: number,
  height: number,
): HTMLCanvasElement {
  const key = strokeBufferKey(mapId, drawingRefKey, width, height);
  const cached = strokeBufferCache.get(key);
  if (cached && cached.width === width && cached.height === height) {
    return cached;
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  strokeBufferCache.set(key, canvas);
  return canvas;
}

export function invalidateStrokeBuffers(mapId: string, drawingRefKey?: string): void {
  const prefix = drawingRefKey
    ? `${mapId}:${drawingRefKey}:`
    : `${mapId}:`;
  for (const key of strokeBufferCache.keys()) {
    if (key.startsWith(prefix)) {
      strokeBufferCache.delete(key);
    }
  }
}

export function paintStrokeLayer(
  mapId: string,
  drawingRefKey: string,
  document: MapDocumentV1,
  draw: (ctx: CanvasRenderingContext2D) => void,
): HTMLCanvasElement {
  const buffer = acquireStrokeBuffer(mapId, drawingRefKey, document.width, document.height);
  const ctx = buffer.getContext("2d");
  if (!ctx) return buffer;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, buffer.width, buffer.height);
  draw(ctx);
  return buffer;
}

export type { MapStrokeV2 };
