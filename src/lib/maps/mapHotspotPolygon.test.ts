import { describe, expect, it } from "vitest";

import {
  canCloseHotspotPolygon,
  clampHotspotPoint,
  HOTSPOT_POLYGON_CLOSE_RADIUS,
  isNearHotspotPoint,
  normalizeHotspotPolygon,
  polygonShapeFromPoints,
  worldToScreen,
} from "@/lib/maps/mapHotspotPolygon";

describe("mapHotspotPolygon", () => {
  it("clampHotspotPoint recorta al lienzo", () => {
    expect(clampHotspotPoint({ x: -5, y: 200 }, 100, 150)).toEqual({ x: 0, y: 150 });
    expect(clampHotspotPoint({ x: 50, y: 75 }, 100, 150)).toEqual({ x: 50, y: 75 });
  });

  it("isNearHotspotPoint usa radio de cierre", () => {
    const origin = { x: 0, y: 0 };
    expect(isNearHotspotPoint({ x: 10, y: 0 }, origin)).toBe(true);
    expect(isNearHotspotPoint({ x: 13, y: 0 }, origin)).toBe(false);
    expect(isNearHotspotPoint({ x: 13, y: 0 }, origin, HOTSPOT_POLYGON_CLOSE_RADIUS + 1)).toBe(
      true,
    );
  });

  it("canCloseHotspotPolygon exige al menos 3 vértices", () => {
    expect(canCloseHotspotPolygon([])).toBe(false);
    expect(canCloseHotspotPolygon([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(false);
    expect(
      canCloseHotspotPolygon([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 10 },
      ]),
    ).toBe(true);
  });

  it("normalizeHotspotPolygon rechaza polígonos inválidos y clampea puntos", () => {
    expect(normalizeHotspotPolygon([{ x: 0, y: 0 }], 100, 100)).toBeNull();
    expect(
      normalizeHotspotPolygon(
        [
          { x: -1, y: 0 },
          { x: 10, y: 0 },
          { x: 5, y: 200 },
        ],
        100,
        100,
      ),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 100 },
    ]);
  });

  it("polygonShapeFromPoints crea shape v2", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 10 },
    ];
    expect(polygonShapeFromPoints(points)).toEqual({ kind: "polygon", points });
  });

  it("worldToScreen aplica zoom y pan", () => {
    expect(worldToScreen({ x: 10, y: 20 }, { zoom: 2, panX: 5, panY: 7 })).toEqual({
      x: 25,
      y: 47,
    });
  });
});
