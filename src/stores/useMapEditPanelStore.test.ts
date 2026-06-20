import { describe, expect, it, beforeEach } from "vitest";

import { useMapEditPanelStore } from "@/stores/useMapEditPanelStore";

describe("useMapEditPanelStore", () => {
  beforeEach(() => {
    useMapEditPanelStore.setState({
      contentExpanded: true,
      activeSection: "layers",
    });
  });

  it("alterna contentExpanded", () => {
    expect(useMapEditPanelStore.getState().contentExpanded).toBe(true);
    useMapEditPanelStore.getState().toggleContentExpanded();
    expect(useMapEditPanelStore.getState().contentExpanded).toBe(false);
    useMapEditPanelStore.getState().toggleContentExpanded();
    expect(useMapEditPanelStore.getState().contentExpanded).toBe(true);
  });

  it("openSection activa sección y expande panel", () => {
    useMapEditPanelStore.setState({ contentExpanded: false, activeSection: "layers" });
    useMapEditPanelStore.getState().openSection("maps");
    expect(useMapEditPanelStore.getState()).toMatchObject({
      contentExpanded: true,
      activeSection: "maps",
    });
  });
});
