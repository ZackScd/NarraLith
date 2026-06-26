import { describe, expect, it } from "vitest";

import {
  fingerprintMapDrawing,
  isDrawingDirtyAgainstBaseline,
} from "@/lib/maps/mapDrawingBaseline";
import type { MapDrawingV2, MapDrawingVectorLayerV2 } from "@/lib/types/maps";

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
        strokes: [
          {
            id: "s1",
            tool: "brush",
            brush: "pen",
            color: "#000",
            baseSize: 2,
            baseOpacity: 1,
            points: [{ x: 1, y: 2 }],
          },
        ],
      },
    ],
  };
}

describe("fingerprintMapDrawing", () => {
  it("es estable para el mismo dibujo", () => {
    const drawing = sampleDrawing();
    expect(fingerprintMapDrawing(drawing)).toBe(fingerprintMapDrawing(structuredClone(drawing)));
  });

  it("cambia al añadir un trazo", () => {
    const base = fingerprintMapDrawing(sampleDrawing());
    const next = sampleDrawing();
    (next.layers[0] as MapDrawingVectorLayerV2).strokes.push({
      id: "s2",
      tool: "brush",
      brush: "pen",
      color: "#000",
      baseSize: 2,
      baseOpacity: 1,
      points: [{ x: 3, y: 4 }],
    });
    expect(fingerprintMapDrawing(next)).not.toBe(base);
  });

  it("cambia al modificar metadata de capa", () => {
    const base = fingerprintMapDrawing(sampleDrawing());
    const next = sampleDrawing();
    next.layers[0]!.visible = false;
    expect(fingerprintMapDrawing(next)).not.toBe(base);
  });
});

describe("isDrawingDirtyAgainstBaseline", () => {
  it("detecta sucio y limpio tras volver al baseline", () => {
    const drawing = sampleDrawing();
    const baseline = fingerprintMapDrawing(drawing);
    expect(isDrawingDirtyAgainstBaseline(drawing, baseline)).toBe(false);

    const edited = structuredClone(drawing);
    (edited.layers[0] as MapDrawingVectorLayerV2).strokes.push({
      id: "s2",
      tool: "brush",
      brush: "pen",
      color: "#000",
      baseSize: 2,
      baseOpacity: 1,
      points: [{ x: 5, y: 6 }],
    });
    expect(isDrawingDirtyAgainstBaseline(edited, baseline)).toBe(true);

    (edited.layers[0] as MapDrawingVectorLayerV2).strokes.pop();
    expect(isDrawingDirtyAgainstBaseline(edited, baseline)).toBe(false);
  });
});
