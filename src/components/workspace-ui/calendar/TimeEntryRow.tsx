import { cn } from "@/lib/utils";

interface TimeEntryRowProps {
  color: string;
  label: string;
  subtitle?: string;
  onClick?: () => void;
  stale?: boolean;
  title?: string;
}

export function TimeEntryRow({
  color,
  label,
  subtitle,
  onClick,
  stale = false,
  title,
}: TimeEntryRowProps) {
  const className = cn(
    "flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left text-xs",
    stale
      ? "border-destructive/50 bg-destructive/5 hover:bg-destructive/10"
      : "border-border/60 bg-muted/20",
    onClick && "cursor-pointer",
    onClick && !stale && "hover:bg-muted/50",
  );

  const content = (
    <>
      <span
        className="mt-1 size-2 shrink-0 rounded-sm"
        style={{ backgroundColor: stale ? "var(--destructive)" : color }}
      />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate font-medium",
            stale ? "text-destructive" : "text-foreground",
          )}
        >
          {label}
        </span>
        {subtitle ? (
          <span
            className={cn(
              "text-[10px]",
              stale ? "text-destructive/80" : "text-muted-foreground",
            )}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={className} title={title} onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <div className={className} title={title}>
      {content}
    </div>
  );
}
