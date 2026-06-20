import { useCallback } from "react";

import { trackAction } from "@/lib/action-audit/trackAction";
import { pushNavFromHotspot } from "@/lib/maps/mapNavFromHotspot";
import type { MapHostDrawingRef, MapHotspotV1, MapNavSummaryV1 } from "@/lib/types/maps";
import { useMapStore } from "@/stores/useMapStore";

interface UseMapNavOptions {
  mapId: string | null;
  navDrawings: MapNavSummaryV1[];
  loadNavFile: (navId: string) => Promise<unknown>;
}

export function useMapNav({ mapId, navDrawings, loadNavFile }: UseMapNavOptions) {
  const navStack = useMapStore((s) => s.navStack);
  const navPop = useMapStore((s) => s.navPop);

  const pushFromHotspot = useCallback(
    async (hotspot: MapHotspotV1) => {
      await pushNavFromHotspot({ mapId, hotspot, navDrawings, loadNavFile });
    },
    [loadNavFile, mapId, navDrawings],
  );

  const popNav = useCallback(
    (toDepth?: number) => {
      if (!mapId || navStack.length === 0) return;
      const popped = navStack[navStack.length - 1];
      navPop(toDepth);
      trackAction("map", "navPop", {
        mapId,
        toDepth: useMapStore.getState().navStack.length,
        navId: popped?.navId ?? null,
      });
    },
    [mapId, navPop, navStack],
  );

  const activeNavFrame = navStack.length > 0 ? navStack[navStack.length - 1] : null;

  return {
    navStack,
    navDepth: navStack.length,
    activeNavId: activeNavFrame?.navId ?? null,
    activeNavFrame,
    pushFromHotspot,
    popNav,
  };
}

export function resolveNavHostDrawingRef(
  navStack: { hostDrawingRef: MapHostDrawingRef }[],
): MapHostDrawingRef {
  return navStack.length === 0 ? { kind: "principal" } : navStack[navStack.length - 1].hostDrawingRef;
}
