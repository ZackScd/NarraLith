import { describe, expect, it } from "vitest";

import { mapAssetProjectPath } from "@/lib/maps/mapAssetPath";

describe("mapAssetProjectPath", () => {
  it("construye ruta relativa al proyecto", () => {
    expect(mapAssetProjectPath("abc123", "assets/base.png")).toBe(
      ".narralith/maps/abc123/assets/base.png",
    );
  });

  it("normaliza separadores Windows", () => {
    expect(mapAssetProjectPath("abc123", "assets\\base.png")).toBe(
      ".narralith/maps/abc123/assets/base.png",
    );
  });
});
