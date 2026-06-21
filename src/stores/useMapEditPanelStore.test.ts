import { beforeEach, describe, expect, it, vi } from "vitest";

import { useMapEditPanelStore } from "@/stores/useMapEditPanelStore";

function mockSessionStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

describe("useMapEditPanelStore", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", mockSessionStorage());
    useMapEditPanelStore.setState({
      mapId: null,
      contentExpanded: false,
      activeSection: "layers",
    });
  });

  it("alterna contentExpanded", () => {
    expect(useMapEditPanelStore.getState().contentExpanded).toBe(false);
    useMapEditPanelStore.getState().toggleContentExpanded();
    expect(useMapEditPanelStore.getState().contentExpanded).toBe(true);
    useMapEditPanelStore.getState().toggleContentExpanded();
    expect(useMapEditPanelStore.getState().contentExpanded).toBe(false);
  });

  it("openSection activa sección y expande panel", () => {
    useMapEditPanelStore.setState({ contentExpanded: false, activeSection: "layers" });
    useMapEditPanelStore.getState().openSection("patches");
    expect(useMapEditPanelStore.getState()).toMatchObject({
      contentExpanded: true,
      activeSection: "patches",
    });
  });

  it("syncForMap restaura estado persistido por mapa", () => {
    useMapEditPanelStore.getState().syncForMap("map-a");
    useMapEditPanelStore.getState().openSection("patches");
    useMapEditPanelStore.getState().toggleContentExpanded();

    useMapEditPanelStore.getState().syncForMap("map-b");
    expect(useMapEditPanelStore.getState()).toMatchObject({
      mapId: "map-b",
      activeSection: "layers",
      contentExpanded: false,
    });

    useMapEditPanelStore.getState().syncForMap("map-a");
    expect(useMapEditPanelStore.getState()).toMatchObject({
      mapId: "map-a",
      activeSection: "patches",
      contentExpanded: false,
    });
  });
});
