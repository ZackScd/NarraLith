import { describe, expect, it } from "vitest";

import { normalizeHotspotBounds } from "@/lib/maps/mapHotspotBounds";

describe("normalizeHotspotBounds", () => {
  it("normaliza rect arrastrado", () => {
    expect(normalizeHotspotBounds(100, 50, 200, 120, 2400, 1600)).toEqual({
      x: 100,
      y: 50,
      width: 100,
      height: 70,
    });
  });

  it("rechaza rect demasiado pequeño", () => {
    expect(normalizeHotspotBounds(0, 0, 2, 2, 100, 100)).toBeNull();
  });

  it("recorta al lienzo", () => {
    const bounds = normalizeHotspotBounds(-10, 0, 50, 40, 100, 100);
    expect(bounds).toEqual({ x: 0, y: 0, width: 50, height: 40 });
  });
});
