import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  effectiveCalendarForYear,
  fromAbsoluteDay,
  toAbsoluteDay,
} from "@/lib/calendar";
import { useProjectTimeline } from "@/hooks/useProjectTimeline";
import { useTimelineRenderAudit } from "@/lib/render-audit/hooks/useTimelineRenderAudit";
import { resolveInitialCalendarYear } from "@/lib/calendar/lastProjectTime";
import { timelineMarkerId } from "@/lib/calendar/timeMarks";
import { formatTimelineRangeLabel } from "@/lib/timeline/formatRangeLabel";
import {
  TimelineChip,
  TimelineEventLink,
  TimelineEventStem,
  BAR_HEIGHT,
  BELOW_LANE_HEIGHT,
  MANUSCRIPT_LANE_STEP,
  STEM_DATE_STACK_HEIGHT,
  chipHeight,
  linkEdgeAnchors,
} from "@/modules/timeline/timelineGraphics";
import {
  assignLanes,
  asSafeDay,
  buildCollapsedScale,
  buildCompactYearBarLayout,
  clamp,
  startOfMonth,
  startOfYear,
  type PositionedItem,
} from "@/modules/timeline/timelineLayoutHelpers";
import {
  buildEventSpanLinks,
  buildTimelineItems,
  estimateChipWidth,
  type TimelineDisplayItem,
} from "@/modules/timeline/timelineModel";
import {
  buildManuscriptPathWritingIndex,
  buildWritingOrderNeighbors,
} from "@/modules/timeline/writingOrder";
import { useCalendarStore } from "@/stores/useCalendarStore";
import { useEditorStore } from "@/stores/useEditorStore";
import { useFileTreeStore } from "@/stores/useFileTreeStore";
import { useTimelineStore } from "@/stores/useTimelineStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

const AXIS_LEFT_MARGIN = 28;
const AXIS_Y_RATIO = 0.5;
const NAV_BTN_SIZE = 28;
const NAV_BTN_GAP = 4;
const NAV_BTN_INSET = 3;

type ZoomLevel = "all" | "years4" | "years2" | "year1" | "months" | "days" | "hours";
type HourTick = { x: number; label: number };
type YearZoomLevel = "all" | "years4" | "years2" | "year1";
type TimeButtonSegment = {
  key: string;
  label: string;
  x1: number;
  x2: number;
  year: number;
  month?: number;
  day?: number;
  hour?: number;
};

const ZOOM_BASE: ZoomLevel[] = ["all", "years4", "years2", "year1", "months", "days"];

function zoomOrder(allowHours: boolean): ZoomLevel[] {
  return allowHours ? [...ZOOM_BASE, "hours"] : ZOOM_BASE;
}

function resolveAllowedTopYearZoom(
  activeYearSequence: number[],
  minYear: number,
  maxYear: number,
  collapseYearZoom: boolean,
): YearZoomLevel {
  const totalActiveYears = activeYearSequence.length;
  if (totalActiveYears <= 1) return "year1";

  if (collapseYearZoom) {
    if (totalActiveYears === 2) return "years2";
    if (totalActiveYears <= 4) return "years4";
    return "all";
  }

  const span = Math.max(1, maxYear - minYear + 1);
  if (totalActiveYears === 2) {
    if (span === 2) return "years2";
    if (span <= 4) return "years4";
    return "all";
  }

  if (span <= 4) return "years4";
  return "all";
}

function buildEffectiveZoomOrder(
  baseOrder: ZoomLevel[],
  allowedTopYearZoom: YearZoomLevel,
): ZoomLevel[] {
  const annualByTop: Record<YearZoomLevel, ZoomLevel[]> = {
    all: ["all", "years4", "years2", "year1"],
    years4: ["years4", "years2", "year1"],
    years2: ["years2", "year1"],
    year1: ["year1"],
  };
  const annual = annualByTop[allowedTopYearZoom];
  const detailed = baseOrder.filter(
    (level) =>
      level !== "all" && level !== "years4" && level !== "years2" && level !== "year1",
  );
  return [...annual, ...detailed];
}

function useContainerSize() {
  const [size, setSize] = useState({ width: 800, height: 400 });
  const observerRef = useRef<ResizeObserver | null>(null);

  const setContainer = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;

    const update = () => {
      setSize({
        width: Math.max(320, node.clientWidth),
        height: Math.max(280, node.clientHeight),
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    observerRef.current = ro;
  }, []);

  return { size, setContainer };
}

function resolveMonthCount(
  year: number,
  calendar: NonNullable<ReturnType<typeof useCalendarStore.getState>["config"]>,
): number {
  return effectiveCalendarForYear(year, calendar).months.length;
}

function resolveMonthLength(
  year: number,
  month: number,
  calendar: NonNullable<ReturnType<typeof useCalendarStore.getState>["config"]>,
): number {
  const eff = effectiveCalendarForYear(year, calendar);
  return eff.months[month - 1]?.days ?? 1;
}

function closestValue(values: number[], target: number): number {
  if (values.length === 0) return target;
  let best = values[0]!;
  let bestDist = Math.abs(best - target);
  for (let i = 1; i < values.length; i += 1) {
    const candidate = values[i]!;
    const dist = Math.abs(candidate - target);
    if (dist < bestDist) {
      best = candidate;
      bestDist = dist;
    }
  }
  return best;
}

type FocusParts = { year: number; month: number; day: number };

type ManuscriptAnchors = {
  years: number[];
  months: Array<{ year: number; month: number }>;
  days: FocusParts[];
};

type DatedEntry = {
  parts: FocusParts;
  item: { kind: string; lane: string };
};

function buildManuscriptAnchors(itemsWithDate: DatedEntry[]): ManuscriptAnchors {
  const manuscript = itemsWithDate.filter(
    (entry) => entry.item.kind === "file" && entry.item.lane === "manuscript",
  );
  const years = new Set<number>();
  const monthMap = new Map<string, { year: number; month: number }>();
  const dayMap = new Map<string, FocusParts>();

  for (const { parts } of manuscript) {
    years.add(parts.year);
    const monthId = `${parts.year}-${parts.month}`;
    if (!monthMap.has(monthId))
      monthMap.set(monthId, { year: parts.year, month: parts.month });
    const dayId = `${parts.year}-${parts.month}-${parts.day}`;
    if (!dayMap.has(dayId)) dayMap.set(dayId, { ...parts });
  }

  return {
    years: [...years].sort((a, b) => a - b),
    months: [...monthMap.values()].sort((a, b) => a.year - b.year || a.month - b.month),
    days: [...dayMap.values()].sort(
      (a, b) => a.year - b.year || a.month - b.month || a.day - b.day,
    ),
  };
}

function monthAnchorKey(parts: { year: number; month: number }): string {
  return `${parts.year}-${parts.month}`;
}

function closestMonthIndex(
  months: Array<{ year: number; month: number }>,
  target: { year: number; month: number },
): number {
  if (months.length === 0) return 0;
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < months.length; i += 1) {
    const m = months[i]!;
    const dist = Math.abs(m.year - target.year) * 100 + (m.month - target.month);
    if (dist < bestDist) {
      best = i;
      bestDist = dist;
    }
  }
  return best;
}

function closestDayIndex(days: FocusParts[], target: FocusParts): number {
  if (days.length === 0) return 0;
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < days.length; i += 1) {
    const d = days[i]!;
    const dist =
      Math.abs(d.year - target.year) * 10_000 +
      Math.abs(d.month - target.month) * 100 +
      Math.abs(d.day - target.day);
    if (dist < bestDist) {
      best = i;
      bestDist = dist;
    }
  }
  return best;
}

function stepManuscriptYear(
  years: number[],
  current: number,
  direction: -1 | 1,
): number {
  if (years.length === 0) return current;
  let idx = years.indexOf(current);
  if (idx < 0) {
    idx = 0;
    let bestDist = Math.abs(years[0]! - current);
    for (let i = 1; i < years.length; i += 1) {
      const dist = Math.abs(years[i]! - current);
      if (dist < bestDist) {
        idx = i;
        bestDist = dist;
      }
    }
  }
  return years[clamp(idx + direction, 0, years.length - 1)]!;
}

function snapFocusToManuscriptAnchors(
  anchors: ManuscriptAnchors,
  zoomLevel: ZoomLevel,
  focus: FocusParts,
): FocusParts {
  if (anchors.years.length === 0) return focus;

  if (zoomLevel === "months") {
    if (anchors.months.length === 0) {
      return { year: closestValue(anchors.years, focus.year), month: 1, day: 1 };
    }
    const hasMonth = anchors.months.some(
      (m) => monthAnchorKey(m) === monthAnchorKey(focus),
    );
    if (hasMonth)
      return {
        ...anchors.months.find((m) => monthAnchorKey(m) === monthAnchorKey(focus))!,
        day: 1,
      };
    const nearest = anchors.months[closestMonthIndex(anchors.months, focus)]!;
    return { year: nearest.year, month: nearest.month, day: 1 };
  }

  if (zoomLevel === "days" || zoomLevel === "hours") {
    if (anchors.days.length === 0) {
      const year = closestValue(anchors.years, focus.year);
      return { year, month: focus.month, day: 1 };
    }
    const hasDay = anchors.days.some(
      (d) => d.year === focus.year && d.month === focus.month && d.day === focus.day,
    );
    if (hasDay) return focus;
    return anchors.days[closestDayIndex(anchors.days, focus)]!;
  }

  return { year: closestValue(anchors.years, focus.year), month: focus.month, day: 1 };
}

type TimelineHorizontalProps = {
  onRangeLabelChange?: (label: string) => void;
};

export function TimelineHorizontal({ onRangeLabelChange }: TimelineHorizontalProps) {
  const { t } = useTranslation("timeline");
  const { events, loading, errorKey } = useProjectTimeline();
  const calendar = useCalendarStore((s) => s.config);
  const filters = useTimelineStore((s) => s.filters);
  const zoomLevel = useTimelineStore((s) => s.zoomLevel);
  const setZoomLevel = useTimelineStore((s) => s.setZoomLevel);
  const zoomButtonsMode = useTimelineStore((s) => s.zoomButtonsMode);
  const setZoomButtonsMode = useTimelineStore((s) => s.setZoomButtonsMode);
  const collapseDeadTime = useTimelineStore((s) => s.collapseDeadTime);
  const collapseLevels = useTimelineStore((s) => s.collapseLevels);
  const focusYear = useTimelineStore((s) => s.focusYear);
  const focusMonth = useTimelineStore((s) => s.focusMonth);
  const focusDay = useTimelineStore((s) => s.focusDay);
  const setFocusDate = useTimelineStore((s) => s.setFocusDate);
  const showHours = useTimelineStore((s) => s.showHours);
  const showEventConnectors = useTimelineStore((s) => s.showEventConnectors);
  const showWritingOrderHoverLink = useTimelineStore((s) => s.showWritingOrderHoverLink);
  const hoveredTimelineMarkerId = useTimelineStore((s) => s.hoveredTimelineMarkerId);
  const setHoveredTimelineMarkerId = useTimelineStore((s) => s.setHoveredTimelineMarkerId);
  const fileTree = useFileTreeStore((s) => s.tree);
  const explorerOrder = useFileTreeStore((s) => s.explorerOrder);
  const loadTree = useFileTreeStore((s) => s.loadTree);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);
  const requestOpenDocument = useEditorStore((s) => s.requestOpenDocument);
  const setMainView = useWorkspaceStore((s) => s.setMainView);
  const collapseLevelEnabled =
    zoomLevel === "all" || zoomLevel === "years4" || zoomLevel === "years2"
      ? collapseLevels.years
      : zoomLevel === "year1" || zoomLevel === "months"
        ? collapseLevels.months
        : zoomLevel === "days"
          ? collapseLevels.days
          : collapseLevels.hours;
  const collapseForZoom = collapseDeadTime && collapseLevelEnabled;

  const { size, setContainer } = useContainerSize();
  const { width, height } = size;

  const items = useMemo(() => {
    if (!calendar) return [];
    return buildTimelineItems(events, calendar, filters);
  }, [calendar, events, filters]);

  const itemsWithDate = useMemo(() => {
    if (!calendar) return [];
    const eventHours = new Map<string, number>();
    for (const event of events) {
      if (event.timeHour === null || event.timeHour === undefined) continue;
      eventHours.set(timelineMarkerId(event), event.timeHour);
    }
    const hoursPerDay = Math.max(1, calendar.hoursPerDay);
    return items
      .map((item) => {
        const day = asSafeDay(item.sortKey);
        if (day === null) return null;
        const parts = fromAbsoluteDay(item.sortKey, calendar);
        const hour = eventHours.get(item.id);
        const hourFrac =
          calendar.hoursEnabled !== false && hour !== undefined
            ? clamp(hour, 0, hoursPerDay - 1) / hoursPerDay
            : 0;
        return {
          item,
          parts,
          time: day + hourFrac,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [calendar, events, items]);

  const timelineYears = useMemo(() => {
    const years = new Set<number>();
    for (const entry of itemsWithDate) years.add(entry.parts.year);
    return [...years].sort((a, b) => a - b);
  }, [itemsWithDate]);

  const manuscriptAnchors = useMemo(
    () => buildManuscriptAnchors(itemsWithDate),
    [itemsWithDate],
  );

  useEffect(() => {
    if (!calendar || timelineYears.length === 0 || focusYear !== null) return;
    const initialYear = resolveInitialCalendarYear(events, calendar);
    const latest = itemsWithDate[itemsWithDate.length - 1];
    setFocusDate({
      year: initialYear,
      month: latest?.parts.month ?? 1,
      day: latest?.parts.day ?? 1,
    });
  }, [calendar, timelineYears, focusYear, events, itemsWithDate, setFocusDate]);

  useEffect(() => {
    if (!calendar || !collapseForZoom || manuscriptAnchors.years.length === 0) return;
    if (focusYear === null) return;

    const current: FocusParts = {
      year: focusYear,
      month: focusMonth ?? 1,
      day: focusDay ?? 1,
    };
    const snapped = snapFocusToManuscriptAnchors(manuscriptAnchors, zoomLevel, current);
    if (
      snapped.year !== current.year ||
      snapped.month !== current.month ||
      snapped.day !== current.day
    ) {
      setFocusDate(snapped);
    }
  }, [
    calendar,
    collapseForZoom,
    manuscriptAnchors,
    zoomLevel,
    focusYear,
    focusMonth,
    focusDay,
    setFocusDate,
  ]);

  const layout = useMemo(() => {
    if (!calendar || itemsWithDate.length === 0) return null;

    const manuscriptYears = [
      ...new Set(
        itemsWithDate
          .filter(
            (entry) => entry.item.kind === "file" && entry.item.lane === "manuscript",
          )
          .map((entry) => entry.parts.year),
      ),
    ].sort((a, b) => a - b);
    const allFileYears = [
      ...new Set(
        itemsWithDate
          .filter((entry) => entry.item.kind === "file")
          .map((entry) => entry.parts.year),
      ),
    ].sort((a, b) => a - b);
    const activeYearSequence =
      manuscriptYears.length > 0 ? manuscriptYears : allFileYears;
    if (activeYearSequence.length === 0) return null;

    const minYear = activeYearSequence[0]!;
    const maxYear = activeYearSequence[activeYearSequence.length - 1]!;
    const activeYearSet = new Set(activeYearSequence);
    const rawYear = clamp(focusYear ?? maxYear, minYear, maxYear);
    const rawMonth = focusMonth ?? 1;
    const rawDay = focusDay ?? 1;
    const snappedFocus = collapseForZoom
      ? snapFocusToManuscriptAnchors(manuscriptAnchors, zoomLevel, {
          year: rawYear,
          month: rawMonth,
          day: rawDay,
        })
      : { year: rawYear, month: rawMonth, day: rawDay };
    const year = collapseForZoom
      ? closestValue(activeYearSequence, snappedFocus.year)
      : snappedFocus.year;
    const month = clamp(snappedFocus.month, 1, resolveMonthCount(year, calendar));
    const day = clamp(snappedFocus.day, 1, resolveMonthLength(year, month, calendar));

    let visibleMin = startOfYear(minYear, calendar);
    let visibleMax = startOfYear(maxYear + 1, calendar);

    const setYearWindow = (count: number) => {
      if (collapseForZoom && activeYearSequence.length > 0) {
        const centerIdx = Math.max(0, activeYearSequence.indexOf(year));
        const startIdx = clamp(
          centerIdx - Math.floor((count - 1) / 2),
          0,
          Math.max(0, activeYearSequence.length - count),
        );
        const selected = activeYearSequence.slice(startIdx, startIdx + count);
        const years = selected.length > 0 ? selected : [year];
        visibleMin = startOfYear(years[0]!, calendar);
        visibleMax = startOfYear(years[years.length - 1]! + 1, calendar);
        return;
      }
      const total = maxYear - minYear + 1;
      if (count >= total) {
        visibleMin = startOfYear(minYear, calendar);
        visibleMax = startOfYear(maxYear + 1, calendar);
        return;
      }
      const half = Math.floor((count - 1) / 2);
      let start = year - half;
      let end = start + count - 1;
      if (start < minYear) {
        start = minYear;
        end = start + count - 1;
      }
      if (end > maxYear) {
        end = maxYear;
        start = end - count + 1;
      }
      visibleMin = startOfYear(start, calendar);
      visibleMax = startOfYear(end + 1, calendar);
    };

    if (zoomLevel === "all") {
      visibleMin = startOfYear(minYear, calendar);
      visibleMax = startOfYear(maxYear + 1, calendar);
    } else if (zoomLevel === "years4") {
      setYearWindow(4);
    } else if (zoomLevel === "years2") {
      setYearWindow(2);
    } else if (zoomLevel === "year1") {
      visibleMin = startOfYear(year, calendar);
      visibleMax = startOfYear(year + 1, calendar);
    } else if (zoomLevel === "months") {
      visibleMin = startOfMonth(year, month, calendar);
      visibleMax = visibleMin + resolveMonthLength(year, month, calendar);
    } else if (zoomLevel === "days") {
      visibleMin = Number(toAbsoluteDay({ day, month, year }, calendar));
      visibleMax = visibleMin + 1;
    } else {
      visibleMin = Number(toAbsoluteDay({ day, month, year }, calendar));
      visibleMax = visibleMin + 1;
    }

    const timelineMargin = AXIS_LEFT_MARGIN + NAV_BTN_SIZE + NAV_BTN_GAP + 6;
    const axisY = height * AXIS_Y_RATIO;
    const manuscriptTimes = itemsWithDate
      .filter((entry) => entry.item.kind === "file" && entry.item.lane === "manuscript")
      .map((entry) => entry.time);
    const allFileTimes = itemsWithDate
      .filter((entry) => entry.item.kind === "file")
      .map((entry) => entry.time);
    const activeTimes = manuscriptTimes.length > 0 ? manuscriptTimes : allFileTimes;
    const activeYears = activeYearSet;
    const baseLeft = timelineMargin;
    const baseRight = width - timelineMargin;

    const yearLevelZoom =
      zoomLevel === "all" || zoomLevel === "years4" || zoomLevel === "years2";
    const hideStemDateText =
      zoomLevel === "all" || zoomLevel === "years4" || zoomLevel === "years2";

    const activeYearsList = [...activeYears]
      .filter((y) => {
        const yearStart = startOfYear(y, calendar);
        const yearEnd = startOfYear(y + 1, calendar);
        return yearEnd > visibleMin && yearStart < visibleMax;
      })
      .sort((a, b) => a - b);

    const useCompactYearBar =
      collapseForZoom && yearLevelZoom && activeYearsList.length > 0;

    const compactYearBar = useCompactYearBar
      ? buildCompactYearBarLayout(activeYearsList, baseLeft, baseRight, calendar)
      : null;

    const scale = buildCollapsedScale(
      visibleMin,
      visibleMax,
      activeTimes,
      baseLeft,
      baseRight,
      collapseForZoom && !useCompactYearBar,
    );

    const lineLeft = compactYearBar?.segments[0]?.x1 ?? scale.lineLeft;
    const lineRight =
      compactYearBar?.segments[compactYearBar.segments.length - 1]?.x2 ??
      scale.lineRight;

    const toX = (time: number, year?: number) => {
      if (compactYearBar && year !== undefined) {
        return compactYearBar.toX(time, year);
      }
      return scale.toX(time);
    };

    const intersectsActiveRegion = (from: number, to: number) =>
      scale.regions.some((r) => to > r.from && from < r.to);

    const yearBlocks: { year: number; x1: number; x2: number }[] = [];
    if (compactYearBar) {
      for (const seg of compactYearBar.segments) {
        yearBlocks.push({ year: seg.year, x1: seg.x1, x2: seg.x2 });
      }
    } else {
      for (let y = minYear; y <= maxYear; y += 1) {
        const yearStart = startOfYear(y, calendar);
        const yearEnd = startOfYear(y + 1, calendar);
        if (yearEnd <= visibleMin || yearStart >= visibleMax) continue;
        if (collapseForZoom && yearLevelZoom && !activeYears.has(y)) continue;
        if (collapseForZoom && !intersectsActiveRegion(yearStart, yearEnd)) continue;
        yearBlocks.push({
          year: y,
          x1: toX(Math.max(visibleMin, yearStart)),
          x2: toX(Math.min(visibleMax, yearEnd)),
        });
      }
    }

    const monthTicks: number[] = [];
    if (zoomLevel !== "all") {
      for (const block of yearBlocks) {
        const months = resolveMonthCount(block.year, calendar);
        for (let m = 1; m <= months; m += 1) {
          const tick = startOfMonth(block.year, m, calendar);
          if (tick <= visibleMin || tick >= visibleMax) continue;
          if (
            collapseForZoom &&
            !useCompactYearBar &&
            !intersectsActiveRegion(tick, tick + 1)
          ) {
            continue;
          }
          monthTicks.push(toX(tick, block.year));
        }
      }
    }

    const dayTicks: number[] = [];
    if (zoomLevel === "months" || zoomLevel === "days" || zoomLevel === "hours") {
      const monthLen = resolveMonthLength(year, month, calendar);
      const monthStart = startOfMonth(year, month, calendar);
      for (let d = 1; d <= monthLen; d += 1) {
        const tick = monthStart + (d - 1);
        if (tick <= visibleMin || tick >= visibleMax) continue;
        dayTicks.push(toX(tick, year));
      }
    }

    const hourTicks: HourTick[] = [];
    const dayStart = Number(toAbsoluteDay({ day, month, year }, calendar));
    const canShowDayHours = zoomLevel === "days" && calendar.hoursEnabled !== false;
    const canShowHourZoomTicks =
      zoomLevel === "hours" && showHours && calendar.hoursEnabled !== false;
    if (canShowDayHours) {
      const totalHours = Math.max(1, calendar.hoursPerDay);
      for (let h = 0; h < totalHours; h += 1) {
        const hourCenter = (h + 0.5) / totalHours;
        hourTicks.push({
          x: toX(dayStart + hourCenter, year),
          label: h + 1,
        });
      }
    } else if (canShowHourZoomTicks) {
      const bars = Math.max(1, Math.ceil(calendar.hoursPerDay / 2));
      const step = calendar.hoursPerDay / bars;
      for (let i = 0; i < bars; i += 1) {
        const hourCenter = (i + 0.5) * step;
        hourTicks.push({
          x: toX(dayStart + hourCenter / Math.max(1, calendar.hoursPerDay), year),
          label: i + 1,
        });
      }
    }

    const monthButtonSegments: TimeButtonSegment[] = [];
    if (zoomLevel === "year1") {
      const monthCount = resolveMonthCount(year, calendar);
      const monthsMeta = effectiveCalendarForYear(year, calendar).months;
      for (let m = 1; m <= monthCount; m += 1) {
        const from = startOfMonth(year, m, calendar);
        const to =
          m < monthCount
            ? startOfMonth(year, m + 1, calendar)
            : startOfYear(year + 1, calendar);
        if (to <= visibleMin || from >= visibleMax) continue;
        monthButtonSegments.push({
          key: `month-${year}-${m}`,
          label: monthsMeta[m - 1]?.name ?? String(m),
          x1: toX(Math.max(visibleMin, from), year),
          x2: toX(Math.min(visibleMax, to), year),
          year,
          month: m,
        });
      }
    }

    const dayButtonSegments: TimeButtonSegment[] = [];
    if (zoomLevel === "months") {
      const monthStart = startOfMonth(year, month, calendar);
      const monthLen = resolveMonthLength(year, month, calendar);
      for (let d = 1; d <= monthLen; d += 1) {
        const from = monthStart + (d - 1);
        const to = from + 1;
        dayButtonSegments.push({
          key: `day-${year}-${month}-${d}`,
          label: String(d),
          x1: toX(from, year),
          x2: toX(to, year),
          year,
          month,
          day: d,
        });
      }
    }

    const hourButtonSegments: TimeButtonSegment[] = [];
    if (zoomLevel === "days" && calendar.hoursEnabled !== false) {
      const totalHours = Math.max(1, calendar.hoursPerDay);
      const dayBase = Number(toAbsoluteDay({ day, month, year }, calendar));
      for (let h = 0; h < totalHours; h += 1) {
        const from = dayBase + h / totalHours;
        const to = dayBase + (h + 1) / totalHours;
        hourButtonSegments.push({
          key: `hour-${year}-${month}-${day}-${h + 1}`,
          label: String(h + 1),
          x1: toX(from, year),
          x2: toX(to, year),
          year,
          month,
          day,
          hour: h + 1,
        });
      }
    }

    const visibleItems = itemsWithDate.filter((entry) => {
      if (entry.time < visibleMin || entry.time > visibleMax) return false;
      if (collapseForZoom && yearLevelZoom && !activeYears.has(entry.parts.year)) {
        return false;
      }
      return true;
    });
    const centeredXByItemId = new Map<string, number>();
    if (zoomLevel === "months") {
      for (const entry of visibleItems) {
        const dayStart = Number(
          toAbsoluteDay(
            {
              day: entry.parts.day,
              month: entry.parts.month,
              year: entry.parts.year,
            },
            calendar,
          ),
        );
        centeredXByItemId.set(entry.item.id, toX(dayStart + 0.5, entry.parts.year));
      }
    }
    if (zoomLevel === "days" && calendar.hoursEnabled === false) {
      const groups = new Map<string, typeof visibleItems>();
      for (const entry of visibleItems) {
        const key = `${entry.parts.year}-${entry.parts.month}-${entry.parts.day}`;
        const existing = groups.get(key);
        if (existing) existing.push(entry);
        else groups.set(key, [entry]);
      }
      for (const group of groups.values()) {
        if (group.length === 0) continue;
        const { year: groupYear, month: groupMonth, day: groupDay } = group[0]!.parts;
        const groupDayStart = Number(
          toAbsoluteDay(
            { day: groupDay, month: groupMonth, year: groupYear },
            calendar,
          ),
        );
        const centerX = toX(groupDayStart + 0.5, groupYear);
        const dayWidth = Math.abs(
          toX(groupDayStart + 1, groupYear) - toX(groupDayStart, groupYear),
        );
        const spacing = clamp(dayWidth * 0.06, 14, 28);
        group.forEach((entry, idx) => {
          const slot =
            idx === 0 ? 0 : idx % 2 === 1 ? -Math.ceil(idx / 2) : Math.ceil(idx / 2);
          centeredXByItemId.set(entry.item.id, centerX + slot * spacing);
        });
      }
    }

    const manuscriptRaw: PositionedItem[] = [];
    const belowRaw: PositionedItem[] = [];
    for (const entry of visibleItems) {
      const base: PositionedItem = {
        ...entry.item,
        x: centeredXByItemId.get(entry.item.id) ?? toX(entry.time, entry.parts.year),
        y: axisY,
        width: estimateChipWidth(entry.item),
        day: entry.parts.day,
        month: entry.parts.month,
        year: entry.parts.year,
      };
      if (entry.item.lane === "manuscript") manuscriptRaw.push(base);
      else belowRaw.push(base);
    }

    const manuscriptLanes = assignLanes(manuscriptRaw);
    const belowLanes = assignLanes(belowRaw);
    const barTop = axisY - BAR_HEIGHT / 2;
    const barBottom = axisY + BAR_HEIGHT / 2;

    const placed = [...manuscriptRaw, ...belowRaw].map((item) => {
      const h = chipHeight(item);
      if (item.lane === "manuscript") {
        const lane = manuscriptLanes.get(item.id) ?? 0;
        return {
          ...item,
          y: barTop - h - STEM_DATE_STACK_HEIGHT - lane * MANUSCRIPT_LANE_STEP,
        };
      }
      const lane = belowLanes.get(item.id) ?? 0;
      return {
        ...item,
        y: barBottom + STEM_DATE_STACK_HEIGHT + lane * BELOW_LANE_HEIGHT,
      };
    });

    const rangeLabel = formatTimelineRangeLabel(
      zoomLevel,
      year,
      month,
      day,
      yearBlocks,
      calendar,
    );

    return {
      placed,
      axisY,
      lineLeft,
      lineRight,
      showEventDateLabels: !hideStemDateText,
      breaks: compactYearBar?.breaks ?? scale.breaks,
      yearBlocks,
      monthTicks,
      dayTicks,
      hourTicks,
      monthButtonSegments,
      dayButtonSegments,
      hourButtonSegments,
      currentYear: year,
      currentMonth: month,
      currentDay: day,
      minYear,
      maxYear,
      activeYearSequence,
      manuscriptAnchors,
      rangeLabel,
    };
  }, [
    calendar,
    itemsWithDate,
    manuscriptAnchors,
    zoomLevel,
    focusYear,
    focusMonth,
    focusDay,
    width,
    height,
    showHours,
    collapseForZoom,
  ]);

  useEffect(() => {
    if (layout?.rangeLabel !== undefined) {
      onRangeLabelChange?.(layout.rangeLabel);
    }
  }, [layout?.rangeLabel, onRangeLabelChange]);

  const placedForLinks = layout?.placed ?? [];
  const placedById = useMemo(
    () => new Map(placedForLinks.map((item) => [item.id, item])),
    [placedForLinks],
  );
  const eventLinks = useMemo(
    () => buildEventSpanLinks(placedForLinks, showEventConnectors),
    [placedForLinks, showEventConnectors],
  );

  const manuscriptPaths = useMemo(
    () =>
      items
        .filter((item) => item.kind === "file" && item.lane === "manuscript" && item.path)
        .map((item) => item.path!),
    [items],
  );

  const allFileMarksForWritingOrder = useMemo(
    () =>
      items
        .filter((item): item is TimelineDisplayItem & { path: string } =>
          item.kind === "file" && !!item.path,
        )
        .map((item) => ({ ...item, x: 0, y: 0, width: 0 })),
    [items],
  );

  const manuscriptPathIndex = useMemo(
    () => buildManuscriptPathWritingIndex(fileTree, explorerOrder, manuscriptPaths),
    [fileTree, explorerOrder, manuscriptPaths],
  );

  const writingOrderNeighbors = useMemo(
    () => buildWritingOrderNeighbors(allFileMarksForWritingOrder, manuscriptPathIndex),
    [allFileMarksForWritingOrder, manuscriptPathIndex],
  );

  const writingOrderHoverLinks = useMemo(() => {
    if (!showWritingOrderHoverLink || !hoveredTimelineMarkerId) return [];
    const hovered = placedById.get(hoveredTimelineMarkerId);
    if (!hovered) return [];
    const { prevId, nextId } =
      writingOrderNeighbors.get(hoveredTimelineMarkerId) ?? {};
    const links: Array<{ fromItem: PositionedItem; toItem: PositionedItem }> =
      [];
    if (prevId) {
      const prev = placedById.get(prevId);
      if (prev) links.push({ fromItem: prev, toItem: hovered });
    }
    if (nextId) {
      const next = placedById.get(nextId);
      if (next) links.push({ fromItem: hovered, toItem: next });
    }
    return links;
  }, [
    showWritingOrderHoverLink,
    hoveredTimelineMarkerId,
    writingOrderNeighbors,
    placedById,
  ]);

  const timelineFiltersSnapshot = useMemo(
    () => ({
      ...filters,
      showEventConnectors,
      showWritingOrderHoverLink,
    }),
    [filters, showEventConnectors, showWritingOrderHoverLink],
  );

  const allowHoursLevel = showHours && calendar?.hoursEnabled !== false;
  const collapseYearZoom = collapseDeadTime && collapseLevels.years;
  const allowedTopYearZoom = layout
    ? resolveAllowedTopYearZoom(
        layout.activeYearSequence,
        layout.minYear,
        layout.maxYear,
        collapseYearZoom,
      )
    : "all";
  const effectiveOrder = buildEffectiveZoomOrder(
    zoomOrder(allowHoursLevel),
    allowedTopYearZoom,
  );
  const effectiveZoomLevel = effectiveOrder.includes(zoomLevel)
    ? zoomLevel
    : effectiveOrder[0]!;

  useTimelineRenderAudit({
    zoomLevel: effectiveZoomLevel,
    rangeLabel: layout?.rangeLabel ?? null,
    placed: placedForLinks,
    eventLinks,
    writingOrderHoverLinks,
    writingOrderNeighbors,
    hoveredTimelineMarkerId,
    manuscriptPathIndex,
    showEventConnectors,
    showWritingOrderHoverLink,
    filtersSnapshot: timelineFiltersSnapshot,
  });

  useEffect(() => {
    if (effectiveOrder.includes(zoomLevel)) return;
    setZoomLevel(effectiveOrder[0]!);
  }, [effectiveOrder, zoomLevel, setZoomLevel]);

  const openItem = useCallback(
    (item: TimelineDisplayItem) => {
      if (item.kind !== "file" || !item.path) return;
      void requestOpenDocument(item.path);
      setMainView("editor");
    },
    [requestOpenDocument, setMainView],
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  if (errorKey) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-destructive">
        {t(errorKey)}
      </div>
    );
  }

  if (!calendar) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        {t("noCalendar")}
      </div>
    );
  }

  if (!layout) {
    return (
      <div
        ref={setContainer}
        className="relative min-h-0 flex-1 overflow-hidden bg-[var(--timeline-canvas)]"
      />
    );
  }

  const { placed, axisY, showEventDateLabels } = layout;
  const axisYPercent = height > 0 ? (axisY / height) * 100 : 50;
  const navBtnStyle = {
    top: `${axisYPercent}%`,
    width: NAV_BTN_SIZE,
    height: NAV_BTN_SIZE,
    transform: "translateY(-50%)",
  } as const;
  const zoomIndex = effectiveOrder.indexOf(effectiveZoomLevel);
  const canZoomOut = zoomIndex > 0;
  const canZoomIn = zoomIndex < effectiveOrder.length - 1;
  const canSelectYears =
    zoomButtonsMode &&
    (effectiveZoomLevel === "all" ||
      effectiveZoomLevel === "years4" ||
      effectiveZoomLevel === "years2");
  const canSelectMonths = zoomButtonsMode && effectiveZoomLevel === "year1";
  const canSelectDays = zoomButtonsMode && effectiveZoomLevel === "months";
  const canSelectHours =
    zoomButtonsMode && effectiveZoomLevel === "days" && calendar.hoursEnabled !== false;
  const showDayHourButtons =
    effectiveZoomLevel === "days" && calendar.hoursEnabled !== false;

  const move = (direction: -1 | 1) => {
    const {
      currentYear,
      currentMonth,
      currentDay,
      minYear,
      maxYear,
      manuscriptAnchors: anchors,
    } = layout;

    if (collapseForZoom && anchors.years.length > 0) {
      setFocusDate({
        year: stepManuscriptYear(anchors.years, currentYear, direction),
      });
      return;
    }

    if (effectiveZoomLevel === "months") {
      let nextYear = currentYear;
      let nextMonth = currentMonth + direction;
      if (nextMonth < 1) {
        nextYear -= 1;
        nextMonth = resolveMonthCount(nextYear, calendar);
      } else if (nextMonth > resolveMonthCount(nextYear, calendar)) {
        nextYear += 1;
        nextMonth = 1;
      }
      setFocusDate({
        year: clamp(nextYear, minYear, maxYear),
        month: nextMonth,
        day: 1,
      });
      return;
    }
    if (effectiveZoomLevel === "days" || effectiveZoomLevel === "hours") {
      const base = toAbsoluteDay(
        { day: currentDay, month: currentMonth, year: currentYear },
        calendar,
      );
      const next = fromAbsoluteDay(base + BigInt(direction), calendar);
      setFocusDate({ year: next.year, month: next.month, day: next.day });
      return;
    }
    setFocusDate({ year: clamp(currentYear + direction, minYear, maxYear) });
  };

  return (
    <div
      ref={setContainer}
      className="relative min-h-0 flex-1 overflow-hidden bg-[var(--timeline-canvas)]"
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="absolute z-10 shrink-0 p-0"
        style={{ ...navBtnStyle, left: NAV_BTN_INSET }}
        aria-label={t("controls.moveLeft")}
        onClick={() => move(-1)}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="absolute z-10 shrink-0 p-0"
        style={{ ...navBtnStyle, right: NAV_BTN_INSET }}
        aria-label={t("controls.moveRight")}
        onClick={() => move(1)}
      >
        <ChevronRight className="size-4" />
      </Button>

      <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
        <p className="pointer-events-none text-[10px] text-muted-foreground">
          {t(`zoomLevelLabel.${effectiveZoomLevel}`)}
        </p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-7"
          title={t("controls.zoomButtonsMode")}
          aria-pressed={zoomButtonsMode}
          onClick={() => setZoomButtonsMode(!zoomButtonsMode)}
        >
          <Search className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-7"
          title={t("controls.zoomOut")}
          onClick={() => {
            if (!canZoomOut) return;
            setZoomLevel(effectiveOrder[zoomIndex - 1]!);
          }}
          disabled={!canZoomOut}
        >
          <Minus className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-7"
          title={t("controls.zoomIn")}
          onClick={() => {
            if (!canZoomIn) return;
            setZoomLevel(effectiveOrder[zoomIndex + 1]!);
          }}
          disabled={!canZoomIn}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="select-none"
        role="img"
        aria-label={t("canvasLabel")}
      >
        {(effectiveZoomLevel === "all" ||
          effectiveZoomLevel === "years4" ||
          effectiveZoomLevel === "years2" ||
          effectiveZoomLevel === "days" ||
          effectiveZoomLevel === "hours") &&
          layout.yearBlocks.map((block) => (
            <g key={`year-${block.year}`}>
              <rect
                x={block.x1}
                y={axisY - BAR_HEIGHT / 2}
                width={Math.max(1, block.x2 - block.x1)}
                height={BAR_HEIGHT}
                rx={2}
                fill="var(--timeline-chip-bg)"
                stroke="var(--timeline-chip-border)"
              />
              {effectiveZoomLevel !== "days" && effectiveZoomLevel !== "hours" ? (
                <text
                  x={(block.x1 + block.x2) / 2}
                  y={axisY + 4}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--timeline-chip-text)"
                >
                  {block.year}
                </text>
              ) : null}
            </g>
          ))}

        {effectiveZoomLevel === "year1" &&
          layout.monthButtonSegments.map((segment) => (
            <g
              key={segment.key}
              role={canSelectMonths ? "button" : undefined}
              tabIndex={canSelectMonths ? 0 : undefined}
              className={canSelectMonths ? "cursor-pointer" : undefined}
              aria-label={segment.label}
              onClick={() => {
                if (!canSelectMonths) return;
                setFocusDate({
                  year: segment.year,
                  month: segment.month ?? 1,
                  day: 1,
                });
                setZoomLevel("months");
              }}
              onKeyDown={(e) => {
                if (!canSelectMonths) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setFocusDate({
                    year: segment.year,
                    month: segment.month ?? 1,
                    day: 1,
                  });
                  setZoomLevel("months");
                }
              }}
            >
              <rect
                x={segment.x1}
                y={axisY - BAR_HEIGHT / 2}
                width={Math.max(1, segment.x2 - segment.x1)}
                height={BAR_HEIGHT}
                rx={4}
                className={
                  canSelectMonths
                    ? "fill-[var(--timeline-chip-bg)] stroke-[var(--timeline-chip-border)] transition-colors hover:fill-[var(--timeline-chip-hover)]"
                    : undefined
                }
                fill={canSelectMonths ? undefined : "var(--timeline-chip-bg)"}
                stroke={canSelectMonths ? undefined : "var(--timeline-chip-border)"}
              />
              <text
                x={(segment.x1 + segment.x2) / 2}
                y={axisY + 4}
                textAnchor="middle"
                fontSize={10}
                fill="var(--timeline-chip-text)"
              >
                {segment.label}
              </text>
            </g>
          ))}

        {effectiveZoomLevel === "months" &&
          layout.dayButtonSegments.map((segment) => (
            <g
              key={segment.key}
              role={canSelectDays ? "button" : undefined}
              tabIndex={canSelectDays ? 0 : undefined}
              className={canSelectDays ? "cursor-pointer" : undefined}
              aria-label={segment.label}
              onClick={() => {
                if (!canSelectDays) return;
                setFocusDate({
                  year: segment.year,
                  month: segment.month ?? 1,
                  day: segment.day ?? 1,
                });
                setZoomLevel("days");
              }}
              onKeyDown={(e) => {
                if (!canSelectDays) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setFocusDate({
                    year: segment.year,
                    month: segment.month ?? 1,
                    day: segment.day ?? 1,
                  });
                  setZoomLevel("days");
                }
              }}
            >
              <rect
                x={segment.x1}
                y={axisY - BAR_HEIGHT / 2}
                width={Math.max(1, segment.x2 - segment.x1)}
                height={BAR_HEIGHT}
                rx={4}
                className={
                  canSelectDays
                    ? "fill-[var(--timeline-chip-bg)] stroke-[var(--timeline-chip-border)] transition-colors hover:fill-[var(--timeline-chip-hover)]"
                    : undefined
                }
                fill={canSelectDays ? undefined : "var(--timeline-chip-bg)"}
                stroke={canSelectDays ? undefined : "var(--timeline-chip-border)"}
              />
              <text
                x={(segment.x1 + segment.x2) / 2}
                y={axisY + 4}
                textAnchor="middle"
                fontSize={10}
                fill="var(--timeline-chip-text)"
              >
                {segment.label}
              </text>
            </g>
          ))}

        {canSelectYears &&
          layout.yearBlocks.map((block) => (
            <g
              key={`year-hit-${block.year}`}
              role="button"
              tabIndex={0}
              className="cursor-pointer"
              aria-label={`${t("zoomLevelLabel.year1")} ${block.year}`}
              onClick={() => {
                setFocusDate({ year: block.year, month: 1, day: 1 });
                setZoomLevel("year1");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setFocusDate({ year: block.year, month: 1, day: 1 });
                  setZoomLevel("year1");
                }
              }}
            >
              <rect
                x={block.x1}
                y={axisY - BAR_HEIGHT / 2}
                width={Math.max(1, block.x2 - block.x1)}
                height={BAR_HEIGHT}
                rx={4}
                fill="transparent"
                stroke="transparent"
              />
            </g>
          ))}

        {showDayHourButtons &&
          layout.hourButtonSegments.map((segment) => (
            <g
              key={segment.key}
              role={canSelectHours ? "button" : undefined}
              tabIndex={canSelectHours ? 0 : undefined}
              className={canSelectHours ? "cursor-pointer" : undefined}
              aria-label={segment.label}
              onClick={() => {
                if (!canSelectHours) return;
                setZoomLevel("hours");
              }}
              onKeyDown={(e) => {
                if (!canSelectHours) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setZoomLevel("hours");
                }
              }}
            >
              <rect
                x={segment.x1}
                y={axisY - BAR_HEIGHT / 2}
                width={Math.max(1, segment.x2 - segment.x1)}
                height={BAR_HEIGHT}
                rx={4}
                className={
                  canSelectHours
                    ? "fill-[var(--timeline-chip-bg)] stroke-[var(--timeline-chip-border)] transition-colors hover:fill-[var(--timeline-chip-hover)]"
                    : undefined
                }
                fill={canSelectHours ? undefined : "var(--timeline-chip-bg)"}
                stroke={canSelectHours ? undefined : "var(--timeline-chip-border)"}
              />
              <text
                x={(segment.x1 + segment.x2) / 2}
                y={axisY + 4}
                textAnchor="middle"
                fontSize={10}
                fill="var(--timeline-chip-text)"
              >
                {segment.label}
              </text>
            </g>
          ))}

        {layout.monthTicks.map((x, idx) => (
          <line
            key={`month-tick-${idx}`}
            x1={x}
            y1={axisY - BAR_HEIGHT / 2 - 8}
            x2={x}
            y2={axisY - BAR_HEIGHT / 2 - 2}
            stroke="var(--timeline-tick)"
            strokeWidth={1}
          />
        ))}

        {zoomLevel !== "months" &&
          zoomLevel !== "days" &&
          layout.dayTicks.map((x, idx) => (
            <line
              key={`day-tick-${idx}`}
              x1={x}
              y1={axisY + 10}
              x2={x}
              y2={axisY + 16}
              stroke="var(--timeline-tick)"
              strokeWidth={1}
            />
          ))}

        {zoomLevel === "hours" &&
          layout.dayTicks.map((x, idx) => (
            <text
              key={`day-label-${idx}`}
              x={x}
              y={axisY + 30}
              textAnchor="middle"
              fill="var(--timeline-date)"
              fontSize={9}
              fontWeight={500}
            >
              {idx + 1}
            </text>
          ))}

        {zoomLevel !== "days" &&
          layout.hourTicks.map((tick, idx) => (
            <line
              key={`hour-tick-${idx}`}
              x1={tick.x}
              y1={axisY + 22}
              x2={tick.x}
              y2={axisY + 28}
              stroke="var(--timeline-tick)"
              strokeWidth={1}
            />
          ))}

        {zoomLevel === "hours" &&
          layout.hourTicks.map((tick, idx) => (
            <text
              key={`hour-label-${idx}`}
              x={tick.x}
              y={axisY + 42}
              textAnchor="middle"
              fill="var(--timeline-date)"
              fontSize={8}
              fontWeight={500}
            >
              {tick.label}
            </text>
          ))}

        {layout.breaks.map((brk, idx) => (
          <g key={`break-${idx}`}>
            <line
              x1={brk.x - 3}
              y1={axisY - BAR_HEIGHT / 2}
              x2={brk.x - 1}
              y2={axisY + BAR_HEIGHT / 2}
              stroke="var(--timeline-tick)"
              strokeWidth={1}
            />
            <line
              x1={brk.x + 1}
              y1={axisY - BAR_HEIGHT / 2}
              x2={brk.x + 3}
              y2={axisY + BAR_HEIGHT / 2}
              stroke="var(--timeline-tick)"
              strokeWidth={1}
            />
          </g>
        ))}

        {eventLinks.map((link) => {
          const fromItem = placedById.get(link.fromId);
          const toItem = placedById.get(link.toId);
          if (!fromItem || !toItem) return null;
          return (
            <TimelineEventLink
              key={`${link.fromId}-${link.toId}`}
              {...linkEdgeAnchors(fromItem, toItem)}
            />
          );
        })}

        {writingOrderHoverLinks.length > 0 ? (
          <g className="timeline-writing-order-hover-link">
            {writingOrderHoverLinks.map((link) => (
              <TimelineEventLink
                key={`${link.fromItem.id}-${link.toItem.id}`}
                highlighted
                {...linkEdgeAnchors(link.fromItem, link.toItem)}
              />
            ))}
          </g>
        ) : null}

        {placed.map((item) => (
          <TimelineEventStem
            key={`stem-${item.id}`}
            item={item}
            axisY={axisY}
            dayOnlyLabel={zoomLevel === "year1"}
            showDateLabels={
              showEventDateLabels &&
              zoomLevel !== "months" &&
              (zoomLevel !== "year1" || item.lane === "manuscript")
            }
          />
        ))}

        {placed.map((item) => (
          <TimelineChip
            key={`chip-${item.id}`}
            item={item}
            onOpen={openItem}
            highlighted={
              showWritingOrderHoverLink && hoveredTimelineMarkerId === item.id
            }
            onPointerEnter={
              item.kind === "file" && showWritingOrderHoverLink
                ? () => setHoveredTimelineMarkerId(item.id)
                : undefined
            }
            onPointerLeave={
              item.kind === "file" && showWritingOrderHoverLink
                ? () => setHoveredTimelineMarkerId(null)
                : undefined
            }
          />
        ))}
      </svg>
    </div>
  );
}
