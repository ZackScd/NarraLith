import { cn } from "@/lib/utils";
import {
  CHIP_TRUNC_EVENT,
  CHIP_TRUNC_FILE,
  CHIP_TRUNC_SIMPLE,
  truncateForChip,
} from "@/modules/timeline/timelineChipMetrics";
import type { TimelineDisplayItem } from "@/modules/timeline/timelineModel";
import type { PositionedItem } from "@/modules/timeline/timelineLayoutHelpers";

export const BAR_HEIGHT = 20;
export const MANUSCRIPT_LANE_STEP = 44;
export const BELOW_LANE_HEIGHT = 48;
export const BOX_HEIGHT = 28;
export const BOX_RX = 6;
export const STEM_WIDTH = 1.5;
export const STEM_LINE_SEGMENT = 8;
export const STEM_LABEL_STEP = 14;
export const STEM_DATE_STACK_HEIGHT =
  STEM_LINE_SEGMENT + STEM_LABEL_STEP + 4 + STEM_LABEL_STEP + STEM_LINE_SEGMENT;
export const MINIMIZED_PIN_RADIUS = 4;
export const MINIMIZED_MARKER_HEIGHT = 14;

const CHIP_PAD_Y = (BOX_HEIGHT - 11) / 2;
const CHIP_SECONDARY_SIZE = 10;
const CHIP_PRIMARY_SIZE = 11;
const CHIP_LINE_GAP = 4;
const X_EPS = 4;

export function chipHeight(item: Pick<TimelineDisplayItem, "eventLabel">): number {
  if (!item.eventLabel) return BOX_HEIGHT;
  return Math.round(
    CHIP_PAD_Y * 2 + CHIP_SECONDARY_SIZE + CHIP_LINE_GAP + CHIP_PRIMARY_SIZE,
  );
}

export function chipTextAnchors(itemY: number, dual: boolean) {
  if (!dual) {
    return { primaryY: itemY + BOX_HEIGHT / 2 + 4 };
  }
  const h = chipHeight({ eventLabel: "x" });
  return {
    secondaryY: itemY + CHIP_PAD_Y + CHIP_SECONDARY_SIZE - 1,
    primaryY: itemY + h - CHIP_PAD_Y - 2,
  };
}

function chipBounds(
  item: Pick<PositionedItem, "x" | "y" | "width" | "eventLabel">,
) {
  const h = chipHeight(item);
  const half = item.width / 2;
  return {
    left: item.x - half,
    right: item.x + half,
    top: item.y,
    bottom: item.y + h,
    midY: item.y + h / 2,
  };
}

function sameColumnAnchors(
  from: Pick<PositionedItem, "x" | "lane">,
  to: Pick<PositionedItem, "x" | "lane">,
  a: ReturnType<typeof chipBounds>,
  b: ReturnType<typeof chipBounds>,
) {
  if (from.lane === "manuscript") {
    return {
      from: { x: from.x, y: a.bottom },
      to: { x: to.x, y: b.top },
    };
  }
  return {
    from: { x: from.x, y: a.top },
    to: { x: to.x, y: b.bottom },
  };
}

export function linkEdgeAnchors(
  from: Pick<PositionedItem, "x" | "y" | "width" | "lane" | "eventLabel">,
  to: Pick<PositionedItem, "x" | "y" | "width" | "lane" | "eventLabel">,
): { from: { x: number; y: number }; to: { x: number; y: number } } {
  const a = chipBounds(from);
  const b = chipBounds(to);
  if (Math.abs(to.x - from.x) < X_EPS) {
    return sameColumnAnchors(from, to, a, b);
  }
  if (to.x > from.x) {
    return {
      from: { x: a.right, y: a.midY },
      to: { x: b.left, y: b.midY },
    };
  }
  return {
    from: { x: a.left, y: a.midY },
    to: { x: b.right, y: b.midY },
  };
}

export function TimelineEventStem({
  item,
  axisY,
  showDateLabels,
  dayOnlyLabel,
}: {
  item: PositionedItem;
  axisY: number;
  showDateLabels: boolean;
  dayOnlyLabel?: boolean;
}) {
  const barTop = axisY - BAR_HEIGHT / 2;
  const barBottom = axisY + BAR_HEIGHT / 2;
  const isManuscript = item.lane === "manuscript";
  const boxH = chipHeight(item);

  if (isManuscript) {
    const boxBottom = item.y + boxH;
    if (!showDateLabels) {
      return (
        <line
          x1={item.x}
          y1={boxBottom}
          x2={item.x}
          y2={barTop}
          stroke="var(--timeline-stem)"
          strokeWidth={STEM_WIDTH}
        />
      );
    }
    const labelY = (boxBottom + barTop) / 2 + 3;
    return (
      <g>
        <line
          x1={item.x}
          y1={boxBottom}
          x2={item.x}
          y2={labelY - 8}
          stroke="var(--timeline-stem)"
          strokeWidth={STEM_WIDTH}
        />
        <text
          x={item.x}
          y={labelY}
          textAnchor="middle"
          fill="var(--timeline-date)"
          fontSize={10}
          fontWeight={500}
        >
          {dayOnlyLabel ? item.day : `${item.month} - ${item.day}`}
        </text>
        <line
          x1={item.x}
          y1={labelY + 5}
          x2={item.x}
          y2={barTop}
          stroke="var(--timeline-stem)"
          strokeWidth={STEM_WIDTH}
        />
      </g>
    );
  }

  const eventBoxTop = item.y;
  if (!showDateLabels) {
    return (
      <line
        x1={item.x}
        y1={barBottom}
        x2={item.x}
        y2={eventBoxTop}
        stroke="var(--timeline-stem)"
        strokeWidth={STEM_WIDTH}
      />
    );
  }
  const labelY = (barBottom + eventBoxTop) / 2 + 3;
  return (
    <g>
      <line
        x1={item.x}
        y1={barBottom}
        x2={item.x}
        y2={labelY - 8}
        stroke="var(--timeline-stem)"
        strokeWidth={STEM_WIDTH}
      />
      <text
        x={item.x}
        y={labelY}
        textAnchor="middle"
        fill="var(--timeline-date)"
        fontSize={10}
        fontWeight={500}
      >
        {dayOnlyLabel ? item.day : `${item.month} - ${item.day}`}
      </text>
      <line
        x1={item.x}
        y1={labelY + 5}
        x2={item.x}
        y2={eventBoxTop}
        stroke="var(--timeline-stem)"
        strokeWidth={STEM_WIDTH}
      />
    </g>
  );
}

export function TimelineEventLink({
  from,
  to,
  highlighted = false,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  highlighted?: boolean;
}) {
  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke={highlighted ? "var(--primary)" : "var(--timeline-stem)"}
      strokeWidth={highlighted ? 2 : STEM_WIDTH}
      pointerEvents="none"
    />
  );
}

export function TimelineChip({
  item,
  onOpen,
  highlighted = false,
  onPointerEnter,
  onPointerLeave,
}: {
  item: PositionedItem;
  onOpen?: (item: TimelineDisplayItem) => void;
  highlighted?: boolean;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}) {
  const left = item.x - item.width / 2;
  const interactive = !!onOpen;
  const dual = !!item.eventLabel;
  const h = chipHeight(item);
  const anchors = chipTextAnchors(item.y, dual);

  return (
    <g
      className={interactive ? "cursor-pointer" : undefined}
      onClick={interactive ? () => onOpen!(item) : undefined}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen!(item);
              }
            }
          : undefined
      }
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={item.label}
    >
      <rect
        x={left}
        y={item.y}
        width={item.width}
        height={h}
        rx={BOX_RX}
        className={cn(
          highlighted
            ? "fill-[color-mix(in_oklch,var(--primary)_18%,var(--timeline-chip-bg))] stroke-[var(--primary)]"
            : "fill-[var(--timeline-chip-bg)] stroke-[var(--timeline-chip-border)] transition-colors hover:fill-[var(--timeline-chip-hover)]",
        )}
        strokeWidth={highlighted ? 2 : 1}
      />
      {dual && "secondaryY" in anchors ? (
        <>
          <text
            x={item.x}
            y={anchors.secondaryY}
            textAnchor="middle"
            fontSize={CHIP_SECONDARY_SIZE}
            fill="var(--timeline-date)"
            className="pointer-events-none"
          >
            {truncateForChip(item.fileLabel, CHIP_TRUNC_FILE)}
          </text>
          <text
            x={item.x}
            y={anchors.primaryY}
            textAnchor="middle"
            className={cn(
              "pointer-events-none text-[11px]",
              highlighted
                ? "fill-[var(--primary)] font-medium"
                : "fill-[var(--timeline-chip-text)] font-medium",
            )}
          >
            {truncateForChip(item.eventLabel!, CHIP_TRUNC_EVENT)}
          </text>
        </>
      ) : (
        <text
          x={item.x}
          y={anchors.primaryY}
          textAnchor="middle"
          className={cn(
            "pointer-events-none text-[11px]",
            highlighted
              ? "fill-[var(--primary)] font-medium"
              : "fill-[var(--timeline-chip-text)]",
          )}
        >
          {truncateForChip(item.label, CHIP_TRUNC_SIMPLE)}
        </text>
      )}
    </g>
  );
}

export function TimelineMinimizedMarker({
  item,
  axisY,
  onPointerEnter,
  onPointerLeave,
}: {
  item: PositionedItem;
  axisY: number;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}) {
  const barTop = axisY - BAR_HEIGHT / 2;
  const barBottom = axisY + BAR_HEIGHT / 2;
  const isManuscript = item.lane === "manuscript";
  const pinY = isManuscript
    ? item.y + MINIMIZED_PIN_RADIUS
    : item.y + MINIMIZED_MARKER_HEIGHT - MINIMIZED_PIN_RADIUS;
  const interactive = !!(onPointerEnter || onPointerLeave);

  return (
    <g
      aria-label={interactive ? item.label : undefined}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {interactive ? (
        <circle
          cx={item.x}
          cy={pinY}
          r={8}
          fill="transparent"
          className="cursor-default"
        />
      ) : null}
      <line
        x1={item.x}
        y1={isManuscript ? pinY : barBottom}
        x2={item.x}
        y2={isManuscript ? barTop : pinY}
        stroke="var(--timeline-stem)"
        strokeWidth={STEM_WIDTH}
        pointerEvents="none"
      />
      <circle
        cx={item.x}
        cy={pinY}
        r={MINIMIZED_PIN_RADIUS}
        fill="var(--timeline-chip-text)"
        pointerEvents="none"
      />
    </g>
  );
}

export function TimelineLabeledSegments({
  segments,
  axisY,
}: {
  segments: Array<{ key: string; label: string; x1: number; x2: number }>;
  axisY: number;
}) {
  return (
    <>
      {segments.map((segment) => (
        <g key={segment.key}>
          <rect
            x={segment.x1}
            y={axisY - BAR_HEIGHT / 2}
            width={Math.max(1, segment.x2 - segment.x1)}
            height={BAR_HEIGHT}
            rx={4}
            fill="var(--timeline-chip-bg)"
            stroke="var(--timeline-chip-border)"
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
    </>
  );
}

export function TimelineHourTicks({
  ticks,
  axisY,
}: {
  ticks: Array<{ x: number; label: number }>;
  axisY: number;
}) {
  return (
    <>
      {ticks.map((tick, idx) => (
        <g key={`hour-${idx}`}>
          <line
            x1={tick.x}
            y1={axisY - BAR_HEIGHT / 2 - 4}
            x2={tick.x}
            y2={axisY + BAR_HEIGHT / 2 + 4}
            stroke="var(--timeline-tick)"
            strokeWidth={1}
          />
          <text
            x={tick.x}
            y={axisY + BAR_HEIGHT / 2 + 14}
            textAnchor="middle"
            fill="var(--timeline-date)"
            fontSize={9}
            fontWeight={500}
          >
            {tick.label}
          </text>
        </g>
      ))}
    </>
  );
}

export function TimelineYearBlocks({
  yearBlocks,
  axisY,
}: {
  yearBlocks: Array<{ year: number; x1: number; x2: number }>;
  axisY: number;
}) {
  return (
    <>
      {yearBlocks.map((block) => (
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
          <text
            x={(block.x1 + block.x2) / 2}
            y={axisY + 4}
            textAnchor="middle"
            fontSize={10}
            fill="var(--timeline-chip-text)"
          >
            {block.year}
          </text>
        </g>
      ))}
    </>
  );
}

export function TimelineBreakGlyphs({
  breaks,
  axisY,
}: {
  breaks: Array<{ x: number }>;
  axisY: number;
}) {
  return (
    <>
      {breaks.map((brk, idx) => (
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
    </>
  );
}
