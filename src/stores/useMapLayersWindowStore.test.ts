import { describe, expect, it } from "vitest";

import { sortSecondariesForPanel } from "@/lib/maps/mapSecondaryPanelSort";
import type { MapSecondarySummaryV1 } from "@/lib/types/maps";
import {
  cyclePatchSortMode,
  useMapLayersWindowStore,
} from "@/stores/useMapLayersWindowStore";

const SECONDARIES: MapSecondarySummaryV1[] = [
  {
    id: "sec-a",
    name: "A",
    tiempoInicio: "1.1.2000",
    tiempoFin: null,
    updatedAt: "2020-01-01",
  },
  {
    id: "sec-b",
    name: "B",
    tiempoInicio: "1.1.1990",
    tiempoFin: null,
    updatedAt: "2020-01-02",
  },
];

describe("useMapLayersWindowStore", () => {
  it("cicla orden de parches manual → baseFirst → chrono", () => {
    expect(cyclePatchSortMode("manual")).toBe("baseFirst");
    expect(cyclePatchSortMode("baseFirst")).toBe("chrono");
    expect(cyclePatchSortMode("chrono")).toBe("manual");
  });

  it("toggleCombinedCapasParches activa tab layers", () => {
    useMapLayersWindowStore.setState({
      activeTab: "patches",
      combinedCapasParches: false,
    });
    useMapLayersWindowStore.getState().toggleCombinedCapasParches();
    expect(useMapLayersWindowStore.getState().combinedCapasParches).toBe(true);
    expect(useMapLayersWindowStore.getState().activeTab).toBe("layers");
  });
});

describe("sortSecondariesForPanel", () => {
  it("baseFirst invierte el orden manual", () => {
    const sorted = sortSecondariesForPanel(SECONDARIES, "baseFirst", null);
    expect(sorted.map((item) => item.id)).toEqual(["sec-b", "sec-a"]);
  });

  it("manual conserva el orden de entrada", () => {
    const sorted = sortSecondariesForPanel(SECONDARIES, "manual", null);
    expect(sorted.map((item) => item.id)).toEqual(["sec-a", "sec-b"]);
  });
});
