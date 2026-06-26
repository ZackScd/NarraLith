import { describe, expect, it } from "vitest";

import {
  buildDrawingPolylines,
  buildLayerPolylines,
  buildStrokePolylines,
  drawMapStrokes,
} from "@/lib/maps/mapStrokeRender";
import type { MapDrawingImageLayerV2, MapDrawingLayerV2, MapDrawingV2, MapStrokeV2 } from "@/lib/types/maps";

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
  it("tolera capas vectoriales sin campo strokes (IPC omite vacío)", () => {
    const bareLayer = {
      id: "bare",
      name: "bare",
      visible: true,
      opacity: 1,
      locked: false,
    } as MapDrawingLayerV2;
    expect(buildLayerPolylines(bareLayer)).toEqual([]);
  });

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

describe("drawMapStrokes layer stack", () => {
  function imageLayer(id: string): MapDrawingImageLayerV2 {
    return {
      kind: "image",
      id,
      name: id,
      visible: true,
      opacity: 1,
      locked: false,
      assetPath: `${id}.png`,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    };
  }

  it("respeta jerarquía mezclando imagen entre capas vectoriales", () => {
    const paintOrder: string[] = [];
    const images = new Map<string, HTMLImageElement>([["mid.png", {} as HTMLImageElement]]);
    const ctx = {
      save: () => {},
      restore: () => {},
      globalAlpha: 1,
      lineCap: "round",
      lineJoin: "round",
      globalCompositeOperation: "source-over",
      drawImage: () => {
        paintOrder.push("image:mid");
      },
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {
        paintOrder.push("stroke");
      },
      arc: () => {},
      fill: () => {
        paintOrder.push("stroke");
      },
    } as unknown as CanvasRenderingContext2D;

    const drawing: MapDrawingV2 = {
      version: 2,
      width: 100,
      height: 100,
      layers: [
        layer("bottom", [stroke("s1", [{ x: 0, y: 0 }])]),
        imageLayer("mid"),
        layer("top", [stroke("s2", [{ x: 1, y: 1 }])]),
      ],
    };

    drawMapStrokes(ctx, drawing, null, null, images);
    expect(paintOrder).toEqual(["stroke", "image:mid", "stroke"]);
  });
});
