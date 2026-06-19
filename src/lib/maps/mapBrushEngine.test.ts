import { describe, expect, it } from "vitest";

import { segmentStrokeStyle, strokePointStyle } from "@/lib/maps/mapBrushEngine";

describe("strokePointStyle", () => {
  it("pen modula grosor con presión", () => {
    const light = strokePointStyle("pen", 2, 1, 0.2);
    const heavy = strokePointStyle("pen", 2, 1, 1);
    expect(light.size).toBeLessThan(heavy.size);
    expect(light.opacity).toBe(1);
  });

  it("pencil modula grosor y opacidad", () => {
    const light = strokePointStyle("pencil", 4, 0.85, 0.1);
    const heavy = strokePointStyle("pencil", 4, 0.85, 1);
    expect(light.size).toBeLessThan(heavy.size);
    expect(light.opacity).toBeLessThan(heavy.opacity);
  });

  it("marker usa curva suave", () => {
    const light = strokePointStyle("marker", 12, 0.55, 0);
    const heavy = strokePointStyle("marker", 12, 0.55, 1);
    expect(light.size).toBeGreaterThan(6);
    expect(heavy.size).toBe(12);
  });
});

describe("segmentStrokeStyle", () => {
  it("promedia estilos entre dos puntos", () => {
    const style = segmentStrokeStyle(
      "pen",
      4,
      1,
      { x: 0, y: 0, pressure: 0.2 },
      { x: 1, y: 1, pressure: 1 },
    );
    expect(style.size).toBeGreaterThan(1);
    expect(style.size).toBeLessThan(4);
  });
});
