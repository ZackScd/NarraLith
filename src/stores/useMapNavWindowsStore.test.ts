import { beforeEach, describe, expect, it } from "vitest";

import { collectDescendantNavWindowIds } from "@/lib/maps/mapNavWindowFromHotspot";
import { useMapNavWindowsStore } from "@/stores/useMapNavWindowsStore";

describe("useMapNavWindowsStore", () => {
  beforeEach(() => {
    useMapNavWindowsStore.setState({ mapId: null, openWindows: [] });
  });

  it("closeWindow elimina descendientes en cascada", () => {
    useMapNavWindowsStore.setState({
      mapId: "map-1",
      openWindows: [
        { navId: "nav-a", mode: "interactive", position: { x: 0, y: 0 } },
        {
          navId: "nav-b",
          mode: "interactive",
          position: { x: 28, y: 28 },
          parentNavId: "nav-a",
        },
        {
          navId: "nav-c",
          mode: "interactive",
          position: { x: 56, y: 56 },
          parentNavId: "nav-b",
        },
      ],
    });

    useMapNavWindowsStore.getState().closeWindow("nav-a");
    expect(useMapNavWindowsStore.getState().openWindows).toHaveLength(0);
  });

  it("posiciona ventana nieta escalonada respecto al padre", () => {
    useMapNavWindowsStore.getState().openWindow("nav-parent", "interactive", {
      mapId: "map-1",
    });
    const parentPos = useMapNavWindowsStore.getState().openWindows[0].position;
    useMapNavWindowsStore.getState().openWindow("nav-child", "interactive", {
      mapId: "map-1",
      parentNavId: "nav-parent",
    });
    const child = useMapNavWindowsStore
      .getState()
      .openWindows.find((item) => item.navId === "nav-child");
    expect(child?.position.x).toBeGreaterThan(parentPos.x);
    expect(child?.position.y).toBeGreaterThan(parentPos.y);
  });
});

describe("collectDescendantNavWindowIds", () => {
  it("solo incluye cadena desde root", () => {
    const ids = collectDescendantNavWindowIds("nav-root", [
      { navId: "nav-root" },
      { navId: "nav-child", parentNavId: "nav-root" },
      { navId: "nav-sibling", parentNavId: "nav-other" },
    ]);
    expect([...ids]).toEqual(["nav-root", "nav-child"]);
  });
});
