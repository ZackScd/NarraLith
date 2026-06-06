import { BREAK_DRAW } from "@/modules/timeline/timelineScale";

/** Marca visual de tiempo muerto colapsado: | | */
export function TimelineAxisBreak({ x, axisY }: { x: number; axisY: number }) {
  const { barGap, barHeight } = BREAK_DRAW;
  const half = barHeight / 2;
  return (
    <g aria-hidden>
      <line
        x1={x - barGap}
        y1={axisY - half}
        x2={x - barGap}
        y2={axisY + half}
        stroke="var(--timeline-axis)"
        strokeWidth={2}
      />
      <line
        x1={x + barGap}
        y1={axisY - half}
        x2={x + barGap}
        y2={axisY + half}
        stroke="var(--timeline-axis)"
        strokeWidth={2}
      />
    </g>
  );
}
