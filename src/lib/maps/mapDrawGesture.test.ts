import { describe, expect, it } from "vitest";

import { shouldDrawPointer, shouldPanPointer } from "@/lib/maps/mapDrawGesture";

describe("shouldPanPointer", () => {
  it("interactive: botón izquierdo pan", () => {
    expect(shouldPanPointer("interactive", "brush", 0, false)).toBe(true);
  });

  it("edit + pincel: botón izquierdo no pan", () => {
    expect(shouldPanPointer("edit", "brush", 0, false)).toBe(false);
  });

  it("edit + pincel: space+izquierdo pan", () => {
    expect(shouldPanPointer("edit", "brush", 0, true)).toBe(true);
  });

  it("edit + mano: botón izquierdo pan", () => {
    expect(shouldPanPointer("edit", "pan", 0, false)).toBe(true);
  });

  it("botón central siempre pan", () => {
    expect(shouldPanPointer("edit", "brush", 1, false)).toBe(true);
  });
});

describe("shouldDrawPointer", () => {
  it("edit + pincel dibuja con botón izquierdo", () => {
    expect(shouldDrawPointer("edit", "brush", 0, false, true)).toBe(true);
  });

  it("interactive no dibuja", () => {
    expect(shouldDrawPointer("interactive", "brush", 0, false, true)).toBe(false);
  });

  it("space pulsado no dibuja", () => {
    expect(shouldDrawPointer("edit", "brush", 0, true, true)).toBe(false);
  });

  it("capa bloqueada no dibuja", () => {
    expect(shouldDrawPointer("edit", "brush", 0, false, false)).toBe(false);
  });
});
