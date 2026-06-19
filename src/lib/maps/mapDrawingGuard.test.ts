import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __testResetMapDrawingGuard,
  cancelMapUnsavedNavigation,
  confirmMapUnsavedDiscard,
  confirmMapUnsavedSave,
  guardMapDrawingNavigation,
  registerMapDrawingGuard,
} from "@/lib/maps/mapDrawingGuard";
import { useMapUnsavedStore } from "@/stores/useMapUnsavedStore";

describe("mapDrawingGuard", () => {
  beforeEach(() => {
    __testResetMapDrawingGuard();
  });

  afterEach(() => {
    __testResetMapDrawingGuard();
  });

  it("ejecuta la acción sin diálogo si no hay guard activo", async () => {
    const action = vi.fn();
    await expect(guardMapDrawingNavigation(action, "leave")).resolves.toBe(true);
    expect(action).toHaveBeenCalledOnce();
    expect(useMapUnsavedStore.getState().dialogOpen).toBe(false);
  });

  it("ejecuta la acción sin diálogo si shouldGuard es false", async () => {
    registerMapDrawingGuard({
      shouldGuard: () => false,
      mapId: () => "map-test",
      save: vi.fn(async () => true),
      discard: vi.fn(),
      mapAutosaveEnabled: () => false,
    });
    const action = vi.fn();
    await expect(guardMapDrawingNavigation(action, "mapSwitch")).resolves.toBe(true);
    expect(action).toHaveBeenCalledOnce();
  });

  it("abre diálogo en modo manual cuando hay sucio", async () => {
    registerMapDrawingGuard({
      shouldGuard: () => true,
      mapId: () => "map-test",
      save: vi.fn(async () => true),
      discard: vi.fn(),
      mapAutosaveEnabled: () => false,
    });
    const action = vi.fn();
    const pending = guardMapDrawingNavigation(action, "exitEdit");
    expect(useMapUnsavedStore.getState().dialogOpen).toBe(true);
    expect(action).not.toHaveBeenCalled();
    cancelMapUnsavedNavigation();
    await expect(pending).resolves.toBe(false);
  });

  it("guardar en diálogo ejecuta acción pendiente", async () => {
    const save = vi.fn(async () => true);
    registerMapDrawingGuard({
      shouldGuard: () => true,
      mapId: () => "map-test",
      save,
      discard: vi.fn(),
      mapAutosaveEnabled: () => false,
    });
    const action = vi.fn();
    const pending = guardMapDrawingNavigation(action, "leave");
    await confirmMapUnsavedSave();
    await expect(pending).resolves.toBe(true);
    expect(save).toHaveBeenCalledWith("leave", { obsReason: "dialog" });
    expect(action).toHaveBeenCalledOnce();
  });

  it("descartar en diálogo descarta y continúa", async () => {
    const discard = vi.fn();
    registerMapDrawingGuard({
      shouldGuard: () => true,
      mapId: () => "map-test",
      save: vi.fn(async () => true),
      discard,
      mapAutosaveEnabled: () => false,
    });
    const action = vi.fn();
    const pending = guardMapDrawingNavigation(action, "mapSwitch");
    confirmMapUnsavedDiscard();
    await expect(pending).resolves.toBe(true);
    expect(discard).toHaveBeenCalledOnce();
    expect(action).toHaveBeenCalledOnce();
  });

  it("autosave ON guarda silenciosamente sin diálogo", async () => {
    const save = vi.fn(async () => true);
    registerMapDrawingGuard({
      shouldGuard: () => true,
      mapId: () => "map-test",
      save,
      discard: vi.fn(),
      mapAutosaveEnabled: () => true,
    });
    const action = vi.fn();
    await expect(guardMapDrawingNavigation(action, "projectSwitch")).resolves.toBe(true);
    expect(save).toHaveBeenCalledOnce();
    expect(action).toHaveBeenCalledOnce();
    expect(useMapUnsavedStore.getState().dialogOpen).toBe(false);
  });
});
