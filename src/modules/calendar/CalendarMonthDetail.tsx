import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { MonthDetailDayCell } from "@/components/workspace-ui";
import { Button } from "@/components/ui/button";
import {
  buildCalendarTimeEntries,
  entriesByDayInMonth,
} from "@/lib/calendar/calendarEntries";
import { effectiveCalendarForYear } from "@/lib/calendar/effectiveCalendar";
import { CALENDAR_LEGEND } from "@/lib/calendar/legend";
import { buildMonthGrid } from "@/lib/calendar/monthGrid";
import {
  isSpecialExtraDay,
  specialExtraDayLabel,
} from "@/lib/calendar/specialExtraDays";
import { resolveWeekDayHeaders } from "@/lib/calendar/weekDays";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { TimelineEvent } from "@/lib/types/timeline";
import { useCalendarViewStore } from "@/stores/useCalendarViewStore";
import { useCalendarStore } from "@/stores/useCalendarStore";
import type { TimelineFilterState } from "@/stores/useTimelineStore";

interface CalendarMonthDetailProps {
  year: number;
  monthIndex: number;
  config: CalendarConfig;
  events: TimelineEvent[];
  filters: TimelineFilterState;
}

export function CalendarMonthDetail({
  year,
  monthIndex,
  config,
  events,
  filters,
}: CalendarMonthDetailProps) {
  const { t } = useTranslation("calendarView");
  const baselineConfig = useCalendarStore((s) => s.baselineConfig);
  const shiftMonth = useCalendarViewStore((s) => s.shiftMonth);
  const selectedDay = useCalendarViewStore((s) => s.selectedDay);
  const selectDay = useCalendarViewStore((s) => s.selectDay);

  const monthNumber = monthIndex + 1;
  const eff = effectiveCalendarForYear(year, config);
  const monthName = eff.months[monthIndex]?.name ?? String(monthNumber);

  const grid = useMemo(
    () => buildMonthGrid(year, monthIndex, config),
    [year, monthIndex, config],
  );

  const byDay = useMemo(() => {
    const all = buildCalendarTimeEntries(
      year,
      events,
      config,
      filters,
      baselineConfig,
    );
    return entriesByDayInMonth(all, monthNumber);
  }, [year, events, config, filters, baselineConfig, monthNumber]);

  const weekdayLabels = useMemo(() => resolveWeekDayHeaders(config), [config]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-center gap-3 border-b border-border bg-card/40 px-4 py-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => shiftMonth(-1)}
          aria-label={t("month.prevMonth")}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="min-w-[10rem] text-center text-sm font-medium">
          {monthName} {year}
        </h2>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => shiftMonth(1)}
          aria-label={t("month.nextMonth")}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="scroll-panel flex flex-1 flex-col items-center overflow-y-auto p-6">
        <div
          className="w-full max-w-3xl rounded-lg border border-border bg-card/50 p-4"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${config.daysPerWeek}, minmax(0, 1fr))`,
            gap: "6px",
          }}
        >
          {weekdayLabels.map((label, idx) => (
            <span
              key={`weekday-h-${idx}`}
              className="py-1 text-center text-[11px] font-medium text-muted-foreground"
            >
              {label}
            </span>
          ))}

          {grid.weeks.flatMap((week, wi) =>
            week.map((cell, di) => {
              if (cell.day === null) {
                return (
                  <div
                    key={`${wi}-${di}-e`}
                    className="min-h-[4.5rem] rounded-md bg-transparent"
                  />
                );
              }

              const day = cell.day;
              const dayEntries = byDay.get(day) ?? [];
              const hasEntries = dayEntries.length > 0;
              const isSelected = selectedDay === day;
              const primary = dayEntries[0];
              const color = primary
                ? CALENDAR_LEGEND.find((l) => l.id === primary.category)?.color
                : undefined;
              const extraDay = isSpecialExtraDay(monthIndex, day, year, config);
              const extraLabel = extraDay
                ? specialExtraDayLabel(year, config)
                : undefined;

              return (
                <MonthDetailDayCell
                  key={`${wi}-${di}-${day}`}
                  day={day}
                  selected={isSelected}
                  highlighted={hasEntries}
                  className={
                    extraDay && !hasEntries
                      ? "bg-[var(--cal-special-extra)]"
                      : undefined
                  }
                  style={
                    hasEntries && color
                      ? { boxShadow: `inset 0 0 0 2px ${color}` }
                      : undefined
                  }
                  title={extraLabel}
                  onSelect={() => selectDay(day)}
                >
                  <ul className="mt-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                    {dayEntries.slice(0, 4).map((entry) => (
                      <li
                        key={entry.id}
                        className="truncate text-[9px] leading-tight text-foreground/90"
                        title={entry.label}
                      >
                        {entry.label}
                      </li>
                    ))}
                    {dayEntries.length > 4 ? (
                      <li className="text-[9px] text-muted-foreground">
                        +{dayEntries.length - 4}
                      </li>
                    ) : null}
                  </ul>
                </MonthDetailDayCell>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}
