import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { TimeEntryRow } from "@/components/workspace-ui/calendar/TimeEntryRow";
import {
  buildCalendarTimeEntries,
  calendarEntryColor,
  calendarEntryTooltip,
  entriesForDay,
  isCalendarEntryStale,
  type CalendarTimeEntry,
} from "@/lib/calendar/calendarEntries";
import { ALL_TIMELINE_FILTERS } from "@/lib/calendar/monthDayDisplay";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { TimelineEvent } from "@/lib/types/timeline";
import { cn } from "@/lib/utils";
import { useCalendarStore } from "@/stores/useCalendarStore";

interface TimeTagDayEventListProps {
  year: number;
  month: number;
  day: number;
  calendar: CalendarConfig;
  events: TimelineEvent[];
  className?: string;
}

function sortDayEntries(
  entries: CalendarTimeEntry[],
  hoursEnabled: boolean,
): CalendarTimeEntry[] {
  return [...entries].sort((a, b) => {
    if (hoursEnabled) {
      const ah = a.hour ?? -1;
      const bh = b.hour ?? -1;
      if (ah !== bh) return ah - bh;
    }
    if (a.sortKey === b.sortKey) return a.label.localeCompare(b.label);
    return a.sortKey < b.sortKey ? -1 : 1;
  });
}

export function TimeTagDayEventList({
  year,
  month,
  day,
  calendar,
  events,
  className,
}: TimeTagDayEventListProps) {
  const { t } = useTranslation("calendarView");
  const { t: tEditor } = useTranslation("editor");
  const baselineConfig = useCalendarStore((s) => s.baselineConfig);
  const hoursEnabled = Boolean(calendar.hoursEnabled);

  const dayEntries = useMemo(() => {
    const allEntries = buildCalendarTimeEntries(
      year,
      events,
      calendar,
      ALL_TIMELINE_FILTERS,
      baselineConfig,
    );
    return sortDayEntries(entriesForDay(allEntries, month, day), hoursEnabled);
  }, [year, month, day, calendar, events, baselineConfig, hoursEnabled]);

  return (
    <div
      className={cn("mt-2 rounded-md border border-border/60 bg-muted/15", className)}
    >
      <div className="max-h-[8.75rem] space-y-1 overflow-y-auto p-1.5">
        {dayEntries.length === 0 ? (
          <p className="px-1 py-2 text-center text-[10px] text-muted-foreground">
            {t("month.noDayEntries")}
          </p>
        ) : (
          dayEntries.map((entry) => (
            <TimeEntryRow
              key={entry.id}
              color={calendarEntryColor(entry)}
              label={entry.label}
              stale={isCalendarEntryStale(entry)}
              title={calendarEntryTooltip(tEditor, entry)}
              subtitle={
                hoursEnabled
                  ? entry.hour !== null
                    ? t("month.hour", { hour: entry.hour })
                    : t("month.noHour")
                  : undefined
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
