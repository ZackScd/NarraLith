import { describe, expect, it } from "vitest";

import { useMapStudioStore } from "@/stores/useMapStudioStore";

describe("useMapStudioStore", () => {
  it("inicia con pincel pen y se resetea al cambiar proyecto", () => {
    useMapStudioStore.getState().setTool("eraser");
    useMapStudioStore.getState().setColor("#ff0000");
    useMapStudioStore.getState().reset();
    expect(useMapStudioStore.getState()).toMatchObject({
      tool: "brush",
      brushId: "pen",
      color: "#000000",
    });
  });

  it("cambia defaults al seleccionar pincel", () => {
    useMapStudioStore.getState().reset();
    useMapStudioStore.getState().setBrushId("marker");
    expect(useMapStudioStore.getState()).toMatchObject({
      brushId: "marker",
      baseSize: 12,
      baseOpacity: 0.55,
    });
  });
});
