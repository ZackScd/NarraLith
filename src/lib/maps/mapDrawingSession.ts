import { MAP_STUDIO_MIN_POINT_DISTANCE } from "@/lib/maps/mapBrushes";
import { documentDistance } from "@/lib/maps/mapDrawCoords";
import type {
  MapDrawingLayerV2,
  MapDrawingV2,
  MapStrokePointV2,
  MapStrokeV2,
} from "@/lib/types/maps";

export type MapDrawingSaveStatus = "idle" | "saving" | "saved" | "error";

/** Profundidad máxima undo/redo (MAP-005b D20). */
export const MAP_UNDO_MAX_DEPTH = 50;

export interface MapDrawingUndoOp {
  kind: "addStroke" | "removeStroke";
  layerId: string;
  stroke: MapStrokeV2;
}

export function cloneDrawing(drawing: MapDrawingV2): MapDrawingV2 {
  return structuredClone(drawing);
}

export function resolveActiveLayer(drawing: MapDrawingV2): MapDrawingLayerV2 | null {
  return drawing.layers.find((layer) => layer.visible && !layer.locked) ?? null;
}

export function createStrokeId(): string {
  return `stroke-${crypto.randomUUID()}`;
}

export function shouldAppendPoint(
  last: MapStrokePointV2 | undefined,
  next: MapStrokePointV2,
): boolean {
  if (!last) return true;
  return documentDistance(last, next) >= MAP_STUDIO_MIN_POINT_DISTANCE;
}

export function appendPointToStroke(
  stroke: MapStrokeV2,
  point: MapStrokePointV2,
): MapStrokeV2 {
  if (!shouldAppendPoint(stroke.points[stroke.points.length - 1], point)) {
    return stroke;
  }
  return {
    ...stroke,
    points: [...stroke.points, point],
  };
}

export function pushStrokeToLayer(
  drawing: MapDrawingV2,
  layerId: string,
  stroke: MapStrokeV2,
): MapDrawingV2 {
  return {
    ...drawing,
    layers: drawing.layers.map((layer) =>
      layer.id === layerId ? { ...layer, strokes: [...layer.strokes, stroke] } : layer,
    ),
  };
}

export function removeStrokeFromLayer(
  drawing: MapDrawingV2,
  layerId: string,
  strokeId: string,
): { drawing: MapDrawingV2; removed: MapStrokeV2 | null } {
  let removed: MapStrokeV2 | null = null;
  const layers = drawing.layers.map((layer) => {
    if (layer.id !== layerId) return layer;
    const strokes = layer.strokes.filter((stroke) => {
      if (stroke.id === strokeId) {
        removed = stroke;
        return false;
      }
      return true;
    });
    return { ...layer, strokes };
  });
  return { drawing: { ...drawing, layers }, removed };
}
