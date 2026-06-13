import { toAbsoluteDay } from "@/lib/calendar";
import { MAX_ABS_DAY as MAX_ABS_DAY_RENDER } from "@/lib/calendar/engine";
import { effectiveCalendarForYear } from "@/lib/calendar/effectiveCalendar";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { TimelineDisplayItem } from "@/modules/timeline/timelineModel";

export { MAX_ABS_DAY_RENDER };
export const DEAD_GAP_THRESHOLD_DAYS = 120;
export const MIN_YEAR_BLOCK_WIDTH = 44;
export const YEAR_BREAK_WIDTH = 14;

export type PositionedItem = TimelineDisplayItem & {
  x: number;
  y: number;
  width: number;
  day: number;
  month: number;
  year: number;
};

export type CollapsedScale = {
  toX: (time: number) => number;
  breaks: { x: number }[];
  regions: Array<{ from: number; to: number }>;
  lineLeft: number;
  lineRight: number;
};

export type YearBarSegment = {
  year: number;
  x1: number;
  x2: number;
  groupIndex: number;
};

export type DatedTimelineEntry = {
  item: TimelineDisplayItem;
  parts: { year: number; month: number; day: number };
  time: number;
};

export function resolveMonthCount(year: number, calendar: CalendarConfig): number {
  return effectiveCalendarForYear(year, calendar).months.length;
}

export function resolveMonthLength(
  year: number,
  month: number,
  calendar: CalendarConfig,
): number {
  const eff = effectiveCalendarForYear(year, calendar);
  return eff.months[month - 1]?.days ?? 1;
}

export function centeredXByDayInMonth(
  entries: DatedTimelineEntry[],
  toX: (time: number) => number,
  calendar: CalendarConfig,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of entries) {
    const dayStart = Number(
      toAbsoluteDay(
        { day: entry.parts.day, month: entry.parts.month, year: entry.parts.year },
        calendar,
      ),
    );
    map.set(entry.item.id, toX(dayStart + 0.5));
  }
  return map;
}

export function spreadDayGroupCenters(
  entries: DatedTimelineEntry[],
  toX: (time: number) => number,
  calendar: CalendarConfig,
): Map<string, number> {
  const centeredXByItemId = new Map<string, number>();
  const groups = new Map<string, DatedTimelineEntry[]>();

  for (const entry of entries) {
    const key = `${entry.parts.year}-${entry.parts.month}-${entry.parts.day}`;
    const existing = groups.get(key);
    if (existing) existing.push(entry);
    else groups.set(key, [entry]);
  }

  for (const group of groups.values()) {
    if (group.length === 0) continue;
    const { year: groupYear, month: groupMonth, day: groupDay } = group[0]!.parts;
    const groupDayStart = Number(
      toAbsoluteDay({ day: groupDay, month: groupMonth, year: groupYear }, calendar),
    );
    const centerX = toX(groupDayStart + 0.5);
    const dayWidth = Math.abs(toX(groupDayStart + 1) - toX(groupDayStart));
    const spacing = clamp(dayWidth * 0.06, 14, 28);
    group.forEach((entry, idx) => {
      const slot =
        idx === 0 ? 0 : idx % 2 === 1 ? -Math.ceil(idx / 2) : Math.ceil(idx / 2);
      centeredXByItemId.set(entry.item.id, centerX + slot * spacing);
    });
  }

  return centeredXByItemId;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function asSafeDay(key: bigint): number | null {
  if (key > BigInt(MAX_ABS_DAY_RENDER) || key < BigInt(-MAX_ABS_DAY_RENDER))
    return null;
  const n = Number(key);
  return Number.isFinite(n) ? n : null;
}

export function startOfYear(year: number, calendar: CalendarConfig): number {
  return Number(toAbsoluteDay({ day: 1, month: 1, year }, calendar));
}

export function startOfMonth(
  year: number,
  month: number,
  calendar: CalendarConfig,
): number {
  return Number(toAbsoluteDay({ day: 1, month, year }, calendar));
}

export function assignLanes(items: PositionedItem[]): Map<string, number> {
  type Interval = { left: number; right: number };
  const lanes: Interval[][] = [];
  const map = new Map<string, number>();
  const sorted = [...items].sort((a, b) => a.x - b.x);
  for (const item of sorted) {
    const interval = { left: item.x - item.width / 2, right: item.x + item.width / 2 };
    let lane = 0;
    while (lane < lanes.length) {
      const hasCollision = lanes[lane].some(
        (other) => interval.left < other.right && interval.right > other.left,
      );
      if (!hasCollision) break;
      lane += 1;
    }
    if (!lanes[lane]) lanes[lane] = [];
    lanes[lane].push(interval);
    map.set(item.id, lane);
  }
  return map;
}

function groupConsecutiveYears(years: number[]): number[][] {
  if (years.length === 0) return [];
  const sorted = [...years].sort((a, b) => a - b);
  const groups: number[][] = [[sorted[0]!]];
  for (let i = 1; i < sorted.length; i += 1) {
    const y = sorted[i]!;
    const prev = sorted[i - 1]!;
    if (y === prev + 1) {
      groups[groups.length - 1]!.push(y);
    } else {
      groups.push([y]);
    }
  }
  return groups;
}

export function estimateCompactYearBarWidth(activeYearsList: number[]): number {
  if (activeYearsList.length === 0) return MIN_YEAR_BLOCK_WIDTH;
  const groups = groupConsecutiveYears(activeYearsList);
  const breakCount = Math.max(0, groups.length - 1);
  return activeYearsList.length * MIN_YEAR_BLOCK_WIDTH + breakCount * YEAR_BREAK_WIDTH;
}

export function buildCompactYearBarLayout(
  activeYearsList: number[],
  lineLeft: number,
  lineRight: number,
  calendar: CalendarConfig,
): {
  segments: YearBarSegment[];
  breaks: { x: number }[];
  toX: (time: number, year: number) => number;
} {
  const groups = groupConsecutiveYears(activeYearsList);
  const breakCount = Math.max(0, groups.length - 1);
  const available = Math.max(120, lineRight - lineLeft);
  const breakTotal = breakCount * YEAR_BREAK_WIDTH;
  const totalYears = Math.max(1, activeYearsList.length);
  const yearWidth = Math.max(
    MIN_YEAR_BLOCK_WIDTH,
    (available - breakTotal) / totalYears,
  );

  const segments: YearBarSegment[] = [];
  const breaks: { x: number }[] = [];
  const yearToSegment = new Map<number, YearBarSegment>();

  let cursor = lineLeft;
  groups.forEach((group, groupIndex) => {
    for (const y of group) {
      const x1 = cursor;
      const x2 = cursor + yearWidth;
      const seg = { year: y, x1, x2, groupIndex };
      segments.push(seg);
      yearToSegment.set(y, seg);
      cursor = x2;
    }
    if (groupIndex < groups.length - 1) {
      breaks.push({ x: cursor + YEAR_BREAK_WIDTH / 2 });
      cursor += YEAR_BREAK_WIDTH;
    }
  });

  const toX = (time: number, year: number): number => {
    const seg = yearToSegment.get(year);
    if (!seg) return lineLeft;
    const yearStart = startOfYear(year, calendar);
    const yearEnd = startOfYear(year + 1, calendar);
    const span = Math.max(0.0001, yearEnd - yearStart);
    const t = clamp((time - yearStart) / span, 0, 1);
    return seg.x1 + t * (seg.x2 - seg.x1);
  };

  return { segments, breaks, toX };
}

export function buildCollapsedScale(
  viewMin: number,
  viewMax: number,
  activeTimes: number[],
  lineLeft: number,
  lineRight: number,
  collapseDeadTime: boolean,
): CollapsedScale {
  const spanWidth = Math.max(1, lineRight - lineLeft);
  if (!collapseDeadTime) {
    const span = Math.max(0.0001, viewMax - viewMin);
    return {
      toX: (time) => lineLeft + ((time - viewMin) / span) * spanWidth,
      breaks: [],
      regions: [{ from: viewMin, to: viewMax }],
      lineLeft,
      lineRight,
    };
  }

  const anchors = [
    viewMin,
    ...activeTimes.filter((t) => t >= viewMin && t <= viewMax),
    viewMax,
  ]
    .sort((a, b) => a - b)
    .filter((value, idx, arr) => idx === 0 || arr[idx - 1] !== value);

  if (anchors.length < 2) {
    const span = Math.max(0.0001, viewMax - viewMin);
    return {
      toX: (time) => lineLeft + ((time - viewMin) / span) * spanWidth,
      breaks: [],
      regions: [{ from: viewMin, to: viewMax }],
      lineLeft,
      lineRight,
    };
  }

  const regions: Array<{ from: number; to: number }> = [];
  let start = anchors[0]!;
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const a = anchors[i]!;
    const b = anchors[i + 1]!;
    if (b - a > DEAD_GAP_THRESHOLD_DAYS) {
      regions.push({ from: start, to: a });
      start = b;
    }
  }
  regions.push({ from: start, to: anchors[anchors.length - 1]! });

  const validRegions = regions.filter((r) => r.to > r.from);
  if (validRegions.length === 0) {
    const span = Math.max(0.0001, viewMax - viewMin);
    return {
      toX: (time) => lineLeft + ((time - viewMin) / span) * spanWidth,
      breaks: [],
      regions: [{ from: viewMin, to: viewMax }],
      lineLeft,
      lineRight,
    };
  }

  const breakCount = Math.max(0, validRegions.length - 1);
  const maxBreakTotal = spanWidth * 0.3;
  const preferredBreak = 14;
  const breakWidth =
    breakCount > 0 ? Math.min(preferredBreak, maxBreakTotal / breakCount) : 0;
  const breakTotal = breakCount * breakWidth;
  const timeWidth = Math.max(40, spanWidth - breakTotal);
  const totalDuration =
    validRegions.reduce((sum, r) => sum + Math.max(0.0001, r.to - r.from), 0) || 1;

  const pixels: Array<{ from: number; to: number; tFrom: number; tTo: number }> = [];
  const breaks: { x: number }[] = [];

  let cursor = lineLeft;
  validRegions.forEach((region, idx) => {
    const duration = Math.max(0.0001, region.to - region.from);
    const width = (duration / totalDuration) * timeWidth;
    const from = cursor;
    const to = cursor + width;
    pixels.push({ from, to, tFrom: region.from, tTo: region.to });
    cursor = to;
    if (idx < validRegions.length - 1) {
      breaks.push({ x: cursor + breakWidth / 2 });
      cursor += breakWidth;
    }
  });

  const toX = (time: number): number => {
    for (const p of pixels) {
      if (time >= p.tFrom && time <= p.tTo) {
        const t = (time - p.tFrom) / Math.max(0.0001, p.tTo - p.tFrom);
        return p.from + t * (p.to - p.from);
      }
      if (time < p.tFrom) {
        return p.from;
      }
    }
    const last = pixels[pixels.length - 1];
    if (last && time > last.tTo) return last.to;
    if (time < viewMin) return lineLeft;
    if (time > viewMax) return lineRight;
    return lineLeft;
  };

  return { toX, breaks, regions: validRegions, lineLeft, lineRight };
}
