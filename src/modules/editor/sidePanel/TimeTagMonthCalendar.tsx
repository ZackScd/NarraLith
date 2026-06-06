import { useTranslation } from "react-i18next";

import { CalendarMonthPanel } from "@/components/workspace-ui/calendar/CalendarMonthPanel";
import { ALL_TIMELINE_FILTERS } from "@/lib/calendar/monthDayDisplay";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { TimelineEvent } from "@/lib/types/timeline";

import { TimeTagDayEventList } from "./TimeTagDayEventList";

interface TimeTagMonthCalendarProps {
  year: number;
  month: number;
  selectedDay: number;
  onSelectDay: (day: number) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  calendar: CalendarConfig;
  events: TimelineEvent[];
}

export function TimeTagMonthCalendar({
  year,
  month,
  selectedDay,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  calendar,
  events,
}: TimeTagMonthCalendarProps) {
  const { t } = useTranslation("calendarView");

  return (
    <div className="min-w-0 rounded-lg border border-border bg-card/40 p-3">
      <CalendarMonthPanel
        year={year}
        monthIndex={month - 1}
        config={calendar}
        events={events}
        filters={ALL_TIMELINE_FILTERS}
        selectedDay={selectedDay}
        onSelectDay={onSelectDay}
        onPrevMonth={onPrevMonth}
        onNextMonth={onNextMonth}
        prevMonthAriaLabel={t("prevMonth")}
        nextMonthAriaLabel={t("nextMonth")}
      />
      <TimeTagDayEventList
        year={year}
        month={month}
        day={selectedDay}
        calendar={calendar}
        events={events}
      />
    </div>
  );
}
