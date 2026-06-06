import { describe, expect, it } from "vitest";

import {
  calendarDatesEqual,
  formatCalendarDisplayDate,
} from "@/lib/calendar/formatCalendarDisplayDate";
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

describe("formatCalendarDisplayDate", () => {
  it("formats short mode as AAAA-MM-DD with hyphens", () => {
    expect(
      formatCalendarDisplayDate(
        { day: 3, month: 3, year: 2050 },
        sampleConfig,
        "short",
      ),
    ).toBe("2050-03-03");
  });

  it("formats long mode with day number, week and month names", () => {
    const label = formatCalendarDisplayDate(
      { day: 10, month: 3, year: 2050 },
      sampleConfig,
      "long",
    );
    expect(label).toContain("Marzo");
    expect(label).toContain("2050");
    expect(label).toContain(" 10 de ");
  });

  it("calendarDatesEqual compares day month year", () => {
    expect(
      calendarDatesEqual({ day: 1, month: 2, year: 3 }, { day: 1, month: 2, year: 3 }),
    ).toBe(true);
    expect(
      calendarDatesEqual({ day: 1, month: 2, year: 3 }, { day: 2, month: 2, year: 3 }),
    ).toBe(false);
    expect(calendarDatesEqual(null, { day: 1, month: 1, year: 1 })).toBe(false);
  });
});
