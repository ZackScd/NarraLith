import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface MonthDetailDayCellProps {
  day: number;
  selected: boolean;
  highlighted?: boolean;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  onSelect: () => void;
  children?: ReactNode;
}

export function MonthDetailDayCell({
  day,
  selected,
  highlighted,
  className,
  style,
  title,
  onSelect,
  children,
}: MonthDetailDayCellProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex min-h-[4.5rem] flex-col rounded-md border p-1.5 text-left transition-colors",
        selected
          ? "border-primary ring-1 ring-primary/40"
          : "border-border/60 hover:border-border",
        highlighted ? "bg-card" : "bg-muted/10",
        className,
      )}
      style={style}
      title={title}
    >
      <span
        className={cn(
          "text-[11px] font-semibold",
          highlighted ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {day}
      </span>
      {children}
    </button>
  );
}
