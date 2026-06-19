import { describe, expect, it } from "vitest";

import {
  appendPointToStroke,
  cloneDrawing,
  pushStrokeToLayer,
  resolveActiveLayer,
  shouldAppendPoint,
} from "@/lib/maps/mapDrawingSession";
import type { MapDrawingV2, MapStrokeV2 } from "@/lib/types/maps";

function sampleDrawing(): MapDrawingV2 {
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
        strokes: [],
      },
      {
        id: "layer-hidden",
        name: "Oculta",
        visible: false,
        opacity: 1,
        locked: false,
        strokes: [],
      },
    ],
  };
}

describe("resolveActiveLayer", () => {
  it("elige la primera capa visible no bloqueada", () => {
    expect(resolveActiveLayer(sampleDrawing())?.id).toBe("layer-1");
  });

  it("omite capas bloqueadas", () => {
    const drawing = sampleDrawing();
    drawing.layers[0]!.locked = true;
    expect(resolveActiveLayer(drawing)).toBeNull();
  });
});

describe("shouldAppendPoint", () => {
  it("requiere distancia mínima entre puntos", () => {
    expect(shouldAppendPoint({ x: 0, y: 0 }, { x: 0.5, y: 0 })).toBe(false);
    expect(shouldAppendPoint({ x: 0, y: 0 }, { x: 2, y: 0 })).toBe(true);
  });
});

describe("appendPointToStroke", () => {
  it("no duplica puntos demasiado cercanos", () => {
    const stroke: MapStrokeV2 = {
      id: "s1",
      tool: "brush",
      brush: "pen",
      color: "#000",
      baseSize: 2,
      baseOpacity: 1,
      points: [{ x: 0, y: 0 }],
    };
    const next = appendPointToStroke(stroke, { x: 0.2, y: 0 });
    expect(next.points).toHaveLength(1);
  });
});

describe("cloneDrawing", () => {
  it("clona sin compartir referencias", () => {
    const drawing = sampleDrawing();
    const copy = cloneDrawing(drawing);
    copy.layers[0]!.strokes.push({
      id: "s1",
      tool: "brush",
      brush: "pen",
      color: "#000",
      baseSize: 2,
      baseOpacity: 1,
      points: [{ x: 1, y: 1 }],
    });
    expect(drawing.layers[0]!.strokes).toHaveLength(0);
  });
});

describe("pushStrokeToLayer", () => {
  it("añade trazo a la capa indicada", () => {
    const stroke: MapStrokeV2 = {
      id: "s1",
      tool: "brush",
      brush: "pen",
      color: "#000",
      baseSize: 2,
      baseOpacity: 1,
      points: [{ x: 1, y: 1 }],
    };
    const next = pushStrokeToLayer(sampleDrawing(), "layer-1", stroke);
    expect(next.layers[0]!.strokes).toHaveLength(1);
  });
});
