import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  defaultMapFloatingToolsPosition,
  useMapFloatingToolsStore,
} from "@/stores/useMapFloatingToolsStore";

function mockLocalStorage() {
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

describe("useMapFloatingToolsStore", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", mockLocalStorage());
    useMapFloatingToolsStore.setState({
      mapId: null,
      isOpen: false,
      position: defaultMapFloatingToolsPosition(),
      activeSection: "layers",
    });
  });

  it("alterna isOpen", () => {
    expect(useMapFloatingToolsStore.getState().isOpen).toBe(false);
    useMapFloatingToolsStore.getState().toggleOpen();
    expect(useMapFloatingToolsStore.getState().isOpen).toBe(true);
    useMapFloatingToolsStore.getState().toggleOpen();
    expect(useMapFloatingToolsStore.getState().isOpen).toBe(false);
  });

  it("openSection activa sección y abre panel", () => {
    useMapFloatingToolsStore.setState({ isOpen: false, activeSection: "layers" });
    useMapFloatingToolsStore.getState().openSection("patches");
    expect(useMapFloatingToolsStore.getState()).toMatchObject({
      isOpen: true,
      activeSection: "patches",
    });
  });

  it("syncForMap restaura estado persistido por mapa", () => {
    useMapFloatingToolsStore.getState().syncForMap("map-a");
    useMapFloatingToolsStore.getState().openSection("patches");
    useMapFloatingToolsStore.getState().close();

    useMapFloatingToolsStore.getState().syncForMap("map-b");
    expect(useMapFloatingToolsStore.getState()).toMatchObject({
      mapId: "map-b",
      activeSection: "layers",
      isOpen: false,
    });

    useMapFloatingToolsStore.getState().syncForMap("map-a");
    expect(useMapFloatingToolsStore.getState()).toMatchObject({
      mapId: "map-a",
      activeSection: "patches",
      isOpen: false,
    });
  });

  it("syncForMap no restaura isOpen aunque esté persistido", () => {
    useMapFloatingToolsStore.getState().syncForMap("map-a");
    useMapFloatingToolsStore.getState().openSection("patches");
    expect(useMapFloatingToolsStore.getState().isOpen).toBe(true);

    useMapFloatingToolsStore.getState().syncForMap("map-a");
    expect(useMapFloatingToolsStore.getState()).toMatchObject({
      mapId: "map-a",
      activeSection: "patches",
      isOpen: false,
    });
  });
});
