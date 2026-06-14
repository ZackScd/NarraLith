import type { CalendarMonth } from "@/lib/types/calendar";

export function monthStructuralSig(month: CalendarMonth): string {
  const hours = month.dayHours?.join(",") ?? "";
  return `${month.days}|${hours}`;
}

/** ¿El mes en borrador encaja con el siguiente mes en disco (mes eliminado)? */
export function isShiftedMonthRemoval(
  diskMonths: CalendarMonth[],
  draftMonths: CalendarMonth[],
  diskSigs: string[],
  draftSigs: string[],
  i: number,
  j: number,
): boolean {
  if (i + 1 >= diskMonths.length) return false;
  if (draftSigs[j] !== diskSigs[i + 1]) return false;
  if (diskMonths[i]!.name === draftMonths[j]!.name) return false;
  return draftMonths[j]!.name === diskMonths[i + 1]!.name;
}

/** ¿Mes nuevo insertado en borrador antes de lo que sigue en disco? */
export function isInsertedMonth(
  diskMonths: CalendarMonth[],
  draftMonths: CalendarMonth[],
  diskSigs: string[],
  draftSigs: string[],
  i: number,
  j: number,
): boolean {
  if (j + 1 >= draftMonths.length || i >= diskMonths.length) return false;
  return draftSigs[j + 1] === diskSigs[i] && draftSigs[j] !== diskSigs[i];
}

/** Cambio de días del mismo mes (mismo nombre), sin desplazamiento. */
export function isSameMonthDaysChange(
  diskMonths: CalendarMonth[],
  draftMonths: CalendarMonth[],
  diskSigs: string[],
  draftSigs: string[],
  i: number,
  j: number,
): boolean {
  if (i >= diskMonths.length || j >= draftMonths.length) return false;
  return diskMonths[i]!.name === draftMonths[j]!.name && diskSigs[i] !== draftSigs[j];
}

export function canAlignMonthsAt(
  diskMonths: CalendarMonth[],
  draftMonths: CalendarMonth[],
  diskSigs: string[],
  draftSigs: string[],
  i: number,
  j: number,
): boolean {
  if (diskSigs[i] !== draftSigs[j]) return false;
  if (diskMonths[i]!.name === draftMonths[j]!.name) return true;
  return !isShiftedMonthRemoval(diskMonths, draftMonths, diskSigs, draftSigs, i, j);
}
