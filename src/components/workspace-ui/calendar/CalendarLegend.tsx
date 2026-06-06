import { cn } from "@/lib/utils";

export interface CalendarLegendItem {
  id: string;
  label: string;
  color: string;
}

interface CalendarLegendProps {
  items: CalendarLegendItem[];
  className?: string;
}

export function CalendarLegend({ items, className }: CalendarLegendProps) {
  return (
    <ul
      className={cn(
        "flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground",
        className,
      )}
    >
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-1.5">
          <span
            className="size-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
