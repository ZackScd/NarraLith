import { describe, expect, it } from "vitest";

import {
  buildDrawingPolylines,
  buildStrokePolylines,
} from "@/lib/maps/mapStrokeRender";
import type { MapDrawingLayerV2, MapDrawingV2, MapStrokeV2 } from "@/lib/types/maps";

function stroke(id: string, points: Array<{ x: number; y: number }>): MapStrokeV2 {
  return {
    id,
    tool: "brush",
    brush: "default",
    color: "#000000",
    baseSize: 4,
    baseOpacity: 1,
    points,
  };
}

function layer(id: string, strokes: MapStrokeV2[], visible = true): MapDrawingLayerV2 {
  return {
    id,
    name: id,
    visible,
    opacity: 1,
    locked: false,
    strokes,
  };
}

describe("buildStrokePolylines", () => {
  it("devuelve null sin puntos", () => {
    expect(buildStrokePolylines(stroke("s1", []))).toBeNull();
  });

  it("conserva un punto suelto", () => {
    expect(buildStrokePolylines(stroke("s1", [{ x: 10, y: 20 }]))).toEqual({
      strokeId: "s1",
      points: [{ x: 10, y: 20 }],
    });
  });

  it("ordena polilínea con varios puntos", () => {
    expect(
      buildStrokePolylines(
        stroke("s2", [
          { x: 0, y: 0 },
          { x: 5, y: 5 },
          { x: 10, y: 0 },
        ]),
      ),
    ).toEqual({
      strokeId: "s2",
      points: [
        { x: 0, y: 0 },
        { x: 5, y: 5 },
        { x: 10, y: 0 },
      ],
    });
  });
});

describe("buildDrawingPolylines", () => {
  it("omite capas ocultas", () => {
    const drawing: MapDrawingV2 = {
      version: 2,
      width: 100,
      height: 100,
      layers: [
        layer("visible", [stroke("a", [{ x: 1, y: 1 }])], true),
        layer("hidden", [stroke("b", [{ x: 2, y: 2 }])], false),
      ],
    };
    expect(buildDrawingPolylines(drawing)).toEqual([
      { strokeId: "a", points: [{ x: 1, y: 1 }] },
    ]);
  });
});
