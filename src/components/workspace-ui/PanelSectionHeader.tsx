import { Check, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { panelSectionTitleClass } from "./tokens";

interface PanelSectionHeaderProps {
  title: string;
  expanded: boolean;
  onToggleExpand: () => void;
  editEnabled: boolean;
  onToggleEdit: () => void;
  editDisabled?: boolean;
  editAriaLabel: string;
  confirmEditAriaLabel: string;
  afterTitle?: ReactNode;
}

export function PanelSectionHeader({
  title,
  expanded,
  onToggleExpand,
  editEnabled,
  onToggleEdit,
  editDisabled = false,
  editAriaLabel,
  confirmEditAriaLabel,
  afterTitle,
}: PanelSectionHeaderProps) {
  const stopClick = (e: MouseEvent) => e.stopPropagation();

  return (
    <div
      role="button"
      tabIndex={0}
      className="flex cursor-pointer items-center gap-1"
      onClick={onToggleExpand}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggleExpand();
        }
      }}
    >
      {expanded ? (
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      ) : (
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
      )}
      <h3 className={cn(panelSectionTitleClass, "min-w-0 flex-1")}>{title}</h3>
      {afterTitle}
      <Button
        type="button"
        variant={editEnabled ? "secondary" : "outline"}
        size="icon"
        className={cn("size-8 shrink-0", editDisabled && "opacity-40")}
        disabled={editDisabled}
        aria-label={editEnabled ? confirmEditAriaLabel : editAriaLabel}
        title={editEnabled ? confirmEditAriaLabel : editAriaLabel}
        onClick={(e) => {
          stopClick(e);
          if (!editDisabled) onToggleEdit();
        }}
      >
        {editEnabled ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
      </Button>
    </div>
  );
}
