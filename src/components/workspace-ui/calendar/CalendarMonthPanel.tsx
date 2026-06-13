import { useMemo } from "react";

import { MiniMonthGridFrame } from "@/components/workspace-ui/calendar/MiniMonthGridFrame";
import { MonthDayCell } from "@/components/workspace-ui/calendar/MonthDayCell";
import {
  buildMonthDayCellDisplay,
  markedDaysForYear,
} from "@/lib/calendar/monthDayDisplay";
import { buildMonthGrid } from "@/lib/calendar/monthGrid";
import {
  buildOverlappingSeasonDayKeys,
  seasonDayKey,
} from "@/lib/calendar/seasonOverlap";
import { resolveWeekDayHeaders } from "@/lib/calendar/weekDays";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { TimelineEvent } from "@/lib/types/timeline";
import { useCalendarStore } from "@/stores/useCalendarStore";
import type { TimelineFilterState } from "@/stores/useTimelineStore";

interface CalendarMonthPanelProps {
  year: number;
  monthIndex: number;
  config: CalendarConfig;
  events: TimelineEvent[];
  filters: TimelineFilterState;
  selectedDay?: number;
  onSelectDay?: (day: number) => void;
  showSeasonEditOverlap?: boolean;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  prevMonthAriaLabel?: string;
  nextMonthAriaLabel?: string;
}

export function CalendarMonthPanel({
  year,
  monthIndex,
  config,
  events,
  filters,
  selectedDay,
  onSelectDay,
  showSeasonEditOverlap = false,
  onPrevMonth,
  onNextMonth,
  prevMonthAriaLabel,
  nextMonthAriaLabel,
}: CalendarMonthPanelProps) {
  const baselineConfig = useCalendarStore((s) => s.baselineConfig);
  const grid = useMemo(
    () => buildMonthGrid(year, monthIndex, config),
    [year, monthIndex, config],
  );

  const weekdayLabels = useMemo(
    () => resolveWeekDayHeaders(config),
    [config.daysPerWeek, config.weekDays],
  );

  const marked = useMemo(
    () => markedDaysForYear(year, events, config, filters, baselineConfig),
    [year, events, config, filters, baselineConfig],
  );

  const overlappingSeasonDays = useMemo(() => {
    if (!showSeasonEditOverlap) return new Set<string>();
    return buildOverlappingSeasonDayKeys(config.seasons ?? [], config.months);
  }, [showSeasonEditOverlap, config]);

  const monthNum = monthIndex + 1;

  return (
    <MiniMonthGridFrame
      monthName={grid.monthName}
      weekdayLabels={weekdayLabels}
      daysPerWeek={config.daysPerWeek}
      onPrevMonth={onPrevMonth}
      onNextMonth={onNextMonth}
      prevMonthAriaLabel={prevMonthAriaLabel}
      nextMonthAriaLabel={nextMonthAriaLabel}
    >
      {grid.weeks.flatMap((week, wi) =>
        week.map((cell, di) => {
          if (cell.day === null) {
            return <span key={`${wi}-${di}-empty`} className="aspect-square" />;
          }

          const key = `${monthNum}-${cell.day}`;
          const mark = marked.get(key);
          const day = cell.day;
          const display = buildMonthDayCellDisplay({
            month: monthNum,
            day,
            monthIndex,
            year,
            config,
            mark,
            seasonOverlapDay:
              showSeasonEditOverlap &&
              overlappingSeasonDays.has(seasonDayKey(monthNum, day)),
          });

          return (
            <MonthDayCell
              key={`${wi}-${di}-${day}`}
              day={day}
              highlighted={display.highlighted}
              style={display.style}
              title={display.title}
              selected={selectedDay === day}
              onSelect={onSelectDay ? () => onSelectDay(day) : undefined}
            />
          );
        }),
      )}
    </MiniMonthGridFrame>
  );
}
