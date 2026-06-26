import { describe, expect, it, vi, beforeEach } from "vitest";

import { resolveInteractiveHotspotHit } from "@/lib/maps/mapInteractiveNavClick";
import { rectShapeFromBounds } from "@/lib/maps/mapHotspotShape";
import {
  collectDescendantNavWindowIds,
  filterHotspotsForHost,
  openNavWindowFromHotspot,
} from "@/lib/maps/mapNavWindowFromHotspot";
import type { MapHotspotV2 } from "@/lib/types/maps";
import { useMapNavWindowsStore } from "@/stores/useMapNavWindowsStore";
import { useMapStore } from "@/stores/useMapStore";

const principalHotspot: MapHotspotV2 = {
  id: "hs-1",
  hostDrawingRef: { kind: "principal" },
  shape: rectShapeFromBounds({ x: 10, y: 10, width: 40, height: 40 }),
  targetNavId: "nav-1",
};

const childHotspot: MapHotspotV2 = {
  id: "hs-2",
  hostDrawingRef: { kind: "nav", id: "nav-parent" },
  shape: rectShapeFromBounds({ x: 5, y: 5, width: 20, height: 20 }),
  targetNavId: "nav-child",
};

describe("resolveInteractiveHotspotHit", () => {
  it("devuelve hotspot en interactivo sobre terreno base", () => {
    expect(
      resolveInteractiveHotspotHit("interactive", 20, 20, [principalHotspot])?.id,
    ).toBe("hs-1");
  });

  it("hit-test en host nav para ventanas hijo", () => {
    expect(
      resolveInteractiveHotspotHit("interactive", 10, 10, [childHotspot], {
        kind: "nav",
        id: "nav-parent",
      })?.id,
    ).toBe("hs-2");
  });

  it("ignora clics en edición", () => {
    expect(resolveInteractiveHotspotHit("edit", 20, 20, [principalHotspot])).toBeNull();
  });
});

describe("filterHotspotsForHost", () => {
  it("filtra por hostDrawingRef", () => {
    const filtered = filterHotspotsForHost([principalHotspot, childHotspot], {
      kind: "nav",
      id: "nav-parent",
    });
    expect(filtered).toEqual([childHotspot]);
  });
});

describe("collectDescendantNavWindowIds", () => {
  it("incluye nietos en cadena parentNavId", () => {
    const ids = collectDescendantNavWindowIds("nav-a", [
      { navId: "nav-a" },
      { navId: "nav-b", parentNavId: "nav-a" },
      { navId: "nav-c", parentNavId: "nav-b" },
      { navId: "nav-other" },
    ]);
    expect([...ids].sort()).toEqual(["nav-a", "nav-b", "nav-c"]);
  });
});

describe("openNavWindowFromHotspot", () => {
  beforeEach(() => {
    useMapStore.getState().reset();
    useMapNavWindowsStore.setState({ mapId: null, openWindows: [] });
    useMapStore.setState({ activeMapId: "map-1", viewMode: "interactive" });
  });

  it("abre ventana interactiva y carga nav", async () => {
    const loadNavFile = vi.fn().mockResolvedValue(undefined);
    const navDrawings = [{ id: "nav-1", name: "Ciudad", updatedAt: "2026-01-01" }];

    const ok = await openNavWindowFromHotspot({
      mapId: "map-1",
      hotspot: principalHotspot,
      navDrawings,
      loadNavFile,
    });

    expect(ok).toBe(true);
    expect(loadNavFile).toHaveBeenCalledWith("nav-1");
    expect(useMapNavWindowsStore.getState().openWindows).toEqual([
      expect.objectContaining({ navId: "nav-1", mode: "interactive" }),
    ]);
  });

  it("abre ventana nieta con parentNavId", async () => {
    const loadNavFile = vi.fn().mockResolvedValue(undefined);
    useMapNavWindowsStore.getState().openWindow("nav-parent", "interactive", {
      mapId: "map-1",
    });

    await openNavWindowFromHotspot({
      mapId: "map-1",
      hotspot: childHotspot,
      navDrawings: [{ id: "nav-child", name: "Barrio", updatedAt: "2026-01-01" }],
      loadNavFile,
      parentNavId: "nav-parent",
    });

    const child = useMapNavWindowsStore
      .getState()
      .openWindows.find((item) => item.navId === "nav-child");
    expect(child?.parentNavId).toBe("nav-parent");
  });
});
