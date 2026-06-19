import { describe, expect, it } from "vitest";

import { documentDistance, screenToDocument } from "@/lib/maps/mapDrawCoords";

describe("screenToDocument", () => {
  it("convierte píxeles pantalla a espacio documento", () => {
    const rect = { left: 10, top: 20, width: 800, height: 600 } as DOMRect;
    const viewport = { zoom: 2, panX: 100, panY: 50 };
    expect(screenToDocument(110, 70, rect, viewport)).toEqual({ x: 0, y: 0 });
    expect(screenToDocument(210, 170, rect, viewport)).toEqual({ x: 50, y: 50 });
  });
});

describe("documentDistance", () => {
  it("calcula distancia euclídea", () => {
    expect(documentDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});
