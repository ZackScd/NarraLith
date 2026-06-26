import { segmentStrokeStyle } from "@/lib/maps/mapBrushEngine";
import { getLayerStrokes, isImageLayer } from "@/lib/maps/mapImageLayers";
import type { MapDrawingLayerV2, MapDrawingV2, MapStrokePointV2, MapStrokeV2 } from "@/lib/types/maps";
import { resolveLayerEffectiveState } from "@/lib/maps/mapLayerGroups";

export interface StrokePolyline {
  strokeId: string;
  points: ReadonlyArray<MapStrokePointV2>;
}

/** Agrupa puntos de trazo en polilíneas renderizables (≥1 punto). */
export function buildStrokePolylines(stroke: MapStrokeV2): StrokePolyline | null {
  if (stroke.points.length === 0) return null;
  return {
    strokeId: stroke.id,
    points: stroke.points,
  };
}

export function buildLayerPolylines(
  layer: MapDrawingLayerV2,
  groups?: MapDrawingV2["groups"],
): StrokePolyline[] {
  if (isImageLayer(layer)) return [];
  const effective = resolveLayerEffectiveState(layer, groups);
  if (!effective.visible) return [];
  return getLayerStrokes(layer)
    .map(buildStrokePolylines)
    .filter((polyline): polyline is StrokePolyline => polyline !== null);
}

/** Dibuja los trazos de una capa (sin preview). */
export function drawLayerStrokes(
  ctx: CanvasRenderingContext2D,
  layer: MapDrawingLayerV2,
): void {
  if (isImageLayer(layer)) return;
  ctx.save();
  ctx.globalAlpha = layer.opacity;
  for (const stroke of getLayerStrokes(layer)) {
    drawStroke(ctx, stroke, layer.opacity);
  }
  ctx.restore();
}

export function buildDrawingPolylines(drawing: MapDrawingV2): StrokePolyline[] {
  return drawing.layers.flatMap((layer) => buildLayerPolylines(layer, drawing.groups));
}

function drawImageLayer(
  ctx: CanvasRenderingContext2D,
  layer: MapDrawingLayerV2,
  opacity: number,
  images: ReadonlyMap<string, HTMLImageElement>,
): void {
  if (!isImageLayer(layer)) return;
  const image = images.get(layer.assetPath);
  if (!image) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(image, layer.x, layer.y, layer.width, layer.height);
  ctx.restore();
}

export function drawMapStrokes(
  ctx: CanvasRenderingContext2D,
  drawing: MapDrawingV2,
  previewStroke?: MapStrokeV2 | null,
  activeLayerId?: string | null,
  layerImages?: ReadonlyMap<string, HTMLImageElement>,
): void {
  for (const layer of drawing.layers) {
    const effective = resolveLayerEffectiveState(layer, drawing.groups);
    if (!effective.visible) continue;

    if (isImageLayer(layer)) {
      if (layerImages) {
        drawImageLayer(ctx, layer, effective.opacity, layerImages);
      }
      continue;
    }

    ctx.save();
    ctx.globalAlpha = effective.opacity;
    for (const stroke of getLayerStrokes(layer)) {
      drawStroke(ctx, stroke, effective.opacity);
    }
    ctx.restore();
  }

  if (previewStroke && previewStroke.points.length > 0) {
    const layer =
      (activeLayerId
        ? drawing.layers.find((item) => item.id === activeLayerId)
        : null) ?? drawing.layers.find((item) => {
        if (isImageLayer(item)) return false;
        const effective = resolveLayerEffectiveState(item, drawing.groups);
        return effective.visible && !effective.locked;
      });
    const layerOpacity = layer
      ? resolveLayerEffectiveState(layer, drawing.groups).opacity
      : 1;
    ctx.save();
    ctx.globalAlpha = layerOpacity;
    drawStroke(ctx, previewStroke, layerOpacity);
    ctx.restore();
  }
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: MapStrokeV2,
  layerOpacity: number,
): void {
  if (stroke.points.length === 0) return;

  const isEraser = stroke.tool === "eraser";
  ctx.save();
  if (isEraser) {
    ctx.globalCompositeOperation = "destination-out";
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (stroke.points.length === 1) {
    const point = stroke.points[0]!;
    const style = segmentStrokeStyle(
      stroke.brush,
      stroke.baseSize,
      stroke.baseOpacity,
      point,
      point,
    );
    ctx.globalAlpha = layerOpacity * style.opacity;
    if (isEraser) {
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.beginPath();
      ctx.arc(point.x, point.y, Math.max(style.size / 2, 0.5), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = stroke.color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, Math.max(style.size / 2, 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  for (let i = 1; i < stroke.points.length; i += 1) {
    const from = stroke.points[i - 1]!;
    const to = stroke.points[i]!;
    const style = segmentStrokeStyle(stroke.brush, stroke.baseSize, stroke.baseOpacity, from, to);
    ctx.globalAlpha = layerOpacity * style.opacity;
    ctx.lineWidth = Math.max(style.size, 0.5);
    if (isEraser) {
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.strokeStyle = stroke.color;
    }
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  ctx.restore();
}
