import { cn } from "@/lib/utils";

interface TimeEntryRowProps {
  color: string;
  label: string;
  subtitle?: string;
  onClick?: () => void;
}

export function TimeEntryRow({ color, label, subtitle, onClick }: TimeEntryRowProps) {
  const className = cn(
    "flex w-full items-start gap-2 rounded-md border border-border/60 bg-muted/20 px-2 py-1.5 text-left text-xs",
    onClick && "cursor-pointer hover:bg-muted/50",
  );

  const content = (
    <>
      <span
        className="mt-1 size-2 shrink-0 rounded-sm"
        style={{ backgroundColor: color }}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-foreground">{label}</span>
        {subtitle ? (
          <span className="text-[10px] text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
