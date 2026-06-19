import type { MapDrawingLayerV2, MapDrawingV2, MapStrokePointV2, MapStrokeV2 } from "@/lib/types/maps";

export interface StrokePolyline {
  strokeId: string;
  points: ReadonlyArray<{ x: number; y: number }>;
}

/** Agrupa puntos de trazo en polilíneas renderizables (≥1 punto). */
export function buildStrokePolylines(stroke: MapStrokeV2): StrokePolyline | null {
  if (stroke.points.length === 0) return null;
  return {
    strokeId: stroke.id,
    points: stroke.points.map(normalizePoint),
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

function normalizePoint(point: MapStrokePointV2): { x: number; y: number } {
  return { x: point.x, y: point.y };
}

export function drawMapStrokes(
  ctx: CanvasRenderingContext2D,
  drawing: MapDrawingV2,
): void {
  for (const layer of drawing.layers) {
    if (!layer.visible) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    for (const stroke of layer.strokes) {
      drawStroke(ctx, stroke);
    }
    ctx.restore();
  }
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: MapStrokeV2): void {
  const polyline = buildStrokePolylines(stroke);
  if (!polyline) return;

  const { points } = polyline;
  ctx.save();
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.baseSize;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha *= stroke.baseOpacity;

  if (points.length === 1) {
    const p = points[0]!;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(stroke.baseSize / 2, 0.5), 0, Math.PI * 2);
    ctx.fillStyle = stroke.color;
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i]!.x, points[i]!.y);
  }
  ctx.stroke();
  ctx.restore();
}
