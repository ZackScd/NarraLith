import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  effectiveCalendarForYear,
  fromAbsoluteDay,
  toAbsoluteDay,
} from "@/lib/calendar";
import { ALL_TIMELINE_FILTERS } from "@/lib/calendar/monthDayDisplay";
import { isStaleTimeTagStatus, staleTimeTagTooltipTitle } from "@/lib/calendar/timeTagUi";
import { timelineMarkerId } from "@/lib/calendar/timeMarks";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { TimelineEvent } from "@/lib/types/timeline";
import {
  TimelineBreakGlyphs,
  TimelineChip,
  TimelineEventStem,
  TimelineHourTicks,
  TimelineLabeledSegments,
  TimelineMinimizedMarker,
  TimelineYearBlocks,
  BAR_HEIGHT,
  BELOW_LANE_HEIGHT,
  MANUSCRIPT_LANE_STEP,
  MINIMIZED_MARKER_HEIGHT,
  MINIMIZED_PIN_RADIUS,
  STEM_DATE_STACK_HEIGHT,
  chipHeight,
} from "@/modules/timeline/timelineGraphics";
import {
  assignLanes,
  asSafeDay,
  buildCollapsedScale,
  buildCompactYearBarLayout,
  centeredXByDayInMonth,
  clamp,
  estimateCompactYearBarWidth,
  resolveMonthCount,
  resolveMonthLength,
  spreadDayGroupCenters,
  startOfMonth,
  startOfYear,
  type DatedTimelineEntry,
  type PositionedItem,
} from "@/modules/timeline/timelineLayoutHelpers";
import {
  CHIP_TRUNC_EVENT,
  CHIP_TRUNC_FILE,
  CHIP_TRUNC_SIMPLE,
  estimateChipWidth,
  truncateForChip,
} from "@/modules/timeline/timelineChipMetrics";
import {
  buildTimelineItems,
  fileDisplayName,
  isManuscriptPath,
  type TimelineDisplayItem,
} from "@/modules/timeline/timelineModel";
import type { TimeDraft } from "@/stores/useTimeTagDialogStore";
import { useCalendarStore } from "@/stores/useCalendarStore";
import i18n from "i18next";

export type MiniZoomLevel = "years" | "year1" | "months" | "days";

export const MINI_ZOOM_ORDER: MiniZoomLevel[] = ["years", "year1", "months", "days"];

const ZOOM_LABEL_KEY: Record<MiniZoomLevel, string> = {
  years: "all",
  year1: "year1",
  months: "months",
  days: "days",
};

const AXIS_MARGIN = 28;
const AXIS_Y_RATIO = 0.5;
const MIN_SVG_HEIGHT = 200;
const MINIMIZED_LANE_STEP = 12;
const MINIMIZED_MARKER_WIDTH = 8;
const PREVIEW_ITEM_ID = "__time-tag-preview__";
const NAV_BTN_SIZE = 24;
const NAV_BTN_INSET = 2;
const PAN_STEP = 80;

function useContainerWidth() {
  const [width, setWidth] = useState(488);
  const observerRef = useRef<ResizeObserver | null>(null);

  const setContainer = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;

    const update = () => setWidth(Math.max(320, node.clientWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    observerRef.current = ro;
  }, []);

  return { width, setContainer };
}

function computePreviewTime(
  draft: TimeDraft,
  calendar: CalendarConfig,
  safeDay: number,
  safeMonth: number,
): number {
  const dayBase = Number(
    toAbsoluteDay({ day: safeDay, month: safeMonth, year: draft.year }, calendar),
  );
  const hoursPerDay = Math.max(1, calendar.hoursPerDay);
  if (calendar.hoursEnabled && draft.hour !== null) {
    const hour = clamp(draft.hour, 0, hoursPerDay - 1);
    return dayBase + hour / hoursPerDay;
  }
  return dayBase + 0.5;
}

function isEditingBlock(
  item: TimelineDisplayItem,
  filePath: string | null,
  blockIndex: number | null,
): boolean {
  if (!filePath || blockIndex === null || item.kind !== "file") return false;
  return item.path === filePath && item.blockIndex === blockIndex;
}

function getPinY(item: PositionedItem): number {
  const isManuscript = item.lane === "manuscript";
  return isManuscript
    ? item.y + MINIMIZED_PIN_RADIUS
    : item.y + MINIMIZED_MARKER_HEIGHT - MINIMIZED_PIN_RADIUS;
}

function svgToClient(
  svg: SVGSVGElement,
  svgX: number,
  svgY: number,
  panOffset: number,
  viewWidth: number,
  viewHeight: number,
): { x: number; y: number } {
  const rect = svg.getBoundingClientRect();
  return {
    x: rect.left + ((svgX - panOffset) / viewWidth) * rect.width,
    y: rect.top + (svgY / viewHeight) * rect.height,
  };
}

function resolvePreviewEventContext(
  events: TimelineEvent[],
  filePath: string | null,
  blockIndex: number | null,
): { eventLabel: string | null; segmentId: string | null } {
  if (!filePath || blockIndex === null) {
    return { eventLabel: null, segmentId: null };
  }
  const match = events.find(
    (event) =>
      event.path === filePath &&
      event.blockIndex === blockIndex &&
      event.segmentId &&
      event.title?.trim(),
  );
  return {
    eventLabel: match?.title?.trim() ?? null,
    segmentId: match?.segmentId ?? null,
  };
}

function MiniTimelineHoverOverlay({
  item,
  svgRef,
  panOffset,
  viewWidth,
  viewHeight,
}: {
  item: PositionedItem;
  svgRef: RefObject<SVGSVGElement | null>;
  panOffset: number;
  viewWidth: number;
  viewHeight: number;
}) {
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const isManuscript = item.lane === "manuscript";
  const stale = isStaleTimeTagStatus(item.timeStatus);
  const chipWidth = estimateChipWidth(item);
  const dual = !!item.eventLabel;
  const chipBoxHeight = chipHeight(item);
  const tooltipTitle = stale
    ? staleTimeTagTooltipTitle(i18n.getFixedT(null, "editor"), item.timeStatus, item.rawTime)
    : undefined;
  const chipBorderClass = stale
    ? "border-[var(--destructive)] bg-[color-mix(in_oklch,var(--destructive)_12%,var(--timeline-chip-bg))]"
    : "border-[var(--timeline-chip-border)] bg-[var(--timeline-chip-bg)]";
  const fileTextClass = stale ? "text-[var(--destructive)]" : "text-[var(--timeline-date)]";
  const mainTextClass = stale
    ? "text-[var(--destructive)] font-medium"
    : "text-[var(--timeline-chip-text)]";

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      setAnchor(null);
      return;
    }
    const pinY = getPinY(item);
    setAnchor(svgToClient(svg, item.x, pinY, panOffset, viewWidth, viewHeight));
  }, [item, svgRef, panOffset, viewWidth, viewHeight]);

  if (!anchor || typeof document === "undefined") return null;

  const stemHeight = 10;

  return createPortal(
    <div
      className="pointer-events-none fixed z-[70] flex flex-col items-center"
      style={{
        left: anchor.x,
        ...(isManuscript
          ? { top: anchor.y, transform: "translate(-50%, -100%)" }
          : { top: anchor.y, transform: "translateX(-50%)" }),
      }}
      aria-hidden
      title={tooltipTitle}
    >
      {isManuscript ? (
        <>
          <div
            className={`flex flex-col items-center justify-center rounded-md border px-2 py-1 text-center shadow-md ${chipBorderClass}`}
            style={{ width: chipWidth, minWidth: chipWidth, minHeight: chipBoxHeight }}
          >
            {dual ? (
              <>
                <span className={`text-[10px] leading-tight ${fileTextClass}`}>
                  {truncateForChip(item.fileLabel, CHIP_TRUNC_FILE)}
                </span>
                <span className={`text-[11px] leading-tight ${mainTextClass}`}>
                  {truncateForChip(item.eventLabel!, CHIP_TRUNC_EVENT)}
                </span>
              </>
            ) : (
              <span className={`text-[11px] ${mainTextClass}`}>
                {truncateForChip(item.label, CHIP_TRUNC_SIMPLE)}
              </span>
            )}
          </div>
          <div
            className="shrink-0 bg-[var(--timeline-stem)]"
            style={{ width: 1.5, height: stemHeight }}
          />
        </>
      ) : (
        <>
          <div
            className="shrink-0 bg-[var(--timeline-stem)]"
            style={{ width: 1.5, height: stemHeight }}
          />
          <div
            className={`flex flex-col items-center justify-center rounded-md border px-2 py-1 text-center shadow-md ${chipBorderClass}`}
            style={{ width: chipWidth, minWidth: chipWidth, minHeight: chipBoxHeight }}
          >
            {dual ? (
              <>
                <span className={`text-[10px] leading-tight ${fileTextClass}`}>
                  {truncateForChip(item.fileLabel, CHIP_TRUNC_FILE)}
                </span>
                <span className={`text-[11px] leading-tight ${mainTextClass}`}>
                  {truncateForChip(item.eventLabel!, CHIP_TRUNC_EVENT)}
                </span>
              </>
            ) : (
              <span className={`text-[11px] ${mainTextClass}`}>
                {truncateForChip(item.label, CHIP_TRUNC_SIMPLE)}
              </span>
            )}
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}

interface MiniTimelineLayout {
  axisY: number;
  zoomLevel: MiniZoomLevel;
  yearBlocks: Array<{ year: number; x1: number; x2: number }>;
  labeledSegments: Array<{ key: string; label: string; x1: number; x2: number }>;
  hourTicks: Array<{ x: number; label: number }>;
  breaks: Array<{ x: number }>;
  placedMinimized: PositionedItem[];
  placedPreview: PositionedItem;
  svgHeight: number;
  layoutWidth: number;
  previewX: number;
  hasExistingEvents: boolean;
}

function MiniTimelinePanViewport({
  autoCenter,
  maxPan,
  width,
  layout,
  viewportKey,
  ariaLabel,
  moveLeftLabel,
  moveRightLabel,
}: {
  autoCenter: number;
  maxPan: number;
  width: number;
  layout: MiniTimelineLayout;
  viewportKey: string;
  ariaLabel: string;
  moveLeftLabel: string;
  moveRightLabel: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [panNudge, setPanNudge] = useState(0);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const panOffset = clamp(autoCenter + panNudge, 0, maxPan);
  const hoveredItem =
    hoveredItemId === null
      ? null
      : (layout.placedMinimized.find((item) => item.id === hoveredItemId) ?? null);
  const canPan = layout.layoutWidth > width;
  const canPanLeft = panOffset > 0;
  const canPanRight = panOffset < maxPan;

  const pan = (direction: -1 | 1) => {
    setPanNudge((prev) => {
      const next = clamp(autoCenter + prev + direction * PAN_STEP, 0, maxPan);
      return next - autoCenter;
    });
  };

  const axisYPercent = (layout.axisY / layout.svgHeight) * 100;
  const navBtnStyle = {
    top: `${axisYPercent}%`,
    width: NAV_BTN_SIZE,
    height: NAV_BTN_SIZE,
    transform: "translateY(-50%)",
  } as const;

  return (
    <div className="relative overflow-hidden rounded-md bg-[var(--timeline-canvas)]">
      {canPan ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute z-10 size-6 p-0"
            style={{ ...navBtnStyle, left: NAV_BTN_INSET }}
            aria-label={moveLeftLabel}
            disabled={!canPanLeft}
            onClick={() => pan(-1)}
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute z-10 size-6 p-0"
            style={{ ...navBtnStyle, right: NAV_BTN_INSET }}
            aria-label={moveRightLabel}
            disabled={!canPanRight}
            onClick={() => pan(1)}
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </>
      ) : null}
      <svg
        ref={svgRef}
        key={viewportKey}
        width="100%"
        height={layout.svgHeight}
        viewBox={`${panOffset} 0 ${width} ${layout.svgHeight}`}
        className="block select-none"
        role="img"
        aria-label={ariaLabel}
      >
        {layout.zoomLevel === "years" ? (
          <TimelineYearBlocks yearBlocks={layout.yearBlocks} axisY={layout.axisY} />
        ) : layout.labeledSegments.length > 0 ? (
          <TimelineLabeledSegments
            segments={layout.labeledSegments}
            axisY={layout.axisY}
          />
        ) : null}

        {layout.zoomLevel === "days" && layout.hourTicks.length > 0 ? (
          <TimelineHourTicks ticks={layout.hourTicks} axisY={layout.axisY} />
        ) : null}

        <TimelineBreakGlyphs breaks={layout.breaks} axisY={layout.axisY} />

        {layout.placedMinimized.map((item) => (
          <TimelineMinimizedMarker
            key={item.id}
            item={item}
            axisY={layout.axisY}
            onPointerEnter={() => setHoveredItemId(item.id)}
            onPointerLeave={() => setHoveredItemId(null)}
          />
        ))}

        <TimelineEventStem
          item={layout.placedPreview}
          axisY={layout.axisY}
          showDateLabels={false}
        />
        <TimelineChip item={layout.placedPreview} highlighted />
      </svg>
      {hoveredItem ? (
        <MiniTimelineHoverOverlay
          item={hoveredItem}
          svgRef={svgRef}
          panOffset={panOffset}
          viewWidth={width}
          viewHeight={layout.svgHeight}
        />
      ) : null}
    </div>
  );
}

export interface TimeTagMiniTimelineProps {
  calendar: CalendarConfig;
  events: TimelineEvent[];
  draft: TimeDraft;
  safeDay: number;
  safeMonth: number;
  filePath: string | null;
  blockIndex: number | null;
  zoomLevel: MiniZoomLevel;
}

export function TimeTagMiniTimeline({
  calendar,
  events,
  draft,
  safeDay,
  safeMonth,
  filePath,
  blockIndex,
  zoomLevel,
}: TimeTagMiniTimelineProps) {
  const { t } = useTranslation("editor");
  const { t: tTimeline } = useTranslation("timeline");
  const baselineConfig = useCalendarStore((s) => s.baselineConfig);
  const { width, setContainer } = useContainerWidth();

  const previewTime = useMemo(
    () => computePreviewTime(draft, calendar, safeDay, safeMonth),
    [draft, calendar, safeDay, safeMonth],
  );

  const previewParts = useMemo(
    () => fromAbsoluteDay(BigInt(Math.floor(previewTime)), calendar),
    [previewTime, calendar],
  );

  const layout = useMemo((): MiniTimelineLayout => {
    const items = buildTimelineItems(
      events,
      calendar,
      ALL_TIMELINE_FILTERS,
      baselineConfig,
    ).filter(
      (item) => !isEditingBlock(item, filePath, blockIndex),
    );

    const eventHours = new Map<string, number>();
    for (const event of events) {
      if (event.timeHour === null || event.timeHour === undefined) continue;
      eventHours.set(timelineMarkerId(event), event.timeHour);
    }

    const hoursPerDay = Math.max(1, calendar.hoursPerDay);
    const itemsWithDate: DatedTimelineEntry[] = items
      .map((item) => {
        const day = asSafeDay(item.sortKey);
        if (day === null) return null;
        const parts = fromAbsoluteDay(item.sortKey, calendar);
        const hour = eventHours.get(item.id);
        const hourFrac =
          calendar.hoursEnabled !== false && hour !== undefined
            ? clamp(hour, 0, hoursPerDay - 1) / hoursPerDay
            : 0;
        return { item, parts, time: day + hourFrac };
      })
      .filter((entry): entry is DatedTimelineEntry => entry !== null);

    const focusYear = previewParts.year;
    const focusMonth = previewParts.month;
    const focusDay = previewParts.day;

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

    const yearsForBar = [...new Set([...activeYearSequence, focusYear])].sort(
      (a, b) => a - b,
    );
    const activeYearsSet = new Set(yearsForBar);

    const lineLeft = AXIS_MARGIN;
    let visibleMin: number;
    let visibleMax: number;
    let layoutWidth: number;
    let lineRight: number;
    let yearBlocks: MiniTimelineLayout["yearBlocks"] = [];
    let breaks: MiniTimelineLayout["breaks"];
    let labeledSegments: MiniTimelineLayout["labeledSegments"];
    let hourTicks: MiniTimelineLayout["hourTicks"];
    let toXForEntry: (entry: DatedTimelineEntry) => number;

    if (zoomLevel === "years") {
      const minYear = yearsForBar[0] ?? focusYear;
      const maxYear = yearsForBar[yearsForBar.length - 1] ?? focusYear;
      visibleMin = startOfYear(minYear, calendar);
      visibleMax = startOfYear(maxYear + 1, calendar);

      const activeYearsList = yearsForBar.filter((y) => {
        const yearStart = startOfYear(y, calendar);
        const yearEnd = startOfYear(y + 1, calendar);
        return yearEnd > visibleMin && yearStart < visibleMax;
      });

      const naturalBarWidth = estimateCompactYearBarWidth(activeYearsList);
      layoutWidth = Math.max(width, naturalBarWidth + 2 * AXIS_MARGIN);
      lineRight = layoutWidth - AXIS_MARGIN;

      const compactYearBar =
        activeYearsList.length > 0
          ? buildCompactYearBarLayout(activeYearsList, lineLeft, lineRight, calendar)
          : null;

      yearBlocks =
        compactYearBar?.segments.map((seg) => ({
          year: seg.year,
          x1: seg.x1,
          x2: seg.x2,
        })) ?? [];
      breaks = compactYearBar?.breaks ?? [];

      labeledSegments = [];
      hourTicks = [];
      toXForEntry = (entry) =>
        compactYearBar ? compactYearBar.toX(entry.time, entry.parts.year) : lineLeft;
    } else if (zoomLevel === "year1") {
      visibleMin = startOfYear(focusYear, calendar);
      visibleMax = startOfYear(focusYear + 1, calendar);
      layoutWidth = width;
      lineRight = width - AXIS_MARGIN;

      const scale = buildCollapsedScale(
        visibleMin,
        visibleMax,
        [],
        lineLeft,
        lineRight,
        false,
      );
      const toX = (time: number) => scale.toX(time);
      breaks = scale.breaks;

      const monthCount = resolveMonthCount(focusYear, calendar);
      const monthsMeta = effectiveCalendarForYear(focusYear, calendar).months;
      labeledSegments = Array.from({ length: monthCount }, (_, idx) => {
        const m = idx + 1;
        const from = startOfMonth(focusYear, m, calendar);
        const to =
          m < monthCount
            ? startOfMonth(focusYear, m + 1, calendar)
            : startOfYear(focusYear + 1, calendar);
        return {
          key: `month-${focusYear}-${m}`,
          label: monthsMeta[m - 1]?.name ?? String(m),
          x1: toX(Math.max(visibleMin, from)),
          x2: toX(Math.min(visibleMax, to)),
        };
      });
      hourTicks = [];

      toXForEntry = (entry) => toX(entry.time);
    } else if (zoomLevel === "months") {
      visibleMin = startOfMonth(focusYear, focusMonth, calendar);
      visibleMax = visibleMin + resolveMonthLength(focusYear, focusMonth, calendar);
      layoutWidth = width;
      lineRight = width - AXIS_MARGIN;

      const scale = buildCollapsedScale(
        visibleMin,
        visibleMax,
        [],
        lineLeft,
        lineRight,
        false,
      );
      const toX = (time: number) => scale.toX(time);
      breaks = scale.breaks;

      const monthLen = resolveMonthLength(focusYear, focusMonth, calendar);
      const monthStart = startOfMonth(focusYear, focusMonth, calendar);
      labeledSegments = Array.from({ length: monthLen }, (_, idx) => {
        const d = idx + 1;
        const from = monthStart + (d - 1);
        const to = from + 1;
        return {
          key: `day-${focusYear}-${focusMonth}-${d}`,
          label: String(d),
          x1: toX(from),
          x2: toX(to),
        };
      });
      hourTicks = [];

      const visibleInMonth = itemsWithDate.filter(
        (e) => e.time >= visibleMin && e.time < visibleMax,
      );
      const centeredX = centeredXByDayInMonth(visibleInMonth, toX, calendar);
      toXForEntry = (entry) => centeredX.get(entry.item.id) ?? toX(entry.time);
    } else {
      visibleMin = Number(
        toAbsoluteDay({ day: focusDay, month: focusMonth, year: focusYear }, calendar),
      );
      visibleMax = visibleMin + 1;
      layoutWidth = width;
      lineRight = width - AXIS_MARGIN;

      const scale = buildCollapsedScale(
        visibleMin,
        visibleMax,
        [],
        lineLeft,
        lineRight,
        false,
      );
      const toX = (time: number) => scale.toX(time);
      breaks = scale.breaks;

      labeledSegments = [
        {
          key: `day-${focusYear}-${focusMonth}-${focusDay}`,
          label: String(focusDay),
          x1: toX(visibleMin),
          x2: toX(visibleMax),
        },
      ];

      hourTicks =
        calendar.hoursEnabled !== false
          ? Array.from({ length: hoursPerDay }, (_, h) => ({
              x: toX(visibleMin + (h + 0.5) / hoursPerDay),
              label: h + 1,
            }))
          : [];

      const visibleInDay = itemsWithDate.filter(
        (e) => e.time >= visibleMin && e.time < visibleMax,
      );

      if (calendar.hoursEnabled === false) {
        const centeredX = spreadDayGroupCenters(visibleInDay, toX, calendar);
        toXForEntry = (entry) => centeredX.get(entry.item.id) ?? toX(entry.time);
      } else {
        toXForEntry = (entry) => toX(entry.time);
      }
    }

    const axisY = MIN_SVG_HEIGHT * AXIS_Y_RATIO;
    const barTop = axisY - BAR_HEIGHT / 2;
    const barBottom = axisY + BAR_HEIGHT / 2;

    const insertLabel = filePath
      ? fileDisplayName(filePath)
      : i18n.getFixedT(null, "editor")("panel.timeAddCta");
    const insertLane: "manuscript" | "below" =
      filePath && isManuscriptPath(filePath) ? "manuscript" : "below";
    const { eventLabel: previewEventLabel, segmentId: previewSegmentId } =
      resolvePreviewEventContext(events, filePath, blockIndex);
    const previewFileLabel = insertLabel;
    const previewAriaLabel = previewEventLabel
      ? `${previewEventLabel} (${previewFileLabel})`
      : previewFileLabel;

    const previewItem: TimelineDisplayItem = {
      id: PREVIEW_ITEM_ID,
      kind: "file",
      label: previewAriaLabel,
      fileLabel: previewFileLabel,
      eventLabel: previewEventLabel,
      segmentId: previewSegmentId,
      sortKey: toAbsoluteDay(
        { day: safeDay, month: safeMonth, year: draft.year },
        calendar,
      ),
      timeStatus: "valid",
      rawTime: "",
      path: filePath ?? undefined,
      blockIndex: blockIndex ?? undefined,
      lane: insertLane,
    };

    const previewEntry: DatedTimelineEntry = {
      item: previewItem,
      parts: previewParts,
      time: previewTime,
    };
    const previewX = toXForEntry(previewEntry);

    const minimizedManuscript: PositionedItem[] = [];
    const minimizedBelow: PositionedItem[] = [];

    for (const entry of itemsWithDate) {
      if (entry.time < visibleMin || entry.time > visibleMax) continue;
      if (zoomLevel === "years" && !activeYearsSet.has(entry.parts.year)) continue;

      const base: PositionedItem = {
        ...entry.item,
        x: toXForEntry(entry),
        y: axisY,
        width: MINIMIZED_MARKER_WIDTH,
        day: entry.parts.day,
        month: entry.parts.month,
        year: entry.parts.year,
      };
      if (entry.item.lane === "manuscript") minimizedManuscript.push(base);
      else minimizedBelow.push(base);
    }

    const previewRaw: PositionedItem = {
      ...previewItem,
      x: previewX,
      y: axisY,
      width: estimateChipWidth(previewItem),
      day: previewParts.day,
      month: previewParts.month,
      year: previewParts.year,
    };

    const previewChipH = chipHeight(previewRaw);

    const previewLanes = assignLanes([previewRaw]);
    const manuscriptMinLanes = assignLanes(minimizedManuscript);
    const belowMinLanes = assignLanes(minimizedBelow);

    const placedMinimized: PositionedItem[] = [
      ...minimizedManuscript.map((item) => {
        const lane = manuscriptMinLanes.get(item.id) ?? 0;
        return {
          ...item,
          y: barTop - MINIMIZED_MARKER_HEIGHT - lane * MINIMIZED_LANE_STEP,
        };
      }),
      ...minimizedBelow.map((item) => {
        const lane = belowMinLanes.get(item.id) ?? 0;
        return {
          ...item,
          y: barBottom + lane * MINIMIZED_LANE_STEP,
        };
      }),
    ];

    const previewLane = previewLanes.get(PREVIEW_ITEM_ID) ?? 0;
    const placedPreview: PositionedItem =
      previewRaw.lane === "manuscript"
        ? {
            ...previewRaw,
            y:
              barTop -
              previewChipH -
              STEM_DATE_STACK_HEIGHT -
              previewLane * MANUSCRIPT_LANE_STEP,
          }
        : {
            ...previewRaw,
            y: barBottom + STEM_DATE_STACK_HEIGHT + previewLane * BELOW_LANE_HEIGHT,
          };

    const manuscriptTops = placedMinimized
      .filter((i) => i.lane === "manuscript")
      .map((i) => i.y);
    const belowBottoms = placedMinimized
      .filter((i) => i.lane === "below")
      .map((i) => i.y + MINIMIZED_MARKER_HEIGHT);

    const topExtent = Math.min(
      placedPreview.y,
      ...manuscriptTops,
      barTop - previewChipH - STEM_DATE_STACK_HEIGHT,
    );
    const bottomExtent = Math.max(
      placedPreview.y + previewChipH,
      ...belowBottoms,
      barBottom + MINIMIZED_MARKER_HEIGHT,
      axisY + BAR_HEIGHT / 2 + (hourTicks.length > 0 ? 20 : 0),
    );

    const svgHeight = Math.max(MIN_SVG_HEIGHT, bottomExtent - topExtent + 24);

    return {
      axisY,
      zoomLevel,
      yearBlocks,
      labeledSegments,
      hourTicks,
      breaks,
      placedMinimized,
      placedPreview,
      hasExistingEvents: itemsWithDate.length > 0,
      svgHeight,
      layoutWidth,
      previewX,
    };
  }, [
    baselineConfig,
    calendar,
    events,
    previewTime,
    previewParts,
    filePath,
    blockIndex,
    draft.year,
    safeDay,
    safeMonth,
    width,
    zoomLevel,
  ]);

  const maxPan = Math.max(0, layout.layoutWidth - width);
  const autoCenter = clamp(layout.previewX - width / 2, 0, maxPan);

  return (
    <div ref={setContainer} className="w-full" style={{ minHeight: MIN_SVG_HEIGHT }}>
      {!layout.hasExistingEvents ? (
        <p className="mb-2 text-center text-[10px] text-muted-foreground">
          {t("panel.timeMiniEmpty")}
        </p>
      ) : null}
      <MiniTimelinePanViewport
        key={`${previewTime}-${zoomLevel}`}
        viewportKey={`${previewTime}-${zoomLevel}`}
        autoCenter={autoCenter}
        maxPan={maxPan}
        width={width}
        layout={layout}
        ariaLabel={t("panel.timeMiniTitle")}
        moveLeftLabel={tTimeline("controls.moveLeft")}
        moveRightLabel={tTimeline("controls.moveRight")}
      />
    </div>
  );
}

export function miniZoomLabel(
  zoomLevel: MiniZoomLevel,
  tTimeline: (key: string) => string,
): string {
  return tTimeline(`zoomLevelLabel.${ZOOM_LABEL_KEY[zoomLevel]}`);
}
