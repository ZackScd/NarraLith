import { describe, expect, it } from "vitest";

import { countMapStrokes, strokeHadPressure } from "@/lib/maps/mapDrawingStats";
import type { MapDrawingV2, MapStrokeV2 } from "@/lib/types/maps";

function sampleDrawing(strokes: MapStrokeV2[] = []): MapDrawingV2 {
  return {
    version: 2,
    width: 100,
    height: 100,
    layers: [
      {
        id: "layer-1",
        name: "Capa 1",
        visible: true,
        opacity: 1,
        locked: false,
        strokes,
      },
    ],
  };
}

describe("mapDrawingStats", () => {
  it("cuenta trazos en todas las capas", () => {
    const stroke: MapStrokeV2 = {
      id: "s1",
      tool: "brush",
      brush: "pen",
      color: "#000",
      baseSize: 2,
      baseOpacity: 1,
      points: [{ x: 0, y: 0 }],
    };
    expect(countMapStrokes(sampleDrawing([stroke]))).toBe(1);
  });

  it("detecta presión en puntos del trazo", () => {
    expect(
      strokeHadPressure({
        id: "s1",
        tool: "brush",
        brush: "pen",
        color: "#000",
        baseSize: 2,
        baseOpacity: 1,
        points: [{ x: 0, y: 0, pressure: 0.5 }],
      }),
    ).toBe(true);
    expect(
      strokeHadPressure({
        id: "s2",
        tool: "brush",
        brush: "pen",
        color: "#000",
        baseSize: 2,
        baseOpacity: 1,
        points: [{ x: 0, y: 0 }],
      }),
    ).toBe(false);
  });
});
