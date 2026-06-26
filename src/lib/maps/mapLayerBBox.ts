import { getLayerStrokes, isImageLayer } from "@/lib/maps/mapImageLayers";
import type { MapDrawingLayerV2 } from "@/lib/types/maps";

export interface LayerContentBBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Bounding box del contenido dibujado en la capa (incluye radio del pincel). */
export function computeLayerContentBBox(layer: MapDrawingLayerV2): LayerContentBBox | null {
  if (isImageLayer(layer)) {
    return {
      minX: layer.x,
      minY: layer.y,
      maxX: layer.x + layer.width,
      maxY: layer.y + layer.height,
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasPoints = false;

  for (const stroke of getLayerStrokes(layer)) {
    const pad = Math.max(stroke.baseSize / 2, 0.5);
    for (const point of stroke.points) {
      minX = Math.min(minX, point.x - pad);
      minY = Math.min(minY, point.y - pad);
      maxX = Math.max(maxX, point.x + pad);
      maxY = Math.max(maxY, point.y + pad);
      hasPoints = true;
    }
  }

  if (!hasPoints) {
    return null;
  }

  if (maxX - minX < 1) {
    minX -= 0.5;
    maxX += 0.5;
  }
  if (maxY - minY < 1) {
    minY -= 0.5;
    maxY += 0.5;
  }

  return { minX, minY, maxX, maxY };
}
