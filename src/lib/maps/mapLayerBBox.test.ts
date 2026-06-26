import { describe, expect, it } from "vitest";

import { computeLayerContentBBox } from "@/lib/maps/mapLayerBBox";
import type { MapDrawingVectorLayerV2, MapStrokeV2 } from "@/lib/types/maps";

function layerWithStrokes(strokes: MapStrokeV2[]): MapDrawingVectorLayerV2 {
  return {
    id: "layer-1",
    name: "Test",
    visible: true,
    opacity: 1,
    locked: false,
    strokes,
  };
}

describe("computeLayerContentBBox", () => {
  it("devuelve null en capa vacía", () => {
    expect(computeLayerContentBBox(layerWithStrokes([]))).toBeNull();
  });

  it("encuadra puntos con padding del pincel", () => {
    const bbox = computeLayerContentBBox(
      layerWithStrokes([
        {
          id: "s1",
          tool: "brush",
          brush: "pen",
          color: "#000",
          baseSize: 10,
          baseOpacity: 1,
          points: [
            { x: 100, y: 200 },
            { x: 120, y: 220 },
          ],
        },
      ]),
    );
    expect(bbox).toMatchObject({
      minX: 95,
      minY: 195,
      maxX: 125,
      maxY: 225,
    });
  });
});

describe("reorderLayers", () => {
  it("mueve capa a nuevo índice", async () => {
    const { reorderLayers } = await import("@/lib/maps/mapDrawingSession");
    const drawing = {
      version: 2 as const,
      width: 100,
      height: 100,
      layers: [
        { id: "a", name: "A", visible: true, opacity: 1, locked: false, strokes: [] },
        { id: "b", name: "B", visible: true, opacity: 1, locked: false, strokes: [] },
        { id: "c", name: "C", visible: true, opacity: 1, locked: false, strokes: [] },
      ],
    };
    const next = reorderLayers(drawing, 0, 2);
    expect(next.layers.map((layer) => layer.id)).toEqual(["b", "c", "a"]);
  });
});
