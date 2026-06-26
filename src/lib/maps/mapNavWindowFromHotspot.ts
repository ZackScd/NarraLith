import { trackAction } from "@/lib/action-audit/trackAction";
import { isSameHostDrawingRef } from "@/lib/maps/mapHostDrawingRef";
import type { MapHostDrawingRef, MapHotspotV2, MapNavSummaryV1 } from "@/lib/types/maps";
import { useMapNavWindowsStore, type MapNavWindowMode } from "@/stores/useMapNavWindowsStore";
import { useMapStore } from "@/stores/useMapStore";

export async function openNavWindowFromHotspot(options: {
  mapId: string | null;
  hotspot: MapHotspotV2;
  navDrawings: MapNavSummaryV1[];
  loadNavFile: (navId: string) => Promise<unknown>;
  parentNavId?: string;
  mode?: MapNavWindowMode;
}): Promise<boolean> {
  const { mapId, hotspot, navDrawings, loadNavFile, parentNavId, mode = "interactive" } =
    options;
  if (!mapId || useMapStore.getState().viewMode !== "interactive") {
    return false;
  }

  const summary = navDrawings.find((item) => item.id === hotspot.targetNavId);
  await loadNavFile(hotspot.targetNavId);
  useMapNavWindowsStore.getState().openWindow(hotspot.targetNavId, mode, {
    mapId,
    parentNavId,
  });
  trackAction("map", "navWindowOpen", {
    mapId,
    navId: hotspot.targetNavId,
    mode,
    parentNavId: parentNavId ?? null,
    fromHotspotId: hotspot.id,
    navName: summary?.name ?? hotspot.label ?? hotspot.targetNavId,
  });
  return true;
}

export function filterHotspotsForHost(
  hotspots: MapHotspotV2[],
  hostDrawingRef: MapHostDrawingRef,
): MapHotspotV2[] {
  return hotspots.filter((item) => isSameHostDrawingRef(item.hostDrawingRef, hostDrawingRef));
}

export function collectDescendantNavWindowIds(
  rootNavId: string,
  windows: ReadonlyArray<{ navId: string; parentNavId?: string }>,
): Set<string> {
  const ids = new Set<string>([rootNavId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const window of windows) {
      if (window.parentNavId && ids.has(window.parentNavId) && !ids.has(window.navId)) {
        ids.add(window.navId);
        changed = true;
      }
    }
  }
  return ids;
}
