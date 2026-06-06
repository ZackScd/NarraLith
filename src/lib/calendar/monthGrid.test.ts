import { describe, expect, it } from "vitest";

import { buildMonthGrid, shiftCalendarMonth } from "@/lib/calendar/monthGrid";
import type { CalendarConfig } from "@/lib/types/calendar";

const sampleConfig: CalendarConfig = {
  version: 1,
  epoch: { year: 0, month: 1, day: 1 },
  daysPerWeek: 7,
  weekDays: [
    { name: "Domingo" },
    { name: "Lunes" },
    { name: "Martes" },
    { name: "Miércoles" },
    { name: "Jueves" },
    { name: "Viernes" },
    { name: "Sábado" },
  ],
  hoursPerDay: 24,
  months: [
    { name: "Enero", days: 30 },
    { name: "Febrero", days: 30 },
    { name: "Marzo", days: 31 },
  ],
  leapRules: { enabled: false, everyYears: 4, extraDays: 1, monthIndex: 2 },
  eras: [],
  annualEvents: [],
};

describe("shiftCalendarMonth", () => {
  it("avanza un mes manteniendo el día cuando es válido", () => {
    expect(
      shiftCalendarMonth({ day: 10, month: 2, year: 2050 }, 1, sampleConfig),
    ).toEqual({
      day: 10,
      month: 3,
      year: 2050,
    });
  });

  it("retrocede un mes", () => {
    expect(
      shiftCalendarMonth({ day: 15, month: 2, year: 2050 }, -1, sampleConfig),
    ).toEqual({
      day: 15,
      month: 1,
      year: 2050,
    });
  });

  it("hace rollover de año al pasar diciembre", () => {
    expect(
      shiftCalendarMonth({ day: 5, month: 3, year: 2050 }, 1, sampleConfig),
    ).toEqual({
      day: 5,
      month: 1,
      year: 2051,
    });
  });

  it("clampa el día al máximo del mes destino", () => {
    expect(
      shiftCalendarMonth({ day: 31, month: 3, year: 2050 }, -1, sampleConfig),
    ).toEqual({
      day: 30,
      month: 2,
      year: 2050,
    });
  });
});

describe("buildMonthGrid", () => {
  it("empieza el mes en el weekday correcto del calendario", () => {
    const grid = buildMonthGrid(2050, 2, sampleConfig);
    const firstWeek = grid.weeks[0] ?? [];
    const leadingBlanks = firstWeek.filter((cell) => cell.day === null).length;
    expect(leadingBlanks).toBeGreaterThanOrEqual(0);
    expect(firstWeek.some((cell) => cell.day === 1)).toBe(true);
  });
});
