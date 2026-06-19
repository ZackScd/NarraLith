import { useCallback } from "react";

import { trackAction } from "@/lib/action-audit/trackAction";
import { hostDrawingRefKey } from "@/lib/maps/mapHostDrawingRef";
import type { MapHostDrawingRef, MapHotspotV1, MapNavFrame, MapNavSummaryV1 } from "@/lib/types/maps";
import { useMapStore } from "@/stores/useMapStore";

interface UseMapNavOptions {
  mapId: string | null;
  navDrawings: MapNavSummaryV1[];
  loadNavFile: (navId: string) => Promise<unknown>;
}

export function useMapNav({ mapId, navDrawings, loadNavFile }: UseMapNavOptions) {
  const navStack = useMapStore((s) => s.navStack);
  const navPush = useMapStore((s) => s.navPush);
  const navPop = useMapStore((s) => s.navPop);

  const pushFromHotspot = useCallback(
    async (hotspot: MapHotspotV1) => {
      if (!mapId || useMapStore.getState().viewMode !== "interactive") return;
      const summary = navDrawings.find((item) => item.id === hotspot.targetNavId);
      await loadNavFile(hotspot.targetNavId);
      const frame: MapNavFrame = {
        navId: hotspot.targetNavId,
        name: summary?.name ?? hotspot.label ?? hotspot.targetNavId,
        hostDrawingRef: hotspot.hostDrawingRef,
      };
      navPush(frame);
      trackAction("map", "navPush", {
        mapId,
        navId: frame.navId,
        hostDrawingRef: hostDrawingRefKey(hotspot.hostDrawingRef),
        depth: useMapStore.getState().navStack.length,
      });
    },
    [loadNavFile, mapId, navDrawings, navPush],
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
  navStack: MapNavFrame[],
): MapHostDrawingRef {
  return navStack.length === 0 ? { kind: "principal" } : navStack[navStack.length - 1].hostDrawingRef;
}
