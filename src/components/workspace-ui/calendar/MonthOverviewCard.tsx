import type { KeyboardEvent } from "react";

import { CalendarMonthPanel } from "@/components/workspace-ui/calendar/CalendarMonthPanel";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { TimelineEvent } from "@/lib/types/timeline";
import type { TimelineFilterState } from "@/stores/useTimelineStore";

interface MonthOverviewCardProps {
  year: number;
  monthIndex: number;
  config: CalendarConfig;
  events: TimelineEvent[];
  filters: TimelineFilterState;
  showSeasonEditOverlap?: boolean;
  onOpen: () => void;
}

export function MonthOverviewCard({
  year,
  monthIndex,
  config,
  events,
  filters,
  showSeasonEditOverlap = false,
  onOpen,
}: MonthOverviewCardProps) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <section
      className="cursor-pointer rounded-lg border border-border bg-card/40 p-3 transition-colors hover:border-primary/40 hover:bg-card/70"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
    >
      <CalendarMonthPanel
        year={year}
        monthIndex={monthIndex}
        config={config}
        events={events}
        filters={filters}
        showSeasonEditOverlap={showSeasonEditOverlap}
      />
    </section>
  );
}
