import { formatTimeTag } from "@/lib/calendar/dateTags";
import { fromAbsoluteDay } from "@/lib/calendar/engine";
import type { CalendarConfig } from "@/lib/types/calendar";
import {
  buildTimelineTimeScale,
  computeVisibleRange,
  zoomAtPointer,
  type TimelineTimeScale,
} from "@/modules/timeline/timelineScale";

export interface MapTimelineViewScale extends TimelineTimeScale {
  viewMin: number;
  viewMax: number;
  xToTime: (x: number) => number;
}

export function buildMapTimelineViewScale(options: {
  fullMin: number;
  fullMax: number;
  zoomScale: number;
  viewCenter: number | null;
  width: number;
  margin?: number;
}): MapTimelineViewScale {
  const margin = options.margin ?? 24;
  const { viewMin, viewMax } = computeVisibleRange(
    options.fullMin,
    options.fullMax,
    options.zoomScale,
    options.viewCenter,
  );
  const scale = buildTimelineTimeScale(
    viewMin,
    viewMax,
    [],
    options.width,
    margin,
    false,
  );

  const xToTime = (x: number): number => {
    const { lineLeft, lineRight } = scale;
    const clamped = Math.max(lineLeft, Math.min(lineRight, x));
    const ratio = (clamped - lineLeft) / (lineRight - lineLeft || 1);
    return viewMin + ratio * (viewMax - viewMin);
  };

  return { ...scale, viewMin, viewMax, xToTime };
}

export function dayToRaw(day: number, config: CalendarConfig): string {
  const parts = fromAbsoluteDay(BigInt(Math.round(day)), config);
  return formatTimeTag(parts);
}

export function zoomMapTimelineAtPointer(
  fullMin: number,
  fullMax: number,
  zoomScale: number,
  viewCenter: number | null,
  pointerRatio: number,
  zoomIn: boolean,
): { zoomScale: number; viewCenter: number } {
  return zoomAtPointer(fullMin, fullMax, zoomScale, viewCenter, pointerRatio, zoomIn);
}
