import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { MiniMonthGridFrame } from "@/components/workspace-ui/calendar/MiniMonthGridFrame";
import { fromAbsoluteDay, toAbsoluteDay } from "@/lib/calendar/engine";
import type { CalendarDateParts } from "@/lib/calendar/formatCalendarDisplayDate";
import { buildMonthGrid } from "@/lib/calendar/monthGrid";
import { resolveWeekDayHeaders } from "@/lib/calendar/weekDays";
import type { CalendarAnnualEvent, CalendarConfig } from "@/lib/types/calendar";
import { cn } from "@/lib/utils";

interface SideMonthGridProps {
  calendar: CalendarConfig;
  anchor: CalendarDateParts;
  globalLast: CalendarDateParts | null;
  storyDayKeys: Set<string>;
  annualByKey: Map<string, CalendarAnnualEvent[]>;
}

function sameDate(a: CalendarDateParts, b: CalendarDateParts): boolean {
  return a.day === b.day && a.month === b.month && a.year === b.year;
}

export function SideMonthGrid({
  calendar,
  anchor,
  globalLast,
  storyDayKeys,
  annualByKey,
}: SideMonthGridProps) {
  const { t: tCalendar } = useTranslation("calendar");

  const grid = useMemo(
    () => buildMonthGrid(anchor.year, anchor.month - 1, calendar),
    [anchor.year, anchor.month, calendar],
  );

  const weekdayLabels = useMemo(() => resolveWeekDayHeaders(calendar), [calendar]);

  const month = anchor.month;
  const year = anchor.year;

  return (
    <MiniMonthGridFrame
      weekdayLabels={weekdayLabels}
      daysPerWeek={calendar.daysPerWeek}
      compact
    >
      {grid.weeks.flatMap((week, wi) =>
        week.map((cell, di) => {
          if (cell.day === null) {
            return <span key={`${wi}-${di}-empty`} className="aspect-square" />;
          }

          const day = cell.day;
          const key = `${month}:${day}:${year}`;
          const annualKey = `${month}:${day}`;
          const hasStoryEvent = storyDayKeys.has(key);
          const hasAnnualEvent = (annualByKey.get(annualKey) ?? []).some((e) => {
            if (year < e.startsAtYear) return false;
            const period = Math.max(1, e.repeatEveryYears ?? 1);
            return (year - e.startsAtYear) % period === 0;
          });

          const cellParts: CalendarDateParts = { day, month, year };
          const isAnchor = sameDate(cellParts, anchor);
          const isGlobalLast =
            globalLast !== null &&
            sameDate(cellParts, globalLast) &&
            !sameDate(cellParts, anchor);

          const tooltip =
            `${day}.${month}.${year}` +
            (hasStoryEvent
              ? `\n· ${tCalendar("eventKindStory", { defaultValue: "Historia" })}`
              : "") +
            (hasAnnualEvent ? `\n★ ${tCalendar("eventKindAnnual")}` : "");

          return (
            <div
              key={`${wi}-${di}-${day}`}
              title={tooltip}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded border text-[10px] leading-none",
                isAnchor
                  ? "border-primary/70 bg-primary/15 text-foreground"
                  : isGlobalLast
                    ? "border-violet-500/50 bg-violet-500/10 text-foreground ring-1 ring-violet-500/60"
                    : "border-border/40 bg-muted/20 text-muted-foreground",
              )}
            >
              <span>{day}</span>
              {hasStoryEvent || hasAnnualEvent ? (
                <span className="mt-0.5 flex gap-0.5">
                  {hasStoryEvent ? (
                    <span className="size-1 rounded-full bg-primary" />
                  ) : null}
                  {hasAnnualEvent ? (
                    <span className="size-1 rounded-full bg-violet-500" />
                  ) : null}
                </span>
              ) : null}
            </div>
          );
        }),
      )}
    </MiniMonthGridFrame>
  );
}

export function buildWeekCells(
  anchor: CalendarDateParts,
  config: CalendarConfig,
  storyDays: Set<string>,
  annualByKey: Map<string, CalendarAnnualEvent[]>,
) {
  const daysPerWeek = Math.max(1, config.daysPerWeek);
  const anchorAbs = toAbsoluteDay(anchor, config);
  const offset = -Math.floor(daysPerWeek / 2);
  const cells = [];
  for (let i = 0; i < daysPerWeek; i += 1) {
    const abs = anchorAbs + BigInt(offset + i);
    const parts = fromAbsoluteDay(abs, config);
    const key = `${parts.month}:${parts.day}:${parts.year}`;
    const annualKey = `${parts.month}:${parts.day}`;
    cells.push({
      day: parts.day,
      month: parts.month,
      year: parts.year,
      absoluteDay: abs,
      hasStoryEvent: storyDays.has(key),
      hasAnnualEvent: (annualByKey.get(annualKey) ?? []).some((e) => {
        if (parts.year < e.startsAtYear) return false;
        const period = Math.max(1, e.repeatEveryYears ?? 1);
        return (parts.year - e.startsAtYear) % period === 0;
      }),
      isAnchor: abs === anchorAbs,
    });
  }
  return cells;
}
