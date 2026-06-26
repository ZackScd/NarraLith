import { describe, expect, it } from "vitest";

import { drawToolForShapeKind, shapeFromPendingNavChildZone } from "@/lib/maps/mapNavChildZone";

describe("mapNavChildZone", () => {
  it("drawToolForShapeKind mapea forma a herramienta", () => {
    expect(drawToolForShapeKind("polygon")).toBe("lasso");
    expect(drawToolForShapeKind("rect")).toBe("rect");
    expect(drawToolForShapeKind("circle")).toBe("circle");
  });

  it("shapeFromPendingNavChildZone convierte polígono, rect y círculo", () => {
    expect(
      shapeFromPendingNavChildZone({
        kind: "polygon",
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 5, y: 10 },
        ],
      }),
    ).toEqual({
      kind: "polygon",
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 10 },
      ],
    });

    expect(
      shapeFromPendingNavChildZone({
        kind: "rect",
        bounds: { x: 1, y: 2, width: 30, height: 40 },
      }),
    ).toEqual({ kind: "rect", x: 1, y: 2, width: 30, height: 40 });

    expect(
      shapeFromPendingNavChildZone({
        kind: "circle",
        circle: { cx: 5, cy: 10, radius: 20 },
      }),
    ).toEqual({ kind: "circle", cx: 5, cy: 10, radius: 20 });
  });
});
