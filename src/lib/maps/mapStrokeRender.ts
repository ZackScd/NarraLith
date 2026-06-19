import { segmentStrokeStyle } from "@/lib/maps/mapBrushEngine";
import type { MapDrawingLayerV2, MapDrawingV2, MapStrokePointV2, MapStrokeV2 } from "@/lib/types/maps";

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

export function buildLayerPolylines(layer: MapDrawingLayerV2): StrokePolyline[] {
  if (!layer.visible) return [];
  return layer.strokes
    .map(buildStrokePolylines)
    .filter((polyline): polyline is StrokePolyline => polyline !== null);
}

export function buildDrawingPolylines(drawing: MapDrawingV2): StrokePolyline[] {
  return drawing.layers.flatMap(buildLayerPolylines);
}

export function drawMapStrokes(
  ctx: CanvasRenderingContext2D,
  drawing: MapDrawingV2,
  previewStroke?: MapStrokeV2 | null,
  activeLayerId?: string | null,
): void {
  for (const layer of drawing.layers) {
    if (!layer.visible) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    for (const stroke of layer.strokes) {
      drawStroke(ctx, stroke, layer.opacity);
    }
    ctx.restore();
  }

  if (previewStroke && previewStroke.points.length > 0) {
    const layer =
      (activeLayerId
        ? drawing.layers.find((item) => item.id === activeLayerId)
        : null) ?? drawing.layers.find((item) => item.visible && !item.locked);
    const layerOpacity = layer?.opacity ?? 1;
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
