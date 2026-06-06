import type { ReactNode } from "react";

interface CalendarTopBarLayoutProps {
  yearRow: ReactNode;
  footerRow: ReactNode;
}

export function CalendarTopBarLayout({
  yearRow,
  footerRow,
}: CalendarTopBarLayoutProps) {
  return (
    <header className="shrink-0 space-y-2 border-b border-border bg-card/50 px-4 py-3">
      {yearRow}
      <div className="flex min-w-0 items-center justify-between gap-4 border-t border-border/50 pt-2">
        {footerRow}
      </div>
    </header>
  );
}
