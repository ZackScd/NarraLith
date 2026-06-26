import { describe, expect, it } from "vitest";

import { clampFloatingPosition } from "@/lib/ui/clampFloatingPosition";

describe("clampFloatingPosition", () => {
  it("keeps position inside viewport bounds", () => {
    const result = clampFloatingPosition(100, 50, { width: 240, height: 360 }, {
      viewportWidth: 800,
      viewportHeight: 600,
      viewportMargin: 8,
    });
    expect(result).toEqual({ x: 100, y: 50 });
  });

  it("clamps x when panel exceeds right edge", () => {
    const result = clampFloatingPosition(700, 50, { width: 240, height: 360 }, {
      viewportWidth: 800,
      viewportHeight: 600,
      viewportMargin: 8,
    });
    expect(result.x).toBe(552);
    expect(result.y).toBe(50);
  });

  it("clamps y when panel exceeds bottom edge", () => {
    const result = clampFloatingPosition(100, 500, { width: 240, height: 360 }, {
      viewportWidth: 800,
      viewportHeight: 600,
      viewportMargin: 8,
    });
    expect(result.x).toBe(100);
    expect(result.y).toBe(232);
  });

  it("respects minWidth for clamp math", () => {
    const result = clampFloatingPosition(0, 0, { width: 50, height: 100 }, {
      viewportWidth: 400,
      viewportHeight: 300,
      minWidth: 200,
      viewportMargin: 8,
    });
    expect(result.x).toBe(8);
    expect(result.y).toBe(8);
  });
});
