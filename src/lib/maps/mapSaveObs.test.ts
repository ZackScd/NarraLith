import { describe, expect, it } from "vitest";

import { unsavedContextToTrigger } from "@/lib/maps/mapDrawingGuard";
import { resolveMapSaveDrawingObsReason } from "@/lib/maps/mapSaveObs";

describe("resolveMapSaveDrawingObsReason", () => {
  it("clasifica manual y autosave", () => {
    expect(resolveMapSaveDrawingObsReason("manual")).toBe("manual");
    expect(resolveMapSaveDrawingObsReason("debounce")).toBe("autosave");
    expect(resolveMapSaveDrawingObsReason("pagehide")).toBe("autosave");
  });

  it("acepta override dialog", () => {
    expect(resolveMapSaveDrawingObsReason("exitEdit", "dialog")).toBe("dialog");
  });
});

describe("unsavedContextToTrigger", () => {
  it("mapea contextos del guard a triggers OBS", () => {
    expect(unsavedContextToTrigger("mapSwitch")).toBe("selectMap");
    expect(unsavedContextToTrigger("leave")).toBe("viewChange");
    expect(unsavedContextToTrigger("projectSwitch")).toBe("project");
  });
});
