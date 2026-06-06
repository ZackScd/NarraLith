import type { ReactNode } from "react";

interface CalendarYearHeaderProps {
  yearLabel: string;
  controls: ReactNode;
  yearStrip: ReactNode;
}

export function CalendarYearHeader({
  yearLabel,
  controls,
  yearStrip,
}: CalendarYearHeaderProps) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-base font-semibold leading-none text-foreground">
        {yearLabel}
      </span>
      {controls}
      <span className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden />
      {yearStrip}
    </div>
  );
}
