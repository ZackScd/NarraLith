import { computeLayerContentBBox } from "@/lib/maps/mapLayerBBox";
import { drawLayerStrokes } from "@/lib/maps/mapStrokeRender";
import type { MapDrawingLayerV2 } from "@/lib/types/maps";

const THUMB_PADDING = 2;

export const MAP_LAYER_THUMB_WIDTH = 48;
export const MAP_LAYER_THUMB_HEIGHT = 36;

/** Renderiza la miniatura bbox-contenido de una capa en un canvas 2D. */
export function renderLayerThumbnail(
  ctx: CanvasRenderingContext2D,
  layer: MapDrawingLayerV2,
  width = MAP_LAYER_THUMB_WIDTH,
  height = MAP_LAYER_THUMB_HEIGHT,
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(0,0,0,0.04)";
  ctx.fillRect(0, 0, width, height);

  const bbox = computeLayerContentBBox(layer);
  if (!bbox) {
    return;
  }

  const contentW = bbox.maxX - bbox.minX;
  const contentH = bbox.maxY - bbox.minY;
  const innerW = width - THUMB_PADDING * 2;
  const innerH = height - THUMB_PADDING * 2;
  const scale = Math.min(innerW / contentW, innerH / contentH);

  ctx.save();
  ctx.translate(THUMB_PADDING, THUMB_PADDING);
  ctx.scale(scale, scale);
  ctx.translate(-bbox.minX, -bbox.minY);
  drawLayerStrokes(ctx, { ...layer, opacity: 1 });
  ctx.restore();
}
