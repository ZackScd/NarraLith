import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { TimeEntryRow, WorkspaceRightPanel } from "@/components/workspace-ui";
import { Button } from "@/components/ui/button";
import type { CalendarTimeEntry } from "@/lib/calendar/calendarEntries";
import {
  calendarEntryColor,
  calendarEntryTooltip,
  entriesForDay,
  entriesForMonth,
  isCalendarEntryStale,
} from "@/lib/calendar/calendarEntries";
import { effectiveCalendarForYear } from "@/lib/calendar/effectiveCalendar";
import type { CalendarConfig } from "@/lib/types/calendar";
import { CalendarStaleEntriesSection } from "@/modules/calendar/CalendarStaleEntriesSection";
import { useCalendarViewStore } from "@/stores/useCalendarViewStore";
import { useEditorStore } from "@/stores/useEditorStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

interface CalendarMonthToolPanelProps {
  config: CalendarConfig;
  year: number;
  monthIndex: number;
  allEntries: CalendarTimeEntry[];
  staleOutsideYear: CalendarTimeEntry[];
}

function entryRowProps(entry: CalendarTimeEntry, tEditor: TFunction<"editor">) {
  const stale = isCalendarEntryStale(entry);
  return {
    color: calendarEntryColor(entry),
    stale,
    title: calendarEntryTooltip(tEditor, entry),
  };
}

export function CalendarMonthToolPanel({
  config,
  year,
  monthIndex,
  allEntries,
  staleOutsideYear,
}: CalendarMonthToolPanelProps) {
  const { t } = useTranslation("calendarView");
  const { t: tEditor } = useTranslation("editor");
  const selectedDay = useCalendarViewStore((s) => s.selectedDay);
  const selectDay = useCalendarViewStore((s) => s.selectDay);
  const closeMonth = useCalendarViewStore((s) => s.closeMonth);
  const requestOpenDocument = useEditorStore((s) => s.requestOpenDocument);
  const setMainView = useWorkspaceStore((s) => s.setMainView);

  const monthNumber = monthIndex + 1;
  const eff = effectiveCalendarForYear(year, config);
  const monthName = eff.months[monthIndex]?.name ?? String(monthNumber);

  const monthEntries = useMemo(
    () => entriesForMonth(allEntries, monthNumber),
    [allEntries, monthNumber],
  );

  const dayEntries = useMemo(() => {
    if (selectedDay === null) return [];
    return entriesForDay(allEntries, monthNumber, selectedDay);
  }, [allEntries, monthNumber, selectedDay]);

  const openEntry = (entry: CalendarTimeEntry) => {
    if (entry.kind === "file" && entry.path) {
      void requestOpenDocument(entry.path);
      setMainView("editor");
    }
  };

  const hoursEnabled = Boolean(config.hoursEnabled);
  const hoursPerDay = config.hoursPerDay || 24;

  const dayHourGroups = useMemo(() => {
    if (selectedDay === null || !hoursEnabled) return null;
    const groups: { hour: number | null; items: CalendarTimeEntry[] }[] = [];
    const withoutHour = dayEntries.filter((e) => e.hour === null);
    if (withoutHour.length > 0) {
      groups.push({ hour: null, items: withoutHour });
    }
    for (let h = 0; h < hoursPerDay; h++) {
      groups.push({
        hour: h,
        items: dayEntries.filter((e) => e.hour === h),
      });
    }
    return groups;
  }, [selectedDay, hoursEnabled, hoursPerDay, dayEntries]);

  if (selectedDay !== null) {
    return (
      <WorkspaceRightPanel
        header={
          <div className="p-3">
            <Button
              type="button"
              variant="outline"
              className="mb-2 h-8 w-full justify-start gap-2 text-xs"
              onClick={() => selectDay(null)}
            >
              <ArrowLeft className="size-3.5" />
              {t("month.backToMonth")}
            </Button>
            <p className="text-sm font-medium text-foreground">
              {t("month.dayTitle", {
                day: selectedDay,
                month: monthName,
                year,
              })}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {t("month.daySubtitle")}
            </p>
          </div>
        }
      >
        <div className="flex flex-col gap-2 p-3">
          {dayEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("month.noDayEntries")}</p>
          ) : hoursEnabled && dayHourGroups ? (
            dayHourGroups.map((group) => (
              <div key={group.hour ?? "none"}>
                {group.hour !== null ? (
                  <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
                    {t("month.hour", { hour: group.hour })}
                  </p>
                ) : (
                  <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
                    {t("month.noHour")}
                  </p>
                )}
                <div className="space-y-1">
                  {group.items.map((entry) => {
                    const row = entryRowProps(entry, tEditor);
                    return (
                      <TimeEntryRow
                        key={entry.id}
                        color={row.color}
                        label={entry.label}
                        stale={row.stale}
                        title={row.title}
                        onClick={() => openEntry(entry)}
                      />
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            dayEntries.map((entry) => {
              const row = entryRowProps(entry, tEditor);
              return (
                <TimeEntryRow
                  key={entry.id}
                  color={row.color}
                  label={entry.label}
                  stale={row.stale}
                  title={row.title}
                  onClick={() => openEntry(entry)}
                />
              );
            })
          )}
          <CalendarStaleEntriesSection
            entries={staleOutsideYear}
            className="mt-3 border-t border-border/60 pt-3"
          />
        </div>
      </WorkspaceRightPanel>
    );
  }

  return (
    <WorkspaceRightPanel
      header={
        <div className="p-3">
          <Button
            type="button"
            variant="outline"
            className="mb-2 h-8 w-full justify-start gap-2 text-xs"
            onClick={closeMonth}
          >
            <ArrowLeft className="size-3.5" />
            {t("month.backToYear")}
          </Button>
          <p className="text-sm font-medium text-foreground">
            {t("month.monthTitle", { month: monthName, year })}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {t("month.monthSubtitle")}
          </p>
        </div>
      }
    >
      <div className="flex flex-col gap-1.5 p-3">
        {monthEntries.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("month.noMonthEntries")}</p>
        ) : (
          monthEntries.map((entry) => {
            const row = entryRowProps(entry, tEditor);
            return (
              <TimeEntryRow
                key={entry.id}
                color={row.color}
                label={entry.label}
                subtitle={entry.dateLabel}
                stale={row.stale}
                title={row.title}
                onClick={() => openEntry(entry)}
              />
            );
          })
        )}
        <CalendarStaleEntriesSection
          entries={staleOutsideYear}
          className="mt-3 border-t border-border/60 pt-3"
        />
      </div>
    </WorkspaceRightPanel>
  );
}
