import type { TimelineZoomUnit } from "@/stores/useTimelineStore";

/** Umbral mínimo de «tiempo muerto» (días absolutos) para colapsar un hueco. */
export const DEAD_TIME_GAP_DAYS = 120;
const BREAK_SLOT_WIDTH = 40;
const BREAK_BAR_GAP = 5;
const BREAK_BAR_HEIGHT = 10;

export interface TimeRegion {
  from: number;
  to: number;
}

export interface TimelineBreak {
  x: number;
}

export interface TimelineAxisSegment {
  x1: number;
  x2: number;
}

export interface TimelineTimeScale {
  timeToX: (time: number) => number;
  viewMin: number;
  viewMax: number;
  regions: TimeRegion[];
  breaks: TimelineBreak[];
  axisSegments: TimelineAxisSegment[];
  lineLeft: number;
  lineRight: number;
}

export function deriveZoomUnit(spanDays: number): TimelineZoomUnit {
  if (spanDays > 365 * 4) return "year";
  if (spanDays > 120) return "month";
  if (spanDays > 21) return "week";
  return "day";
}

export function computeVisibleRange(
  fullMin: number,
  fullMax: number,
  zoomScale: number,
  viewCenter: number | null,
): { viewMin: number; viewMax: number } {
  const fullSpan = Math.max(fullMax - fullMin, 1);
  const visibleSpan = fullSpan / Math.max(zoomScale, 1);
  const center = viewCenter ?? (fullMin + fullMax) / 2;
  let viewMin = center - visibleSpan / 2;
  let viewMax = center + visibleSpan / 2;

  if (viewMin < fullMin) {
    viewMax += fullMin - viewMin;
    viewMin = fullMin;
  }
  if (viewMax > fullMax) {
    viewMin -= viewMax - fullMax;
    viewMax = fullMax;
  }
  viewMin = Math.max(fullMin, viewMin);
  viewMax = Math.min(fullMax, viewMax);

  return { viewMin, viewMax };
}

function buildActiveRegions(
  viewMin: number,
  viewMax: number,
  eventTimes: number[],
  gapThreshold: number,
): TimeRegion[] {
  const anchors = [
    viewMin,
    ...eventTimes.filter((t) => t > viewMin && t < viewMax),
    viewMax,
  ];
  const unique = [...new Set(anchors)].sort((a, b) => a - b);

  if (unique.length < 2) {
    return [{ from: viewMin, to: viewMax }];
  }

  const regions: TimeRegion[] = [];
  let from = unique[0];
  for (let i = 0; i < unique.length - 1; i++) {
    const a = unique[i];
    const b = unique[i + 1];
    if (b - a > gapThreshold) {
      regions.push({ from, to: a });
      from = b;
    }
  }
  regions.push({ from, to: unique[unique.length - 1] });
  return regions.filter((r) => r.to - r.from > 0);
}

export function buildTimelineTimeScale(
  viewMin: number,
  viewMax: number,
  eventTimes: number[],
  innerWidth: number,
  margin: number,
  collapseDeadTime: boolean,
  gapThreshold = DEAD_TIME_GAP_DAYS,
): TimelineTimeScale {
  const lineLeft = margin;
  const lineRight = innerWidth - margin;
  const drawable = lineRight - lineLeft;

  const regions = collapseDeadTime
    ? buildActiveRegions(viewMin, viewMax, eventTimes, gapThreshold)
    : [{ from: viewMin, to: viewMax }];

  const breakCount = Math.max(0, regions.length - 1);
  const breakTotal = breakCount * BREAK_SLOT_WIDTH;
  const timeDrawable = Math.max(drawable - breakTotal, 40);
  const totalDuration =
    regions.reduce((s, r) => s + Math.max(r.to - r.from, 0), 0) || 1;

  const axisSegments: TimelineAxisSegment[] = [];
  const breaks: TimelineBreak[] = [];
  const regionPixels: { from: number; to: number; timeFrom: number; timeTo: number }[] =
    [];

  let x = lineLeft;
  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
    const duration = Math.max(region.to - region.from, 0);
    const width = (duration / totalDuration) * timeDrawable;
    const x1 = x;
    const x2 = x + width;
    axisSegments.push({ x1, x2 });
    regionPixels.push({
      from: x1,
      to: x2,
      timeFrom: region.from,
      timeTo: region.to,
    });
    x = x2;

    if (i < regions.length - 1) {
      const breakX = x + BREAK_SLOT_WIDTH / 2;
      breaks.push({ x: breakX });
      x += BREAK_SLOT_WIDTH;
    }
  }

  const timeToX = (time: number): number => {
    for (const rp of regionPixels) {
      if (time >= rp.timeFrom && time <= rp.timeTo) {
        const span = rp.timeTo - rp.timeFrom || 1;
        const t = (time - rp.timeFrom) / span;
        return rp.from + t * (rp.to - rp.from);
      }
    }
    if (time < viewMin) return lineLeft;
    if (time > viewMax) return lineRight;
    return lineLeft;
  };

  return {
    timeToX,
    viewMin,
    viewMax,
    regions,
    breaks,
    axisSegments,
    lineLeft,
    lineRight,
  };
}

export function zoomAtPointer(
  fullMin: number,
  fullMax: number,
  zoomScale: number,
  viewCenter: number | null,
  pointerRatio: number,
  zoomIn: boolean,
): { zoomScale: number; viewCenter: number } {
  const { viewMin, viewMax } = computeVisibleRange(
    fullMin,
    fullMax,
    zoomScale,
    viewCenter,
  );
  const factor = zoomIn ? 1.18 : 1 / 1.18;
  const nextScale = Math.min(250, Math.max(1, zoomScale * factor));
  const timeAtPointer = viewMin + pointerRatio * (viewMax - viewMin);
  const { viewMin: nMin, viewMax: nMax } = computeVisibleRange(
    fullMin,
    fullMax,
    nextScale,
    timeAtPointer,
  );
  const nextCenter = (nMin + nMax) / 2;
  return { zoomScale: nextScale, viewCenter: nextCenter };
}

export const BREAK_DRAW = {
  slotWidth: BREAK_SLOT_WIDTH,
  barGap: BREAK_BAR_GAP,
  barHeight: BREAK_BAR_HEIGHT,
} as const;
