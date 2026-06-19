import { describe, expect, it, vi } from "vitest";

import { MAP_AUTOSAVE_DEBOUNCE_MS } from "@/lib/maps/mapAutosave";
import {
  flushMapDrawingAutosave,
  registerMapAutosaveFlush,
} from "@/lib/maps/mapAutosaveFlush";

describe("mapAutosave", () => {
  it("debounce fijo a 500 ms", () => {
    expect(MAP_AUTOSAVE_DEBOUNCE_MS).toBe(500);
  });
});

describe("mapAutosaveFlush", () => {
  it("no-op sin handler registrado", async () => {
    await expect(flushMapDrawingAutosave("projectSwitch")).resolves.toBe(true);
  });

  it("delega al handler activo y limpia al desregistrar", async () => {
    const flush = vi.fn(async () => true);
    const unregister = registerMapAutosaveFlush(flush);
    await flushMapDrawingAutosave("mapSwitch");
    expect(flush).toHaveBeenCalledWith("mapSwitch");
    unregister();
    await flushMapDrawingAutosave("mapSwitch");
    expect(flush).toHaveBeenCalledTimes(1);
  });
});
