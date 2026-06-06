import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface MiniMonthGridFrameProps {
  monthName?: string;
  weekdayLabels: string[];
  daysPerWeek: number;
  children: ReactNode;
  compact?: boolean;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  prevMonthAriaLabel?: string;
  nextMonthAriaLabel?: string;
}

export function MiniMonthGridFrame({
  monthName,
  weekdayLabels,
  daysPerWeek,
  children,
  compact = false,
  onPrevMonth,
  onNextMonth,
  prevMonthAriaLabel,
  nextMonthAriaLabel,
}: MiniMonthGridFrameProps) {
  const headerTextClass = compact ? "text-[10px]" : "text-sm";
  const weekdayClass = compact ? "text-[10px]" : "text-[10px]";
  const showMonthNav = Boolean(onPrevMonth ?? onNextMonth);

  return (
    <>
      {monthName ? (
        <div
          className={`mb-2 flex items-center gap-0.5 rounded-md border border-border/70 bg-muted/20 px-1 py-0.5 ${showMonthNav ? "" : "px-2 py-1"}`}
        >
          {onPrevMonth ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={onPrevMonth}
              aria-label={prevMonthAriaLabel}
              title={prevMonthAriaLabel}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
          ) : showMonthNav ? (
            <span className="size-7 shrink-0" aria-hidden />
          ) : null}
          <span
            className={`min-w-0 flex-1 truncate text-center font-medium ${headerTextClass}`}
          >
            {monthName}
          </span>
          {onNextMonth ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={onNextMonth}
              aria-label={nextMonthAriaLabel}
              title={nextMonthAriaLabel}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          ) : showMonthNav ? (
            <span className="size-7 shrink-0" aria-hidden />
          ) : null}
        </div>
      ) : null}
      <div
        className={`mb-2 grid gap-0.5 rounded-md border border-border/60 bg-muted/15 p-1 text-center text-muted-foreground ${weekdayClass}`}
        style={{
          gridTemplateColumns: `repeat(${daysPerWeek}, minmax(0, 1fr))`,
        }}
      >
        {weekdayLabels.map((label, idx) => (
          <span key={`weekday-h-${idx}`} className="py-0.5 font-medium">
            {label}
          </span>
        ))}
      </div>
      <div
        className="grid gap-0.5 rounded-md border border-border/60 bg-background/40 p-1 text-center"
        style={{
          gridTemplateColumns: `repeat(${daysPerWeek}, minmax(0, 1fr))`,
        }}
      >
        {children}
      </div>
    </>
  );
}
