import { isSameHostDrawingRef } from "@/lib/maps/mapHostDrawingRef";
import type {
  MapHostDrawingRef,
  MapHotspotBoundsV1,
  MapHotspotV1,
} from "@/lib/types/maps";

export function pointInHotspotBounds(
  x: number,
  y: number,
  bounds: MapHotspotBoundsV1,
): boolean {
  return (
    x >= bounds.x &&
    x < bounds.x + bounds.width &&
    y >= bounds.y &&
    y < bounds.y + bounds.height
  );
}

export function hitTestHotspots(
  worldX: number,
  worldY: number,
  hotspots: MapHotspotV1[],
  hostDrawingRef: MapHostDrawingRef,
): MapHotspotV1 | null {
  for (let index = hotspots.length - 1; index >= 0; index -= 1) {
    const hotspot = hotspots[index];
    if (!isSameHostDrawingRef(hotspot.hostDrawingRef, hostDrawingRef)) continue;
    if (pointInHotspotBounds(worldX, worldY, hotspot.bounds)) {
      return hotspot;
    }
  }
  return null;
}
