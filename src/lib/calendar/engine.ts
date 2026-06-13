import type { CalendarConfig, CalendarEpoch, ParsedTime } from "@/lib/types/calendar";
import { MYTHIC_SORT_KEY, UNKNOWN_SORT_KEY } from "@/lib/types/calendar";
import {
  effectiveCalendarForYear,
  leapExtraDaysForMonth,
  monthLengthForYear,
  type EffectiveYearCalendar,
} from "@/lib/calendar/effectiveCalendar";

const DATE_PATTERN = /^(\d+)\.(\d+)\.(-?\d+)$/;

/** Límite de días absolutos renderizables (timeline, calendario, panel). */
export const MAX_ABS_DAY = 5_000_000;

const MAX_YEAR_SCAN = 500_000;

export function isRenderableAbsoluteDay(key: bigint): boolean {
  return key >= -BigInt(MAX_ABS_DAY) && key <= BigInt(MAX_ABS_DAY);
}

function advancePositiveYear(
  remaining: bigint,
  config: CalendarConfig,
): { year: number; remaining: bigint } {
  const baseLen = daysInYear(0, config);
  if (baseLen <= 0n) {
    return { year: 0, remaining: 0n };
  }

  const fastThreshold = baseLen * BigInt(MAX_YEAR_SCAN);
  if (remaining >= fastThreshold) {
    let year = MAX_YEAR_SCAN;
    let rem = remaining - fastThreshold;
    if (rem >= baseLen) {
      rem = rem % baseLen;
    }
    return { year, remaining: rem };
  }

  let year = 0;
  let rem = remaining;
  while (year < MAX_YEAR_SCAN) {
    const yearLen = daysInYear(year, config);
    if (yearLen <= 0n) break;
    if (rem < yearLen) break;
    rem -= yearLen;
    year += 1;
  }
  return { year, remaining: rem };
}

function advanceNegativeYear(
  remaining: bigint,
  config: CalendarConfig,
): { year: number; remaining: bigint } {
  let year = -1;
  let guard = 0;
  while (remaining < 0n && guard < MAX_YEAR_SCAN) {
    guard += 1;
    const yearLen = daysInYear(year, config);
    if (yearLen <= 0n) break;
    if (remaining + yearLen >= 0n) break;
    remaining += yearLen;
    year -= 1;
  }
  return { year, remaining };
}

function isLeapYearForEffective(year: number, eff: EffectiveYearCalendar): boolean {
  if (eff.specialCycle) return false;
  return leapExtraDaysForMonth(year, eff.leapRules.monthIndex, eff) > 0;
}

export function isLeapYear(year: number, config: CalendarConfig): boolean {
  return isLeapYearForEffective(year, effectiveCalendarForYear(year, config));
}

function daysInYearForEffective(year: number, eff: EffectiveYearCalendar): bigint {
  let total = 0n;
  for (let m = 0; m < eff.months.length; m++) {
    total += BigInt(monthLengthForYear(year, m, eff));
  }
  return total;
}

export function daysInYear(year: number, config: CalendarConfig): bigint {
  return daysInYearForEffective(year, effectiveCalendarForYear(year, config));
}

function yearOffset(year: number, config: CalendarConfig): bigint {
  if (year >= 0) {
    let total = 0n;
    for (let y = 0; y < year; y++) {
      total += daysInYear(y, config);
    }
    return total;
  }
  let total = 0n;
  for (let y = year; y < 0; y++) {
    total -= daysInYear(y, config);
  }
  return total;
}

function monthOffset(month: number, year: number, config: CalendarConfig): bigint {
  const eff = effectiveCalendarForYear(year, config);
  let total = 0n;
  for (let m = 0; m < month - 1; m++) {
    total += BigInt(monthLengthForYear(year, m, eff));
  }
  return total;
}

/** Días absolutos desde el origen del calendario (año 0, mes 1, día 1). */
export function toAbsoluteFromOrigin(
  day: number,
  month: number,
  year: number,
  config: CalendarConfig,
): bigint {
  return yearOffset(year, config) + monthOffset(month, year, config) + BigInt(day - 1);
}

export function toAbsoluteDay(
  parts: { day: number; month: number; year: number },
  config: CalendarConfig,
): bigint {
  const origin = toAbsoluteFromOrigin(parts.day, parts.month, parts.year, config);
  const epoch = toAbsoluteFromOrigin(
    config.epoch.day,
    config.epoch.month,
    config.epoch.year,
    config,
  );
  return origin - epoch;
}

export function fromAbsoluteDay(
  absoluteDay: bigint,
  config: CalendarConfig,
): { day: number; month: number; year: number } {
  const epochOrigin = toAbsoluteFromOrigin(
    config.epoch.day,
    config.epoch.month,
    config.epoch.year,
    config,
  );
  return fromAbsoluteFromOrigin(epochOrigin + absoluteDay, config);
}

function fromAbsoluteFromOrigin(
  absoluteFromOrigin: bigint,
  config: CalendarConfig,
): { day: number; month: number; year: number } {
  if (absoluteFromOrigin < 0n) {
    const { year, remaining } = advanceNegativeYear(absoluteFromOrigin, config);
    return splitYearRemainder(year, remaining, config);
  }

  const { year, remaining } = advancePositiveYear(absoluteFromOrigin, config);
  return splitYearRemainder(year, remaining, config);
}

function splitYearRemainder(
  year: number,
  remaining: bigint,
  config: CalendarConfig,
): { day: number; month: number; year: number } {
  const eff = effectiveCalendarForYear(year, config);
  let dayIndex = remaining;
  for (let m = 0; m < eff.months.length; m++) {
    const monthLen = BigInt(monthLengthForYear(year, m, eff));
    if (dayIndex < monthLen) {
      return { day: Number(dayIndex) + 1, month: m + 1, year };
    }
    dayIndex -= monthLen;
  }
  const lastMonth = eff.months.length;
  return { day: 1, month: lastMonth, year };
}

export function parseDateString(raw: string, config: CalendarConfig): ParsedTime {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { kind: "invalid" };
  }

  const lower = trimmed.toLowerCase();
  if (lower === "mythic" || lower === "mítico" || lower === "mitico") {
    return { kind: "mythic" };
  }
  if (lower === "unknown" || lower === "desconocido" || lower === "?") {
    return { kind: "unknown" };
  }

  const match = DATE_PATTERN.exec(trimmed);
  if (!match) {
    return { kind: "invalid" };
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  const eff = effectiveCalendarForYear(year, config);

  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    !Number.isFinite(year) ||
    day < 1 ||
    month < 1 ||
    month > eff.months.length
  ) {
    return { kind: "invalid" };
  }

  const allowedDays = monthLengthForYear(year, month - 1, eff);
  if (day > allowedDays) {
    return { kind: "invalid" };
  }

  return {
    kind: "instant",
    absoluteDay: toAbsoluteDay({ day, month, year }, config),
  };
}

export function formatInstant(absoluteDay: bigint, config: CalendarConfig): string {
  const parts = fromAbsoluteDay(absoluteDay, config);
  const eff = effectiveCalendarForYear(parts.year, config);
  const monthName = eff.months[parts.month - 1]?.name ?? String(parts.month);
  return `${parts.day}.${parts.month}.${parts.year} (${monthName})`;
}

export function compareParsedTime(a: ParsedTime, b: ParsedTime): number {
  const keyA = sortKeyFromParsed(a);
  const keyB = sortKeyFromParsed(b);
  if (keyA === keyB) {
    return 0;
  }
  return keyA < keyB ? -1 : 1;
}

export function sortKeyFromParsed(parsed: ParsedTime): bigint {
  if (parsed.kind === "instant") {
    return parsed.absoluteDay;
  }
  if (parsed.kind === "mythic") {
    return BigInt(MYTHIC_SORT_KEY);
  }
  if (parsed.kind === "unknown") {
    return BigInt(UNKNOWN_SORT_KEY);
  }
  return BigInt(UNKNOWN_SORT_KEY);
}

export function resolveTimeSortKey(
  rawTime: string,
  config: CalendarConfig,
): string | null {
  const parsed = parseDateString(rawTime, config);
  if (parsed.kind === "instant") {
    return parsed.absoluteDay.toString();
  }
  if (parsed.kind === "mythic") {
    return MYTHIC_SORT_KEY;
  }
  if (parsed.kind === "unknown") {
    return UNKNOWN_SORT_KEY;
  }
  return null;
}

export function addDays(absoluteDay: bigint, days: number): bigint {
  return absoluteDay + BigInt(days);
}

export function formatEpochLabel(epoch: CalendarEpoch, config: CalendarConfig): string {
  const eff = effectiveCalendarForYear(epoch.year, config);
  const monthName = eff.months[epoch.month - 1]?.name ?? String(epoch.month);
  return `${epoch.day}.${epoch.month}.${epoch.year} (${monthName})`;
}
