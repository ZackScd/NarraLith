import type {
  CalendarConfig,
  CalendarMonth,
  LeapRules,
  SpecialYearCycle,
} from "@/lib/types/calendar";

/** Meses y reglas de bisiesto vigentes para un año concreto. */
export type EffectiveYearCalendar = {
  months: CalendarMonth[];
  leapRules: LeapRules;
  specialCycle?: SpecialYearCycle;
};

/**
 * Devuelve el ciclo de año especial activo en `year`, si alguno aplica.
 * Coincide cuando `year >= startsAtYear` y `(year - startsAtYear) % intervalYears === 0`.
 * Si varios ciclos coinciden, gana el de mayor `startsAtYear` (desempate por `id`).
 */
export function resolveSpecialYearCycle(
  year: number,
  config: CalendarConfig,
): SpecialYearCycle | null {
  if (config.specialYearsEnabled === false) return null;
  const cycles = config.specialYearCycles;
  if (!cycles?.length) return null;

  let best: SpecialYearCycle | null = null;
  for (const cycle of cycles) {
    const interval = cycle.intervalYears;
    if (interval <= 0 || year < cycle.startsAtYear) continue;
    if ((year - cycle.startsAtYear) % interval !== 0) continue;
    if (
      !best ||
      cycle.startsAtYear > best.startsAtYear ||
      (cycle.startsAtYear === best.startsAtYear && cycle.id > best.id)
    ) {
      best = cycle;
    }
  }
  return best;
}

/** Calendario efectivo (meses + bisiesto) para un año dado. */
export function effectiveCalendarForYear(
  year: number,
  config: CalendarConfig,
): EffectiveYearCalendar {
  const cycle = resolveSpecialYearCycle(year, config);
  if (!cycle) {
    return { months: config.months, leapRules: config.leapRules };
  }
  const months = cycle.months.length > 0 ? cycle.months : config.months;
  return {
    months,
    leapRules: config.leapRules,
    specialCycle: cycle,
  };
}

export function isSpecialCalendarYear(year: number, config: CalendarConfig): boolean {
  return resolveSpecialYearCycle(year, config) !== null;
}

/**
 * Días extra por `leapRules` en un mes (legacy).
 * No se aplican si ese año ya usa un ciclo de año especial: el ciclo define los meses.
 */
export function leapExtraDaysForMonth(
  year: number,
  monthIndex: number,
  eff: EffectiveYearCalendar,
): number {
  if (eff.specialCycle) return 0;
  const leap = eff.leapRules;
  if (!leap.enabled || leap.everyYears <= 0) return 0;
  if (monthIndex !== leap.monthIndex) return 0;
  if (monthIndex < 0 || monthIndex >= eff.months.length) return 0;
  if (year % leap.everyYears !== 0) return 0;
  return leap.extraDays;
}

export function monthLengthForYear(
  year: number,
  monthIndex: number,
  eff: EffectiveYearCalendar,
): number {
  const base = eff.months[monthIndex]?.days ?? 0;
  return base + leapExtraDaysForMonth(year, monthIndex, eff);
}
