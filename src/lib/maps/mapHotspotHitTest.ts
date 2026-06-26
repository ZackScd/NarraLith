import { isSameHostDrawingRef } from "@/lib/maps/mapHostDrawingRef";
import { pointInHotspotBounds, pointInHotspotShape } from "@/lib/maps/mapHotspotShape";
import type { MapHostDrawingRef, MapHotspotV2 } from "@/lib/types/maps";

export { pointInHotspotBounds };

export function hitTestHotspots(
  worldX: number,
  worldY: number,
  hotspots: MapHotspotV2[],
  hostDrawingRef: MapHostDrawingRef,
): MapHotspotV2 | null {
  for (let index = hotspots.length - 1; index >= 0; index -= 1) {
    const hotspot = hotspots[index];
    if (!isSameHostDrawingRef(hotspot.hostDrawingRef, hostDrawingRef)) continue;
    if (pointInHotspotShape(worldX, worldY, hotspot.shape)) {
      return hotspot;
    }
  }
  return null;
}
