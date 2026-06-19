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

describe("useMapStore navStack", () => {
  it("navPush y navPop", () => {
    useMapStore.getState().reset();
    useMapStore.getState().navPush({
      navId: "nav-abc",
      name: "Ciudad",
      hostDrawingRef: { kind: "principal" },
    });
    expect(useMapStore.getState().navStack).toHaveLength(1);
    useMapStore.getState().navPop();
    expect(useMapStore.getState().navStack).toHaveLength(0);
  });

  it("setActiveMap resetea navStack al cambiar mapa", () => {
    useMapStore.getState().reset();
    useMapStore.getState().setActiveMap("map-a");
    useMapStore.getState().navPush({
      navId: "nav-abc",
      name: "Ciudad",
      hostDrawingRef: { kind: "principal" },
    });
    useMapStore.getState().setActiveMap("map-b");
    expect(useMapStore.getState().navStack).toEqual([]);
  });

  it("navPop toDepth recorta stack", () => {
    useMapStore.getState().reset();
    useMapStore.getState().navPush({
      navId: "nav-a",
      name: "A",
      hostDrawingRef: { kind: "principal" },
    });
    useMapStore.getState().navPush({
      navId: "nav-b",
      name: "B",
      hostDrawingRef: { kind: "principal" },
    });
    useMapStore.getState().navPop(1);
    expect(useMapStore.getState().navStack).toHaveLength(1);
    expect(useMapStore.getState().navStack[0].navId).toBe("nav-a");
  });
});

describe("useMapStore previewTimeTRaw", () => {
  it("memoriza T por mapId al cambiar de mapa", () => {
    useMapStore.getState().reset();
    useMapStore.getState().setActiveMap("map-a");
    useMapStore.getState().setPreviewTimeTRaw("15.7.2028", "map-a");
    useMapStore.getState().setActiveMap("map-b");
    useMapStore.getState().setPreviewTimeTRaw("1.1.2015", "map-b");
    useMapStore.getState().setActiveMap("map-a");
    expect(useMapStore.getState().previewTimeTRaw).toBe("15.7.2028");
  });

  it("setViewMode no resetea previewTimeTRaw", () => {
    useMapStore.getState().reset();
    useMapStore.getState().setActiveMap("map-a");
    useMapStore.getState().setPreviewTimeTRaw("15.7.2028", "map-a");
    useMapStore.getState().setViewMode("edit");
    expect(useMapStore.getState().previewTimeTRaw).toBe("15.7.2028");
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
