import { hitTestHotspots } from "@/lib/maps/mapHotspotHitTest";
import { PRINCIPAL_HOST_DRAWING_REF } from "@/lib/maps/mapHostDrawingRef";
import type { MapHostDrawingRef, MapHotspotV2 } from "@/lib/types/maps";
import type { MapViewMode } from "@/stores/useMapStore";

/** Resuelve hotspot clickeable en modo interactivo para un host dado. */
export function resolveInteractiveHotspotHit(
  viewMode: MapViewMode,
  worldX: number,
  worldY: number,
  hotspots: MapHotspotV2[],
  hostDrawingRef: MapHostDrawingRef = PRINCIPAL_HOST_DRAWING_REF,
): MapHotspotV2 | null {
  if (viewMode !== "interactive") {
    return null;
  }
  return hitTestHotspots(worldX, worldY, hotspots, hostDrawingRef);
}
