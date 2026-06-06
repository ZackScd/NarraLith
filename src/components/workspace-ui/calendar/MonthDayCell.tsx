import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

interface MonthDayCellProps {
  day: number;
  highlighted?: boolean;
  style?: CSSProperties;
  title?: string;
  selected?: boolean;
  onSelect?: () => void;
}

export function MonthDayCell({
  day,
  highlighted = false,
  style,
  title,
  selected = false,
  onSelect,
}: MonthDayCellProps) {
  const className = cn(
    "flex aspect-square items-center justify-center rounded text-[11px]",
    highlighted ? "font-medium text-foreground" : "text-muted-foreground",
    selected && "border border-primary ring-1 ring-primary/40",
    onSelect && "cursor-pointer transition-colors hover:ring-1 hover:ring-primary/30",
  );

  if (onSelect) {
    return (
      <button
        type="button"
        className={className}
        style={style}
        title={title}
        onClick={onSelect}
      >
        {day}
      </button>
    );
  }

  return (
    <span className={className} style={style} title={title}>
      {day}
    </span>
  );
}
