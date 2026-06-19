import { describe, expect, it } from "vitest";

import { DEFAULT_MAP_SAVE_SETTINGS } from "@/lib/types/mapSettings";

describe("mapSettings", () => {
  it("autosave mapas desactivado por defecto (MAP-005b D17)", () => {
    expect(DEFAULT_MAP_SAVE_SETTINGS.mapAutosaveEnabled).toBe(false);
  });
});
