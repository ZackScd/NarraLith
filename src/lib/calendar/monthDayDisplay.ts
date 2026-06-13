import type { CSSProperties } from "react";

import {
  buildMarkedDaysForYear,
  type MarkedCalendarDay,
} from "@/lib/calendar/calendarMarkers";
import { CALENDAR_LEGEND, type CalendarLegendCategory } from "@/lib/calendar/legend";
import { seasonHighlightRgba } from "@/lib/calendar/seasonHighlight";
import {
  isSpecialExtraDay,
  specialExtraDayLabel,
} from "@/lib/calendar/specialExtraDays";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { TimelineEvent } from "@/lib/types/timeline";
import type { TimelineFilterState } from "@/stores/useTimelineStore";

export const ALL_TIMELINE_FILTERS: TimelineFilterState = {
  manuscript: true,
  events: true,
  festivals: true,
  anniversaries: true,
  cosmic: true,
};

export interface MonthDayCellDisplay {
  style?: CSSProperties;
  title?: string;
  highlighted: boolean;
}

export function primaryColor(categories: CalendarLegendCategory[]): string {
  const first = categories[0];
  return CALENDAR_LEGEND.find((l) => l.id === first)?.color ?? "var(--cal-event)";
}

function dayOfYear(month: number, day: number, config: CalendarConfig): number {
  let total = 0;
  for (let m = 1; m < month; m++) {
    total += config.months[m - 1]?.days ?? 0;
  }
  return total + day;
}

export function seasonHighlightColor(
  month: number,
  day: number,
  config: CalendarConfig,
): string | null {
  const seasons = config.seasons ?? [];
  if (seasons.length === 0) return null;

  const current = dayOfYear(month, day, config);
  const totalYearDays = config.months.reduce((sum, m) => sum + m.days, 0);

  for (const season of seasons) {
    const start = dayOfYear(season.from.month, season.from.day, config);
    const end = dayOfYear(season.to.month, season.to.day, config);
    const inRange =
      start <= end
        ? current >= start && current <= end
        : current >= start || current <= end || end === totalYearDays;
    if (inRange) {
      return seasonHighlightRgba(season.highlightColor, season.highlightOpacity);
    }
  }
  return null;
}

export function buildMonthDayCellDisplay({
  month,
  day,
  monthIndex,
  year,
  config,
  mark,
  seasonOverlapDay = false,
}: {
  month: number;
  day: number;
  monthIndex: number;
  year: number;
  config: CalendarConfig;
  mark?: MarkedCalendarDay;
  seasonOverlapDay?: boolean;
}): MonthDayCellDisplay {
  const hasMark = Boolean(mark);
  const seasonColor = seasonHighlightColor(month, day, config);
  const extraDay = isSpecialExtraDay(monthIndex, day, year, config);
  const extraLabel = extraDay ? specialExtraDayLabel(year, config) : undefined;

  const cellStyle: CSSProperties = {};
  if (hasMark && mark) {
    if (mark.stale) {
      cellStyle.backgroundColor =
        "color-mix(in oklch, var(--destructive) 18%, var(--background))";
      cellStyle.boxShadow = "inset 0 0 0 1px var(--destructive)";
    } else {
      cellStyle.backgroundColor = primaryColor(mark.categories);
      if (mark.categories.length > 1) {
        cellStyle.boxShadow = `inset 0 0 0 1px var(--border)`;
      }
    }
  } else if (extraDay) {
    cellStyle.backgroundColor = "var(--cal-special-extra)";
  } else if (seasonColor) {
    cellStyle.backgroundColor = seasonColor;
  }

  if (seasonOverlapDay) {
    cellStyle.boxShadow = [cellStyle.boxShadow, "inset 0 0 0 2px rgb(239, 68, 68)"]
      .filter(Boolean)
      .join(", ");
  }

  return {
    style: Object.keys(cellStyle).length > 0 ? cellStyle : undefined,
    title: hasMark && mark ? mark.categories.join(", ") : extraLabel,
    highlighted: hasMark,
  };
}

export function markedDaysForYear(
  year: number,
  events: TimelineEvent[],
  config: CalendarConfig,
  filters: TimelineFilterState,
  baselineConfig?: CalendarConfig | null,
): Map<string, MarkedCalendarDay> {
  return buildMarkedDaysForYear(year, events, config, filters, baselineConfig);
}
