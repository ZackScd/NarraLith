import { useMemo } from "react";

import { MonthOverviewCard } from "@/components/workspace-ui/calendar/MonthOverviewCard";
import { buildAllMonthGrids } from "@/lib/calendar/monthGrid";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { TimelineEvent } from "@/lib/types/timeline";
import { useCalendarViewStore } from "@/stores/useCalendarViewStore";
import type { TimelineFilterState } from "@/stores/useTimelineStore";

interface CalendarMonthGridProps {
  year: number;
  config: CalendarConfig;
  events: TimelineEvent[];
  filters: TimelineFilterState;
}

export function CalendarMonthGrid({
  year,
  config,
  events,
  filters,
}: CalendarMonthGridProps) {
  const openMonth = useCalendarViewStore((s) => s.openMonth);
  const calendarEditMode = useCalendarViewStore((s) => s.editExpanded);

  const grids = useMemo(() => buildAllMonthGrids(year, config), [year, config]);

  return (
    <div className="scroll-panel grid flex-1 gap-4 overflow-y-auto p-4 sm:grid-cols-2 xl:grid-cols-3">
      {grids.map((grid) => (
        <MonthOverviewCard
          key={grid.monthIndex}
          year={year}
          monthIndex={grid.monthIndex}
          config={config}
          events={events}
          filters={filters}
          showSeasonEditOverlap={calendarEditMode}
          onOpen={() => openMonth(grid.monthIndex)}
        />
      ))}
    </div>
  );
}
