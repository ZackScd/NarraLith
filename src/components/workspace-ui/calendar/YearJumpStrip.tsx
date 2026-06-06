import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const YEAR_SCROLL_STEP_PX = 60;

interface YearJumpStripProps {
  years: number[];
  activeYear: number;
  onSelectYear: (year: number) => void;
  getYearAriaLabel: (year: number) => string;
  scrollBackAriaLabel: string;
  scrollForwardAriaLabel: string;
}

type YearTooltipAnchor = { left: number; top: number; year: number };

function YearSquare({
  year,
  activeYear,
  onSelectYear,
  onHoverAnchor,
  getYearAriaLabel,
}: {
  year: number;
  activeYear: number;
  onSelectYear: (year: number) => void;
  onHoverAnchor: (anchor: YearTooltipAnchor | null) => void;
  getYearAriaLabel: (year: number) => string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const showTooltip = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    onHoverAnchor({
      left: rect.left + rect.width / 2,
      top: rect.bottom + 4,
      year,
    });
  };

  return (
    <div className="shrink-0">
      <button
        ref={buttonRef}
        type="button"
        data-year={year}
        className={cn(
          "size-4 rounded-sm border border-border transition-colors",
          year === activeYear ? "bg-primary/80" : "bg-muted hover:bg-muted/80",
        )}
        onMouseEnter={showTooltip}
        onMouseLeave={() => onHoverAnchor(null)}
        onFocus={showTooltip}
        onBlur={() => onHoverAnchor(null)}
        onClick={() => onSelectYear(year)}
        aria-label={getYearAriaLabel(year)}
      />
    </div>
  );
}

export function YearJumpStrip({
  years,
  activeYear,
  onSelectYear,
  getYearAriaLabel,
  scrollBackAriaLabel,
  scrollForwardAriaLabel,
}: YearJumpStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState<YearTooltipAnchor | null>(null);
  const [overflows, setOverflows] = useState(false);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  const updateOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 1;
    setOverflows(hasOverflow);
    setCanScrollBack(el.scrollLeft > 0);
    setCanScrollForward(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateOverflow();
    const ro = new ResizeObserver(updateOverflow);
    ro.observe(el);
    el.addEventListener("scroll", updateOverflow, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateOverflow);
    };
  }, [years, updateOverflow]);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      updateOverflow();
      const activeBtn = scrollRef.current?.querySelector<HTMLElement>(
        `[data-year="${activeYear}"]`,
      );
      activeBtn?.scrollIntoView({ inline: "nearest", block: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [years, activeYear, updateOverflow]);

  const scrollStrip = (direction: -1 | 1) => {
    scrollRef.current?.scrollBy({
      left: direction * YEAR_SCROLL_STEP_PX,
      behavior: "smooth",
    });
  };

  const yearButtons = years.map((y) => (
    <YearSquare
      key={y}
      year={y}
      activeYear={activeYear}
      onSelectYear={onSelectYear}
      onHoverAnchor={setTooltipAnchor}
      getYearAriaLabel={getYearAriaLabel}
    />
  ));

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      {overflows ? (
        <button
          type="button"
          className="flex size-4 shrink-0 items-center justify-center rounded-sm border border-border bg-muted hover:bg-muted/80 disabled:opacity-40"
          onClick={() => scrollStrip(-1)}
          disabled={!canScrollBack}
          aria-label={scrollBackAriaLabel}
        >
          <ChevronLeft className="size-3" />
        </button>
      ) : null}
      <div
        ref={scrollRef}
        className={cn(
          "min-w-0 py-0.5",
          overflows
            ? "flex-1 overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "overflow-x-hidden overflow-y-hidden",
        )}
      >
        <div className="flex w-max items-center gap-1">{yearButtons}</div>
      </div>
      {overflows ? (
        <button
          type="button"
          className="flex size-4 shrink-0 items-center justify-center rounded-sm border border-border bg-muted hover:bg-muted/80 disabled:opacity-40"
          onClick={() => scrollStrip(1)}
          disabled={!canScrollForward}
          aria-label={scrollForwardAriaLabel}
        >
          <ChevronRight className="size-3" />
        </button>
      ) : null}
      {tooltipAnchor ? (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 whitespace-nowrap rounded border border-border bg-popover px-2 py-0.5 text-[10px] font-medium text-foreground shadow-md"
          style={{ left: tooltipAnchor.left, top: tooltipAnchor.top }}
        >
          {tooltipAnchor.year}
        </div>
      ) : null}
    </div>
  );
}
