import { ChevronLeft, ChevronRight, History } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { YearJumpStrip } from "@/components/workspace-ui/calendar/YearJumpStrip";
import { EditableNumberInput } from "@/components/EditableNumberInput";
import { Button } from "@/components/ui/button";
import { yearsWithFileEntries } from "@/lib/calendar/calendarMarkers";
import type { CalendarDateParts } from "@/lib/calendar/formatCalendarDisplayDate";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { TimelineEvent } from "@/lib/types/timeline";

interface TimeTagYearRowProps {
  calendar: CalendarConfig;
  year: number;
  events: TimelineEvent[];
  documentLast: CalendarDateParts | null;
  globalLast: CalendarDateParts | null;
  onYearChange: (year: number) => void;
  onApplyDate: (parts: CalendarDateParts) => void;
}

export function TimeTagYearRow({
  calendar,
  year,
  events,
  documentLast,
  globalLast,
  onYearChange,
  onApplyDate,
}: TimeTagYearRowProps) {
  const { t } = useTranslation("editor");
  const { t: tCalendar } = useTranslation("calendarView");

  const yearsWithEntries = useMemo(
    () => yearsWithFileEntries(events, calendar),
    [events, calendar],
  );

  const quickDate = documentLast ?? globalLast;
  const jumpLabel = documentLast
    ? t("panel.yearJumpDocument")
    : t("panel.yearJumpGlobal");

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {t("panel.yearLabel")}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8 shrink-0"
        onClick={() => onYearChange(year - 1)}
        aria-label={tCalendar("prevYear")}
        title={tCalendar("prevYear")}
      >
        <ChevronLeft className="size-3.5" />
      </Button>
      <EditableNumberInput
        className="h-8 w-20 shrink-0 text-center text-xs"
        value={year}
        fallback={year}
        onValueChange={(n) => onYearChange(n ?? year)}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8 shrink-0"
        onClick={() => onYearChange(year + 1)}
        aria-label={tCalendar("nextYear")}
        title={tCalendar("nextYear")}
      >
        <ChevronRight className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8 shrink-0"
        disabled={!quickDate}
        onClick={() => {
          if (quickDate) onApplyDate(quickDate);
        }}
        aria-label={jumpLabel}
        title={jumpLabel}
      >
        <History className="size-3.5" />
      </Button>
      <span className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden />
      <YearJumpStrip
        years={yearsWithEntries}
        activeYear={year}
        onSelectYear={onYearChange}
        getYearAriaLabel={(y) => tCalendar("jumpToYear", { year: y })}
        scrollBackAriaLabel={tCalendar("scrollYearsBack")}
        scrollForwardAriaLabel={tCalendar("scrollYearsForward")}
      />
    </div>
  );
}
