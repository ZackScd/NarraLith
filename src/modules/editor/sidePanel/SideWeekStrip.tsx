import { useTranslation } from "react-i18next";

import type { CalendarAnnualEvent, CalendarConfig } from "@/lib/types/calendar";
import { cn } from "@/lib/utils";

import { buildWeekCells } from "./SideMonthGrid";

interface SideWeekStripProps {
  calendar: CalendarConfig;
  anchor: { day: number; month: number; year: number };
  storyDayKeys: Set<string>;
  annualByKey: Map<string, CalendarAnnualEvent[]>;
}

export function SideWeekStrip({
  calendar,
  anchor,
  storyDayKeys,
  annualByKey,
}: SideWeekStripProps) {
  const { t: tCalendar } = useTranslation("calendar");
  const week = buildWeekCells(anchor, calendar, storyDayKeys, annualByKey);

  return (
    <div
      className="grid gap-1"
      style={{
        gridTemplateColumns: `repeat(${Math.max(1, calendar.daysPerWeek)}, minmax(0, 1fr))`,
      }}
    >
      {week.map((cell, idx) => {
        const tooltip =
          `${cell.day}.${cell.month}.${cell.year}` +
          (cell.hasStoryEvent
            ? `\n· ${tCalendar("eventKindStory", { defaultValue: "Historia" })}`
            : "") +
          (cell.hasAnnualEvent ? `\n★ ${tCalendar("eventKindAnnual")}` : "");
        return (
          <div
            key={idx}
            title={tooltip}
            className={cn(
              "relative flex aspect-square flex-col items-center justify-center rounded border text-[10px] leading-none",
              cell.isAnchor
                ? "border-primary/70 bg-primary/15 text-foreground"
                : "border-border/40 bg-muted/20 text-muted-foreground",
            )}
          >
            <span>{cell.day}</span>
            {cell.hasStoryEvent || cell.hasAnnualEvent ? (
              <span className="mt-0.5 flex gap-0.5">
                {cell.hasStoryEvent ? (
                  <span className="size-1 rounded-full bg-primary" />
                ) : null}
                {cell.hasAnnualEvent ? (
                  <span className="size-1 rounded-full bg-violet-500" />
                ) : null}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
