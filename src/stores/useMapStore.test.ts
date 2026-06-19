import { describe, expect, it } from "vitest";

import { computeFitViewport } from "@/lib/maps/useMapViewport";
import { useMapStore } from "@/stores/useMapStore";

describe("useMapStore viewMode", () => {
  it("inicia en interactive", () => {
    useMapStore.getState().reset();
    expect(useMapStore.getState().viewMode).toBe("interactive");
  });

  it("reset() restaura interactive y mapa nulo", () => {
    useMapStore.getState().setActiveMap("map-1");
    useMapStore.getState().setViewMode("edit");
    useMapStore.getState().reset();
    expect(useMapStore.getState()).toMatchObject({
      activeMapId: null,
      viewMode: "interactive",
    });
  });

  it("cambiar mapa activo resetea viewMode", () => {
    useMapStore.getState().reset();
    useMapStore.getState().setActiveMap("map-a");
    useMapStore.getState().setViewMode("edit");
    useMapStore.getState().setActiveMap("map-b");
    expect(useMapStore.getState().viewMode).toBe("interactive");
    expect(useMapStore.getState().activeMapId).toBe("map-b");
  });

  it("setViewMode conserva modo en el mismo mapa", () => {
    useMapStore.getState().reset();
    useMapStore.getState().setActiveMap("map-a");
    useMapStore.getState().setViewMode("edit");
    useMapStore.getState().setActiveMap("map-a");
    expect(useMapStore.getState().viewMode).toBe("edit");
  });
});

describe("computeFitViewport", () => {
  it("encaja documento en contenedor con padding", () => {
    const fit = computeFitViewport(800, 600, 2400, 1600);
    expect(fit.zoom).toBeLessThanOrEqual(1);
    expect(fit.panX).toBeGreaterThan(0);
    expect(fit.panY).toBeGreaterThan(0);
  });
});
