import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ManuscriptTagChipProps {
  icon: LucideIcon;
  label: string;
  title?: string;
  visible?: boolean;
  variant?: "default" | "dashed";
  invalid?: boolean;
  "data-inline-tag-value"?: string;
}

export function ManuscriptTagChip({
  icon: Icon,
  label,
  title,
  visible = true,
  variant = "default",
  invalid = false,
  "data-inline-tag-value": dataInlineTagValue,
}: ManuscriptTagChipProps) {
  if (!visible) {
    return null;
  }

  return (
    <span
      className={cn(
        "narra-manuscript-tag inline-flex max-w-[14rem] items-center gap-1 rounded-full px-2 py-0.5 font-sans text-[11px]",
        variant === "default" &&
          "border border-border/60 bg-background text-foreground",
        variant === "dashed" &&
          "border border-dashed border-border/60 text-muted-foreground",
        invalid && "border-destructive/60 text-destructive",
      )}
      title={title}
      data-inline-tag-value={dataInlineTagValue}
    >
      <Icon className="size-3 shrink-0 text-muted-foreground" aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}
