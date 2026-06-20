import { describe, expect, it, vi, beforeEach } from "vitest";

import { resolveInteractiveHotspotHit } from "@/lib/maps/mapInteractiveNavClick";
import { pushNavFromHotspot } from "@/lib/maps/mapNavFromHotspot";
import type { MapHotspotV1 } from "@/lib/types/maps";
import { useMapStore } from "@/stores/useMapStore";

const hotspot: MapHotspotV1 = {
  id: "hs-1",
  hostDrawingRef: { kind: "principal" },
  bounds: { x: 10, y: 10, width: 40, height: 40 },
  targetNavId: "nav-1",
};

describe("resolveInteractiveHotspotHit", () => {
  it("devuelve hotspot en interactivo sobre terreno base", () => {
    expect(
      resolveInteractiveHotspotHit("interactive", false, 20, 20, [hotspot])?.id,
    ).toBe("hs-1");
  });

  it("ignora clics en edición o dentro de nav", () => {
    expect(resolveInteractiveHotspotHit("edit", false, 20, 20, [hotspot])).toBeNull();
    expect(resolveInteractiveHotspotHit("interactive", true, 20, 20, [hotspot])).toBeNull();
  });
});

describe("useMapStore nav session", () => {
  beforeEach(() => {
    useMapStore.getState().reset();
  });

  it("navPop vacío restaura activeDrawingRef a principal", () => {
    useMapStore.setState({
      activeDrawingRef: { kind: "nav", id: "nav-1" },
      navStack: [{ navId: "nav-1", name: "Hijo", hostDrawingRef: { kind: "principal" } }],
    });
    useMapStore.getState().navPop();
    expect(useMapStore.getState().navStack).toHaveLength(0);
    expect(useMapStore.getState().activeDrawingRef).toEqual({ kind: "principal" });
  });

  it("setViewMode edit limpia navStack", () => {
    useMapStore.setState({
      viewMode: "interactive",
      navStack: [{ navId: "nav-1", name: "Hijo", hostDrawingRef: { kind: "principal" } }],
    });
    useMapStore.getState().setViewMode("edit");
    expect(useMapStore.getState().navStack).toHaveLength(0);
    expect(useMapStore.getState().viewMode).toBe("edit");
  });

  it("setViewMode interactive sin nav restaura principal", () => {
    useMapStore.setState({
      viewMode: "edit",
      activeDrawingRef: { kind: "nav", id: "nav-1" },
      navStack: [],
    });
    useMapStore.getState().setViewMode("interactive");
    expect(useMapStore.getState().activeDrawingRef).toEqual({ kind: "principal" });
  });
});

describe("pushNavFromHotspot", () => {
  beforeEach(() => {
    useMapStore.getState().reset();
    useMapStore.setState({ activeMapId: "map-1", viewMode: "interactive" });
  });

  it("empuja nav y registra depth", async () => {
    const loadNavFile = vi.fn().mockResolvedValue(undefined);
    const navDrawings = [{ id: "nav-1", name: "Ciudad", updatedAt: "2026-01-01" }];

    const ok = await pushNavFromHotspot({
      mapId: "map-1",
      hotspot,
      navDrawings,
      loadNavFile,
    });

    expect(ok).toBe(true);
    expect(loadNavFile).toHaveBeenCalledWith("nav-1");
    expect(useMapStore.getState().navStack).toEqual([
      {
        navId: "nav-1",
        name: "Ciudad",
        hostDrawingRef: { kind: "principal" },
      },
    ]);
  });
});
