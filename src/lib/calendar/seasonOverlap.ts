import type { CalendarMonth, CalendarSeason } from "@/lib/types/calendar";

export interface SeasonOverlapPair {
  indexA: number;
  indexB: number;
}

export function calendarDayOfYear(
  month: number,
  day: number,
  months: CalendarMonth[],
): number {
  let total = 0;
  for (let m = 1; m < month; m++) {
    total += months[m - 1]?.days ?? 0;
  }
  return total + day;
}

function totalDaysInYear(months: CalendarMonth[]): number {
  return months.reduce((sum, m) => sum + m.days, 0);
}

function seasonIntervals(
  start: number,
  end: number,
  total: number,
): [number, number][] {
  if (start <= end) return [[start, end]];
  return [
    [start, total],
    [1, end],
  ];
}

function intervalsOverlap(a: [number, number], b: [number, number]): boolean {
  return a[0] <= b[1] && b[0] <= a[1];
}

export function seasonRangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
  totalDays: number,
): boolean {
  const ia = seasonIntervals(startA, endA, totalDays);
  const ib = seasonIntervals(startB, endB, totalDays);
  for (const a of ia) {
    for (const b of ib) {
      if (intervalsOverlap(a, b)) return true;
    }
  }
  return false;
}

export function findSeasonOverlapPairs(
  seasons: CalendarSeason[],
  months: CalendarMonth[],
): SeasonOverlapPair[] {
  if (seasons.length < 2 || months.length === 0) return [];

  const total = totalDaysInYear(months);
  const ranges = seasons.map((s) => ({
    start: calendarDayOfYear(s.from.month, s.from.day, months),
    end: calendarDayOfYear(s.to.month, s.to.day, months),
  }));

  const pairs: SeasonOverlapPair[] = [];
  for (let i = 0; i < seasons.length; i++) {
    for (let j = i + 1; j < seasons.length; j++) {
      const a = ranges[i]!;
      const b = ranges[j]!;
      if (seasonRangesOverlap(a.start, a.end, b.start, b.end, total)) {
        pairs.push({ indexA: i, indexB: j });
      }
    }
  }
  return pairs;
}

export function seasonIndicesWithOverlap(pairs: SeasonOverlapPair[]): Set<number> {
  const indices = new Set<number>();
  for (const { indexA, indexB } of pairs) {
    indices.add(indexA);
    indices.add(indexB);
  }
  return indices;
}

export function overlapPartnerIndices(
  index: number,
  pairs: SeasonOverlapPair[],
): number[] {
  const partners = new Set<number>();
  for (const { indexA, indexB } of pairs) {
    if (indexA === index) partners.add(indexB);
    if (indexB === index) partners.add(indexA);
  }
  return [...partners].sort((a, b) => a - b);
}

export function seasonDayKey(month: number, day: number): string {
  return `${month}-${day}`;
}

function dayInSeason(
  month: number,
  day: number,
  season: CalendarSeason,
  months: CalendarMonth[],
): boolean {
  const total = totalDaysInYear(months);
  const current = calendarDayOfYear(month, day, months);
  const start = calendarDayOfYear(season.from.month, season.from.day, months);
  const end = calendarDayOfYear(season.to.month, season.to.day, months);
  if (start <= end) return current >= start && current <= end;
  return current >= start || current <= end || end === total;
}

/** Días del año que pertenecen a más de una estación (para resaltar en edición). */
export function buildOverlappingSeasonDayKeys(
  seasons: CalendarSeason[],
  months: CalendarMonth[],
): Set<string> {
  const keys = new Set<string>();
  if (seasons.length < 2 || months.length === 0) return keys;

  for (let mi = 0; mi < months.length; mi++) {
    const monthNum = mi + 1;
    const maxDay = months[mi]?.days ?? 0;
    for (let day = 1; day <= maxDay; day++) {
      let count = 0;
      for (const season of seasons) {
        if (dayInSeason(monthNum, day, season, months)) count += 1;
      }
      if (count > 1) keys.add(seasonDayKey(monthNum, day));
    }
  }
  return keys;
}
