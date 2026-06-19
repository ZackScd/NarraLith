import { describe, expect, it } from "vitest";

import {
  addLayer,
  appendPointToStroke,
  cloneDrawing,
  ensureActiveLayerId,
  getDrawBlockReason,
  layersForPanel,
  moveLayerTowardBack,
  moveLayerTowardFront,
  MapLayerError,
  pushStrokeToLayer,
  removeLayer,
  resolveActiveLayer,
  resolveDefaultActiveLayerId,
  shouldAppendPoint,
  updateLayer,
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
        id: "layer-2",
        name: "Capa 2",
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
  it("elige la primera capa visible no bloqueada sin id explícito", () => {
    expect(resolveActiveLayer(sampleDrawing())?.id).toBe("layer-1");
  });

  it("respeta activeLayerId cuando es dibujable", () => {
    expect(resolveActiveLayer(sampleDrawing(), "layer-2")?.id).toBe("layer-2");
  });

  it("devuelve null si activeLayerId apunta a capa bloqueada", () => {
    const drawing = sampleDrawing();
    drawing.layers[1]!.locked = true;
    expect(resolveActiveLayer(drawing, "layer-2")).toBeNull();
  });

  it("omite capas bloqueadas sin fallback", () => {
    const drawing = sampleDrawing();
    drawing.layers[0]!.locked = true;
    drawing.layers[1]!.locked = true;
    expect(resolveActiveLayer(drawing)).toBeNull();
  });
});

describe("getDrawBlockReason", () => {
  it("detecta capa activa bloqueada", () => {
    const drawing = sampleDrawing();
    drawing.layers[0]!.locked = true;
    expect(getDrawBlockReason(drawing, "layer-1")).toBe("locked");
  });
});

describe("layer mutators", () => {
  it("addLayer añade al final", () => {
    const { drawing, layerId } = addLayer(sampleDrawing(), "Nueva");
    expect(drawing.layers[drawing.layers.length - 1]?.id).toBe(layerId);
    expect(drawing.layers[drawing.layers.length - 1]?.name).toBe("Nueva");
  });

  it("removeLayer impide eliminar la única capa", () => {
    const single: MapDrawingV2 = {
      version: 2,
      width: 100,
      height: 100,
      layers: [sampleDrawing().layers[0]!],
    };
    expect(() => removeLayer(single, "layer-1")).toThrow(MapLayerError);
  });

  it("updateLayer clamp opacidad", () => {
    const next = updateLayer(sampleDrawing(), "layer-1", { opacity: 1.5 });
    expect(next.layers[0]!.opacity).toBe(1);
  });

  it("reordena hacia el frente", () => {
    const next = moveLayerTowardFront(sampleDrawing(), "layer-1");
    expect(next.layers[1]?.id).toBe("layer-1");
  });

  it("reordena hacia atrás", () => {
    const next = moveLayerTowardBack(sampleDrawing(), "layer-2");
    expect(next.layers[0]?.id).toBe("layer-2");
  });

  it("layersForPanel invierte el orden", () => {
    expect(layersForPanel(sampleDrawing()).map((layer) => layer.id)).toEqual([
      "layer-hidden",
      "layer-2",
      "layer-1",
    ]);
  });

  it("ensureActiveLayerId reasigna si la actual no es dibujable", () => {
    const drawing = sampleDrawing();
    drawing.layers[0]!.locked = true;
    expect(ensureActiveLayerId(drawing, "layer-1")).toBe("layer-2");
  });

  it("resolveDefaultActiveLayerId devuelve primera capa si ninguna dibujable", () => {
    const drawing = sampleDrawing();
    for (const layer of drawing.layers) {
      layer.visible = false;
    }
    expect(resolveDefaultActiveLayerId(drawing)).toBe("layer-1");
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
