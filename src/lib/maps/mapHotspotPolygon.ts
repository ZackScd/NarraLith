import { documentDistance } from "@/lib/maps/mapDrawCoords";
import type { MapHotspotPointV2, MapHotspotShapeV2 } from "@/lib/types/maps";

export const HOTSPOT_POLYGON_MIN_VERTICES = 3;
export const HOTSPOT_POLYGON_CLOSE_RADIUS = 12;

export function clampHotspotPoint(
  point: MapHotspotPointV2,
  canvasWidth: number,
  canvasHeight: number,
): MapHotspotPointV2 {
  return {
    x: Math.min(canvasWidth, Math.max(0, point.x)),
    y: Math.min(canvasHeight, Math.max(0, point.y)),
  };
}

export function isNearHotspotPoint(
  a: MapHotspotPointV2,
  b: MapHotspotPointV2,
  radius = HOTSPOT_POLYGON_CLOSE_RADIUS,
): boolean {
  return documentDistance(a, b) <= radius;
}

export function canCloseHotspotPolygon(vertices: ReadonlyArray<MapHotspotPointV2>): boolean {
  return vertices.length >= HOTSPOT_POLYGON_MIN_VERTICES;
}

export function normalizeHotspotPolygon(
  points: MapHotspotPointV2[],
  canvasWidth: number,
  canvasHeight: number,
): MapHotspotPointV2[] | null {
  if (points.length < HOTSPOT_POLYGON_MIN_VERTICES) return null;
  return points.map((point) => clampHotspotPoint(point, canvasWidth, canvasHeight));
}

export function polygonShapeFromPoints(points: MapHotspotPointV2[]): MapHotspotShapeV2 {
  return { kind: "polygon", points };
}

export function worldToScreen(
  point: MapHotspotPointV2,
  viewport: { zoom: number; panX: number; panY: number },
): MapHotspotPointV2 {
  return {
    x: point.x * viewport.zoom + viewport.panX,
    y: point.y * viewport.zoom + viewport.panY,
  };
}
