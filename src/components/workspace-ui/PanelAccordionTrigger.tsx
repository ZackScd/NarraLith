import { ChevronDown, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

interface PanelAccordionTriggerProps {
  expanded: boolean;
  onToggle: () => void;
  label: string;
  dirtyIndicator?: ReactNode;
  className?: string;
}

export function PanelAccordionTrigger({
  expanded,
  onToggle,
  label,
  dirtyIndicator,
  className,
}: PanelAccordionTriggerProps) {
  return (
    <button
      type="button"
      className={
        className ??
        "mt-4 flex w-full items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-2 text-left text-xs font-medium"
      }
      onClick={onToggle}
    >
      {expanded ? (
        <ChevronDown className="size-3.5 shrink-0" />
      ) : (
        <ChevronRight className="size-3.5 shrink-0" />
      )}
      {label}
      {dirtyIndicator}
    </button>
  );
}
