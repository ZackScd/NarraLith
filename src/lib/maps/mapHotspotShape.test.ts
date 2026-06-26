import { describe, expect, it } from "vitest";

import {
  migrateHotspotV1ToV2,
  pointInHotspotShape,
  rectShapeFromBounds,
} from "@/lib/maps/mapHotspotShape";
import type { MapHotspotV1 } from "@/lib/types/maps";

describe("mapHotspotShape", () => {
  it("migra bounds v1 a shape rect v2", () => {
    const v1: MapHotspotV1 = {
      id: "hs-1",
      hostDrawingRef: { kind: "principal" },
      bounds: { x: 1, y: 2, width: 10, height: 20 },
      targetNavId: "nav-1",
    };
    expect(migrateHotspotV1ToV2(v1)).toEqual({
      id: "hs-1",
      hostDrawingRef: { kind: "principal" },
      shape: { kind: "rect", x: 1, y: 2, width: 10, height: 20 },
      targetNavId: "nav-1",
    });
  });

  it("hit-test rect y circle", () => {
    const rect = rectShapeFromBounds({ x: 0, y: 0, width: 10, height: 10 });
    expect(pointInHotspotShape(5, 5, rect)).toBe(true);
    expect(pointInHotspotShape(10, 10, rect)).toBe(false);

    const circle = { kind: "circle" as const, cx: 0, cy: 0, radius: 5 };
    expect(pointInHotspotShape(3, 0, circle)).toBe(true);
    expect(pointInHotspotShape(6, 0, circle)).toBe(false);
  });

  it("hit-test polígono simple", () => {
    const triangle = {
      kind: "polygon" as const,
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 10 },
      ],
    };
    expect(pointInHotspotShape(5, 3, triangle)).toBe(true);
    expect(pointInHotspotShape(1, 9, triangle)).toBe(false);
  });
});
