import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MAP_AUTOSAVE_DEBOUNCE_MS } from "@/lib/maps/mapAutosave";
import {
  __testResetMapDrawingGuard,
  cancelMapUnsavedNavigation,
  registerMapDrawingGuard,
} from "@/lib/maps/mapDrawingGuard";
import {
  flushMapDrawingAutosave,
  flushReasonToUnsavedContext,
} from "@/lib/maps/mapAutosaveFlush";
import { useMapUnsavedStore } from "@/stores/useMapUnsavedStore";

describe("mapAutosave", () => {
  it("debounce fijo a 500 ms", () => {
    expect(MAP_AUTOSAVE_DEBOUNCE_MS).toBe(500);
  });
});

describe("flushReasonToUnsavedContext", () => {
  it("mapea razones de flush a contexto del guard", () => {
    expect(flushReasonToUnsavedContext("mapSwitch")).toBe("mapSwitch");
    expect(flushReasonToUnsavedContext("projectSwitch")).toBe("projectSwitch");
    expect(flushReasonToUnsavedContext("pagehide")).toBe("projectSwitch");
  });
});

describe("mapAutosaveFlush (D24)", () => {
  beforeEach(() => {
    __testResetMapDrawingGuard();
  });

  afterEach(() => {
    __testResetMapDrawingGuard();
  });

  it("no-op si no hay guard activo", async () => {
    await expect(flushMapDrawingAutosave("projectSwitch")).resolves.toBe(true);
  });

  it("modo manual abre diálogo en lugar de flush silencioso", async () => {
    registerMapDrawingGuard({
      shouldGuard: () => true,
      mapId: () => "map-test",
      save: vi.fn(async () => true),
      discard: vi.fn(),
      mapAutosaveEnabled: () => false,
    });
    const pending = flushMapDrawingAutosave("projectSwitch");
    expect(useMapUnsavedStore.getState().dialogOpen).toBe(true);
    cancelMapUnsavedNavigation();
    await expect(pending).resolves.toBe(false);
  });

  it("autosave ON guarda silenciosamente", async () => {
    const save = vi.fn(async () => true);
    registerMapDrawingGuard({
      shouldGuard: () => true,
      mapId: () => "map-test",
      save,
      discard: vi.fn(),
      mapAutosaveEnabled: () => true,
    });
    await expect(flushMapDrawingAutosave("mapSwitch")).resolves.toBe(true);
    expect(save).toHaveBeenCalledWith("mapSwitch");
  });
});
