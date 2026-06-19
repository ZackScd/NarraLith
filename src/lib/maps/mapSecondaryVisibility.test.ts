import { describe, expect, it } from "vitest";

import {
  filterVisibleSecondaries,
  isSecondaryVisibleAtT,
  sortSecondariesForCompose,
} from "@/lib/maps/mapSecondaryVisibility";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { MapSecondarySummaryV1 } from "@/lib/types/maps";

function sampleConfig(): CalendarConfig {
  return {
    version: 1,
    epoch: { year: 1, month: 1, day: 1 },
    daysPerWeek: 7,
    hoursPerDay: 24,
    months: [{ name: "Mes1", days: 30 }],
    leapRules: { enabled: false, everyYears: 4, extraDays: 1, monthIndex: 0 },
    eras: [],
    annualEvents: [],
  };
}

function summary(
  id: string,
  tiempoInicio: string,
  tiempoFin?: string | null,
): MapSecondarySummaryV1 {
  return {
    id,
    name: id,
    tiempoInicio,
    tiempoFin: tiempoFin ?? null,
    updatedAt: "0",
  };
}

describe("isSecondaryVisibleAtT", () => {
  const config = sampleConfig();
  const desde = "1.1.2000";

  it("parches forward visibles en T=2020 (spec §4.3)", () => {
    const sec2015 = { tiempoInicio: "1.1.2015", tiempoFin: null };
    const sec2017 = { tiempoInicio: "1.1.2017", tiempoFin: null };
    expect(isSecondaryVisibleAtT(sec2015, desde, "1.1.2020", config)).toBe(true);
    expect(isSecondaryVisibleAtT(sec2017, desde, "1.1.2020", config)).toBe(true);
  });

  it("parche con tiempoFin deja de componerse después (modo B)", () => {
    const sec = { tiempoInicio: "1.1.2015", tiempoFin: "1.1.2028" };
    expect(isSecondaryVisibleAtT(sec, desde, "1.1.2020", config)).toBe(true);
    expect(isSecondaryVisibleAtT(sec, desde, "1.1.2030", config)).toBe(false);
  });

  it("parche backward visible al bajar T antes de Desde", () => {
    const sec = { tiempoInicio: "1.1.1990", tiempoFin: null };
    expect(isSecondaryVisibleAtT(sec, desde, "1.1.1985", config)).toBe(true);
    expect(isSecondaryVisibleAtT(sec, desde, "1.1.2020", config)).toBe(false);
  });

  it("sin Desde usa comparación absoluta forward", () => {
    const sec = { tiempoInicio: "1.1.2015", tiempoFin: null };
    expect(isSecondaryVisibleAtT(sec, null, "1.1.2020", config)).toBe(true);
    expect(isSecondaryVisibleAtT(sec, null, "1.1.2010", config)).toBe(false);
  });
});

describe("sortSecondariesForCompose", () => {
  it("ordena por tiempoInicio ascendente", () => {
    const config = sampleConfig();
    const items = [
      summary("b", "1.1.2017"),
      summary("a", "1.1.2015"),
    ];
    expect(sortSecondariesForCompose(items, config).map((s) => s.id)).toEqual(["a", "b"]);
  });
});

describe("filterVisibleSecondaries", () => {
  it("devuelve solo visibles en T y ordenados", () => {
    const config = sampleConfig();
    const desde = "1.1.2000";
    const items = [
      summary("closed", "1.1.2010", "1.1.2015"),
      summary("active-old", "1.1.2015"),
      summary("active-new", "1.1.2017"),
    ];
    const visible = filterVisibleSecondaries(items, desde, "1.1.2020", config);
    expect(visible.map((s) => s.id)).toEqual(["active-old", "active-new"]);
  });
});
