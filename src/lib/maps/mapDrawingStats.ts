import type { MapDrawingV2, MapStrokeV2 } from "@/lib/types/maps";

export function countMapStrokes(drawing: MapDrawingV2): number {
  return drawing.layers.reduce((total, layer) => total + layer.strokes.length, 0);
}

export function strokeHadPressure(stroke: MapStrokeV2): boolean {
  return stroke.points.some((point) => point.pressure != null);
}
