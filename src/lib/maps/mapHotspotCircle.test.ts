import { describe, expect, it } from "vitest";

import {
  circleShapeFromDraft,
  HOTSPOT_CIRCLE_MIN_RADIUS,
  normalizeHotspotCircle,
} from "@/lib/maps/mapHotspotCircle";

describe("mapHotspotCircle", () => {
  it("normalizeHotspotCircle rechaza radios pequeños", () => {
    expect(normalizeHotspotCircle(50, 50, 52, 50, 200, 200)).toBeNull();
    expect(normalizeHotspotCircle(50, 50, 50 + HOTSPOT_CIRCLE_MIN_RADIUS, 50, 200, 200)).toEqual({
      cx: 50,
      cy: 50,
      radius: HOTSPOT_CIRCLE_MIN_RADIUS,
    });
  });

  it("normalizeHotspotCircle recorta al lienzo", () => {
    const circle = normalizeHotspotCircle(5, 5, 200, 200, 100, 100);
    expect(circle).not.toBeNull();
    expect(circle!.cx).toBe(5);
    expect(circle!.cy).toBe(5);
    expect(circle!.radius).toBeLessThanOrEqual(5);
  });

  it("circleShapeFromDraft crea shape v2", () => {
    expect(circleShapeFromDraft({ cx: 10, cy: 20, radius: 15 })).toEqual({
      kind: "circle",
      cx: 10,
      cy: 20,
      radius: 15,
    });
  });
});
