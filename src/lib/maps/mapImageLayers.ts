import type { MapDrawingImageLayerV2, MapDrawingLayerV2, MapStrokeV2 } from "@/lib/types/maps";

export function isImageLayer(layer: MapDrawingLayerV2): layer is MapDrawingImageLayerV2 {
  return layer.kind === "image";
}

export function isVectorLayer(layer: MapDrawingLayerV2): boolean {
  return !isImageLayer(layer);
}

export function getLayerStrokes(layer: MapDrawingLayerV2): MapStrokeV2[] {
  if (isImageLayer(layer)) return [];
  return layer.strokes ?? [];
}
