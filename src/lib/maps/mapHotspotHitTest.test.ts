import { describe, expect, it } from "vitest";

import { hitTestHotspots, pointInHotspotBounds } from "@/lib/maps/mapHotspotHitTest";
import { rectShapeFromBounds } from "@/lib/maps/mapHotspotShape";
import type { MapHotspotV2 } from "@/lib/types/maps";

function hotspot(
  id: string,
  bounds: { x: number; y: number; width: number; height: number },
  targetNavId: string,
): MapHotspotV2 {
  return {
    id,
    hostDrawingRef: { kind: "principal" },
    shape: rectShapeFromBounds(bounds),
    targetNavId,
  };
}

describe("pointInHotspotBounds", () => {
  it("inside inclusive min, exclusive max edge", () => {
    const bounds = { x: 10, y: 20, width: 100, height: 50 };
    expect(pointInHotspotBounds(10, 20, bounds)).toBe(true);
    expect(pointInHotspotBounds(109, 69, bounds)).toBe(true);
    expect(pointInHotspotBounds(110, 70, bounds)).toBe(false);
  });
});

describe("hitTestHotspots", () => {
  const host = { kind: "principal" as const };
  const hotspots = [
    hotspot("hs-1", { x: 0, y: 0, width: 50, height: 50 }, "nav-a"),
    hotspot("hs-2", { x: 40, y: 40, width: 50, height: 50 }, "nav-b"),
  ];

  it("returns top-most overlapping hotspot", () => {
    expect(hitTestHotspots(45, 45, hotspots, host)?.id).toBe("hs-2");
  });

  it("returns null outside all bounds", () => {
    expect(hitTestHotspots(200, 200, hotspots, host)).toBeNull();
  });

  it("filters by hostDrawingRef", () => {
    const navHostHotspot: MapHotspotV2 = {
      id: "hs-nav",
      hostDrawingRef: { kind: "nav", id: "nav-x" },
      shape: rectShapeFromBounds({ x: 0, y: 0, width: 10, height: 10 }),
      targetNavId: "nav-y",
    };
    expect(hitTestHotspots(5, 5, [navHostHotspot], host)).toBeNull();
    expect(
      hitTestHotspots(5, 5, [navHostHotspot], { kind: "nav", id: "nav-x" })?.id,
    ).toBe("hs-nav");
  });
});
