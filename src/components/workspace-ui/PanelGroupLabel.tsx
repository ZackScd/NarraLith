import { cn } from "@/lib/utils";

interface PanelGroupLabelProps {
  children: string;
  className?: string;
}

export function PanelGroupLabel({ children, className }: PanelGroupLabelProps) {
  return (
    <p
      className={cn(
        "px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}
