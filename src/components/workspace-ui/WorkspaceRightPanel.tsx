import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface WorkspaceRightPanelProps {
  width?: number;
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  "aria-label"?: string;
}

export function WorkspaceRightPanel({
  width = 280,
  header,
  children,
  footer,
  className,
  "aria-label": ariaLabel,
}: WorkspaceRightPanelProps) {
  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-l border-border bg-card",
        className,
      )}
      style={{ width }}
      aria-label={ariaLabel}
    >
      {header ? <div className="shrink-0 border-b border-border">{header}</div> : null}
      <div className="scroll-panel flex min-h-0 flex-1 flex-col overflow-y-auto">
        {children}
      </div>
      {footer ? <div className="shrink-0 border-t border-border">{footer}</div> : null}
    </aside>
  );
}
