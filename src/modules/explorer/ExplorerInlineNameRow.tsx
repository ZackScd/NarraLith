import { File, Folder, ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  manuscriptContentPaddingLeft,
  manuscriptRowBleedStyle,
  MS_ROW_CLASS,
  MS_ROW_PX,
  MS_ROW_SLOT_CLASS,
} from "@/modules/explorer/manuscriptTreeLayout";

export interface ExplorerInlineNameRowProps {
  kind: "file" | "folder";
  depth: number;
  compact?: boolean;
  /** When compact, render only inner row (inside existing manuscript slot). */
  embedded?: boolean;
  initialValue: string;
  selectAllOnMount?: boolean;
  showChevron?: boolean;
  isExpanded?: boolean;
  onCommit: (value: string) => void;
  onCancel: () => void;
  ariaLabel: string;
}

export function ExplorerInlineNameRow({
  kind,
  depth,
  compact = false,
  embedded = false,
  initialValue,
  selectAllOnMount = false,
  showChevron = false,
  isExpanded = false,
  onCommit,
  onCancel,
  ariaLabel,
}: ExplorerInlineNameRowProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurRef = useRef(false);

  useEffect(() => {
    const el = inputRef.current;
    el?.focus();
    if (selectAllOnMount) {
      el?.select();
    } else {
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [selectAllOnMount]);

  function handleCancel() {
    skipBlurRef.current = true;
    onCancel();
  }

  function handleCommit() {
    skipBlurRef.current = true;
    onCommit(value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (value.trim().length === 0) {
        handleCancel();
      } else {
        handleCommit();
      }
    }
  }

  function handleBlur() {
    if (skipBlurRef.current) {
      return;
    }
    if (value.trim().length === 0) {
      onCancel();
    } else {
      onCommit(value);
    }
  }

  const Icon = kind === "file" ? File : Folder;
  const chevronClass = cn("shrink-0 text-muted-foreground", compact ? "size-3" : "size-3.5");

  const input = (
    <Input
      ref={inputRef}
      className={cn(
        "min-w-0 flex-1 border-primary/50 py-0 text-sm",
        compact ? "h-6 px-1" : "h-7 px-2",
      )}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      aria-label={ariaLabel}
    />
  );

  const leadingSlot = showChevron ? (
    isExpanded ? (
      <ChevronDown className={chevronClass} />
    ) : (
      <ChevronRight className={chevronClass} />
    )
  ) : (
    <span className={chevronClass} aria-hidden="true" />
  );

  if (compact && embedded) {
    return (
      <div className={cn("flex min-w-0 flex-1 items-center gap-1", MS_ROW_CLASS, MS_ROW_PX)}>
        {leadingSlot}
        <Icon className={cn(chevronClass, "text-muted-foreground")} />
        {input}
      </div>
    );
  }

  if (compact) {
    return (
      <div className={MS_ROW_SLOT_CLASS} style={manuscriptRowBleedStyle()}>
        <div
          className={cn("flex min-w-0 items-center gap-1", MS_ROW_CLASS, MS_ROW_PX)}
          style={{ paddingLeft: manuscriptContentPaddingLeft(depth) }}
        >
          {leadingSlot}
          <Icon className={cn(chevronClass, "text-muted-foreground")} />
          {input}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-w-0 flex-1 items-center gap-1 rounded-md px-2 py-1"
      style={{ paddingLeft: depth > 0 ? `${depth * 12 + 8}px` : undefined }}
    >
      {showChevron ? leadingSlot : null}
      <Icon className={cn(chevronClass, "text-muted-foreground")} />
      {input}
    </div>
  );
}
