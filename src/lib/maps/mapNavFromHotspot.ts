import { trackAction } from "@/lib/action-audit/trackAction";
import { hostDrawingRefKey } from "@/lib/maps/mapHostDrawingRef";
import type { MapHotspotV1, MapNavFrame, MapNavSummaryV1 } from "@/lib/types/maps";
import { useMapStore } from "@/stores/useMapStore";

export async function pushNavFromHotspot(options: {
  mapId: string | null;
  hotspot: MapHotspotV1;
  navDrawings: MapNavSummaryV1[];
  loadNavFile: (navId: string) => Promise<unknown>;
}): Promise<boolean> {
  const { mapId, hotspot, navDrawings, loadNavFile } = options;
  if (!mapId || useMapStore.getState().viewMode !== "interactive") {
    return false;
  }

  const summary = navDrawings.find((item) => item.id === hotspot.targetNavId);
  await loadNavFile(hotspot.targetNavId);
  const frame: MapNavFrame = {
    navId: hotspot.targetNavId,
    name: summary?.name ?? hotspot.label ?? hotspot.targetNavId,
    hostDrawingRef: hotspot.hostDrawingRef,
  };
  useMapStore.getState().navPush(frame);
  trackAction("map", "navPush", {
    mapId,
    navId: frame.navId,
    hostDrawingRef: hostDrawingRefKey(hotspot.hostDrawingRef),
    depth: useMapStore.getState().navStack.length,
  });
  return true;
}
