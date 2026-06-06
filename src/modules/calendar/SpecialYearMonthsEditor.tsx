import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { EditableNumberInput } from "@/components/EditableNumberInput";
import { Button } from "@/components/ui/button";
import type { CalendarMonth } from "@/lib/types/calendar";
import { panelNumberClass, panelStaticClass } from "@/components/workspace-ui";
import {
  MonthDragHandle,
  MonthDropRow,
  MonthListDnDProvider,
} from "@/modules/calendar/monthListDnD";
import { createEmptyMonth } from "@/stores/useCalendarStore";

export interface SpecialMonthExpand {
  cycleId: string;
  monthIndex: number;
  showDayHours: boolean;
}

interface SpecialYearMonthsEditorProps {
  cycleId: string;
  months: CalendarMonth[];
  expanded: SpecialMonthExpand | null;
  onExpandedChange: (next: SpecialMonthExpand | null) => void;
  onMonthsChange: (months: CalendarMonth[]) => void;
  hoursEnabled: boolean;
  defaultHoursPerDay: number;
}

export function SpecialYearMonthsEditor({
  cycleId,
  months,
  expanded,
  onExpandedChange,
  onMonthsChange,
  hoursEnabled,
  defaultHoursPerDay,
}: SpecialYearMonthsEditorProps) {
  const { t } = useTranslation("calendarView");
  const [deletePendingIndex, setDeletePendingIndex] = useState<number | null>(null);

  const updateMonth = (index: number, patch: Partial<CalendarMonth>) => {
    onMonthsChange(months.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const toggleMonth = (index: number) => {
    if (
      expanded?.cycleId === cycleId &&
      expanded.monthIndex === index &&
      !expanded.showDayHours
    ) {
      onExpandedChange(null);
      return;
    }
    onExpandedChange({ cycleId, monthIndex: index, showDayHours: false });
  };

  const toggleDayHours = (index: number) => {
    if (
      expanded?.cycleId === cycleId &&
      expanded.monthIndex === index &&
      expanded.showDayHours
    ) {
      onExpandedChange({ cycleId, monthIndex: index, showDayHours: false });
      return;
    }
    onExpandedChange({ cycleId, monthIndex: index, showDayHours: true });
  };

  const adjustDayHours = (monthIndex: number, day: number, delta: number) => {
    const month = months[monthIndex];
    if (!month) return;
    const hours = [...(month.dayHours ?? Array(month.days).fill(defaultHoursPerDay))];
    while (hours.length < month.days) hours.push(defaultHoursPerDay);
    hours[day - 1] = Math.max(0, (hours[day - 1] ?? defaultHoursPerDay) + delta);
    updateMonth(monthIndex, { dayHours: hours });
  };

  const removeMonth = (index: number) => {
    if (months.length <= 1) return;
    onMonthsChange(months.filter((_, i) => i !== index));
    setDeletePendingIndex(null);
    if (expanded?.cycleId === cycleId && expanded.monthIndex === index) {
      onExpandedChange(null);
    } else if (expanded?.cycleId === cycleId && expanded.monthIndex > index) {
      onExpandedChange({ ...expanded, monthIndex: expanded.monthIndex - 1 });
    }
  };

  const moveMonth = (from: number, to: number) => {
    if (to < 0 || to >= months.length || from === to) return;
    const next = [...months];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    onMonthsChange(next);
    if (expanded?.cycleId === cycleId && expanded.monthIndex !== undefined) {
      const { monthIndex } = expanded;
      if (monthIndex === from) {
        onExpandedChange({ ...expanded, monthIndex: to });
      } else if (from < monthIndex && to >= monthIndex) {
        onExpandedChange({ ...expanded, monthIndex: monthIndex - 1 });
      } else if (from > monthIndex && to <= monthIndex) {
        onExpandedChange({ ...expanded, monthIndex: monthIndex + 1 });
      }
    }
  };

  return (
    <MonthListDnDProvider onReorder={moveMonth}>
      <div className="space-y-1.5">
        {months.map((month, index) => {
          const isOpen = expanded?.cycleId === cycleId && expanded.monthIndex === index;
          const showHours = isOpen && expanded.showDayHours;
          const label = month.name.trim() || t("edit.monthName");

          return (
            <MonthDropRow
              key={`${cycleId}-${index}`}
              index={index}
              className="space-y-1"
            >
              <div className="flex items-center gap-1">
                <MonthDragHandle index={index} />
                <span className={panelStaticClass}>{label}</span>
                <Button
                  type="button"
                  variant={isOpen && !expanded?.showDayHours ? "secondary" : "outline"}
                  size="icon"
                  className="size-8 shrink-0"
                  aria-label={t("edit.editMonth")}
                  title={t("edit.editMonth")}
                  onClick={() => toggleMonth(index)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant={deletePendingIndex === index ? "destructive" : "outline"}
                  size="icon"
                  className="size-8 shrink-0"
                  disabled={months.length <= 1}
                  aria-label={t("edit.removeMonth")}
                  title={t("edit.removeMonth")}
                  onClick={() => {
                    if (deletePendingIndex === index) {
                      removeMonth(index);
                    } else {
                      setDeletePendingIndex(index);
                    }
                  }}
                >
                  {deletePendingIndex === index ? "✓" : "×"}
                </Button>
              </div>

              {isOpen ? (
                <div className="ml-1 space-y-2 rounded-md border border-border/50 bg-muted/15 p-2">
                  <p className="text-center text-[10px] font-medium text-muted-foreground">
                    {t("edit.day")}
                  </p>
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-7 shrink-0"
                      onClick={() =>
                        updateMonth(index, { days: Math.max(1, month.days - 1) })
                      }
                    >
                      ‹
                    </Button>
                    <EditableNumberInput
                      min={1}
                      fallback={1}
                      className={panelNumberClass}
                      value={month.days}
                      onValueChange={(n) =>
                        updateMonth(index, { days: Math.max(1, n ?? 1) })
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-7 shrink-0"
                      onClick={() => updateMonth(index, { days: month.days + 1 })}
                    >
                      ›
                    </Button>
                  </div>

                  {hoursEnabled ? (
                    <>
                      <div className="flex justify-center">
                        <Button
                          type="button"
                          variant={showHours ? "secondary" : "outline"}
                          size="sm"
                          className="h-8 text-[10px]"
                          onClick={() => toggleDayHours(index)}
                        >
                          {t("edit.editDayHours")}
                        </Button>
                      </div>
                      {showHours ? (
                        <div className="max-h-32 space-y-1 overflow-y-auto border-t border-border/40 pt-2">
                          {Array.from({ length: month.days }, (_, d) => {
                            const day = d + 1;
                            const hrs = month.dayHours?.[d] ?? defaultHoursPerDay;
                            return (
                              <div
                                key={day}
                                className="flex items-center justify-between gap-1 text-[10px] text-foreground"
                              >
                                <span>
                                  {t("edit.dayN", { day })}: {hrs}h
                                </span>
                                <div className="flex gap-0.5">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-6"
                                    onClick={() => adjustDayHours(index, day, 1)}
                                  >
                                    +
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-6"
                                    onClick={() => adjustDayHours(index, day, -1)}
                                  >
                                    −
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              ) : null}
            </MonthDropRow>
          );
        })}

        <div className="flex justify-center pt-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-full"
            aria-label={t("edit.addMonthToCycle")}
            title={t("edit.addMonthToCycle")}
            onClick={() => onMonthsChange([...months, createEmptyMonth()])}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>
    </MonthListDnDProvider>
  );
}
