import { hitTestHotspots } from "@/lib/maps/mapHotspotHitTest";
import { PRINCIPAL_HOST_DRAWING_REF } from "@/lib/maps/mapHostDrawingRef";
import type { MapHotspotV1 } from "@/lib/types/maps";
import type { MapViewMode } from "@/stores/useMapStore";

/** Resuelve hotspot clickeable en modo interactivo (raíz del mapa). */
export function resolveInteractiveHotspotHit(
  viewMode: MapViewMode,
  isNavView: boolean,
  worldX: number,
  worldY: number,
  hotspots: MapHotspotV1[],
): MapHotspotV1 | null {
  if (viewMode !== "interactive" || isNavView) {
    return null;
  }
  return hitTestHotspots(worldX, worldY, hotspots, PRINCIPAL_HOST_DRAWING_REF);
}
