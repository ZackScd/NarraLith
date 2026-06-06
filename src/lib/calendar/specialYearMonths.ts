import type { CalendarMonth, SpecialYearCycle } from "@/lib/types/calendar";

/** Meses del ciclo; si está vacío, copia el calendario base una vez. */
export function ensureCycleMonths(
  cycle: SpecialYearCycle,
  baseMonths: CalendarMonth[],
): CalendarMonth[] {
  if (cycle.months.length > 0) {
    return cycle.months;
  }
  return structuredClone(baseMonths);
}

export function createSpecialYearCycle(
  baseMonths: CalendarMonth[],
  defaultName: string,
): SpecialYearCycle {
  return {
    id: `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: defaultName,
    intervalYears: 4,
    startsAtYear: 0,
    syncFromBase: false,
    months: structuredClone(baseMonths),
    linkedPath: "",
  };
}
