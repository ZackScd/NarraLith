import { ChevronLeft, ChevronRight, History } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { EditableNumberInput } from "@/components/EditableNumberInput";
import {
  CalendarLegend,
  CalendarTopBarLayout,
  CalendarYearHeader,
  YearJumpStrip,
} from "@/components/workspace-ui";
import { Button } from "@/components/ui/button";
import { yearsWithFileEntries } from "@/lib/calendar/calendarMarkers";
import { CALENDAR_LEGEND } from "@/lib/calendar/legend";
import { resolveInitialCalendarYear } from "@/lib/calendar/lastProjectTime";
import { specialYearBarLabel } from "@/lib/calendar/specialExtraDays";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { TimelineEvent } from "@/lib/types/timeline";
import { useCalendarViewStore } from "@/stores/useCalendarViewStore";

interface CalendarTopBarProps {
  config: CalendarConfig;
  events: TimelineEvent[];
}

export function CalendarTopBar({ config, events }: CalendarTopBarProps) {
  const { t } = useTranslation("calendarView");
  const viewYear = useCalendarViewStore((s) => s.viewYear);
  const setViewYear = useCalendarViewStore((s) => s.setViewYear);
  const referenceYear = useMemo(
    () => resolveInitialCalendarYear(events, config),
    [events, config],
  );

  const yearsWithEntries = useMemo(
    () => yearsWithFileEntries(events, config),
    [events, config],
  );

  const legendItems = useMemo(
    () =>
      CALENDAR_LEGEND.map((item) => ({
        id: item.id,
        label: t(item.labelKey),
        color: item.color,
      })),
    [t],
  );

  const shiftYear = (delta: number) => {
    setViewYear(viewYear + delta);
  };

  const specialYearInfo = specialYearBarLabel(viewYear, config);

  return (
    <CalendarTopBarLayout
      yearRow={
        <CalendarYearHeader
          yearLabel={t("yearLabel")}
          controls={
            <>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => shiftYear(-1)}
                aria-label={t("prevYear")}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <EditableNumberInput
                className="h-8 w-24 shrink-0 text-center text-sm"
                value={viewYear}
                fallback={referenceYear}
                onValueChange={(n) => setViewYear(n ?? referenceYear)}
                title={t("yearReferenceHint", { year: referenceYear })}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => shiftYear(1)}
                aria-label={t("nextYear")}
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => setViewYear(referenceYear)}
                aria-label={t("yearGoToLast")}
                title={t("yearGoToLast")}
              >
                <History className="size-4" />
              </Button>
            </>
          }
          yearStrip={
            <YearJumpStrip
              years={yearsWithEntries}
              activeYear={viewYear}
              onSelectYear={setViewYear}
              getYearAriaLabel={(year) => t("jumpToYear", { year })}
              scrollBackAriaLabel={t("scrollYearsBack")}
              scrollForwardAriaLabel={t("scrollYearsForward")}
            />
          }
        />
      }
      footerRow={
        <>
          <div className="min-w-0 shrink-0">
            {specialYearInfo ? (
              <span className="text-xs text-muted-foreground">
                {specialYearInfo.linkedPath
                  ? t("specialYearLabelWithFile", {
                      name: specialYearInfo.name,
                      file: specialYearInfo.linkedPath,
                    })
                  : t("specialYearLabel", { name: specialYearInfo.name })}
              </span>
            ) : null}
          </div>
          <CalendarLegend
            items={legendItems}
            className="ml-auto shrink-0 justify-end"
          />
        </>
      }
    />
  );
}
