import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { EditableNumberInput } from "@/components/EditableNumberInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CalendarMonth } from "@/lib/types/calendar";
import { panelNumberClass } from "@/components/workspace-ui";
import {
  MonthDragHandle,
  MonthDropRow,
  MonthListDnDProvider,
} from "@/modules/calendar/monthListDnD";
import { createEmptyMonth } from "@/stores/useCalendarStore";

interface CalendarMonthRowsProps {
  months: CalendarMonth[];
  deletePendingIndex: number | null;
  onMonthsChange: (months: CalendarMonth[]) => void;
  onDeletePendingChange: (index: number | null) => void;
  variant?: "base" | "compact";
  hoursEditEnabled?: boolean;
  defaultHoursPerDay?: number;
  expandedMonthIndex?: number | null;
  onExpandedMonthChange?: (index: number | null) => void;
}

export function CalendarMonthRows({
  months,
  deletePendingIndex,
  onMonthsChange,
  onDeletePendingChange,
  variant = "base",
  hoursEditEnabled = false,
  defaultHoursPerDay = 24,
  expandedMonthIndex = null,
  onExpandedMonthChange,
}: CalendarMonthRowsProps) {
  const { t } = useTranslation("calendarView");

  const updateMonth = (index: number, patch: Partial<CalendarMonth>) => {
    onMonthsChange(months.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const moveMonth = (from: number, to: number) => {
    if (to < 0 || to >= months.length || from === to) return;
    const next = [...months];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    onMonthsChange(next);
    onDeletePendingChange(null);
    if (onExpandedMonthChange && expandedMonthIndex !== null) {
      if (expandedMonthIndex === from) {
        onExpandedMonthChange(to);
      } else if (from < expandedMonthIndex && to >= expandedMonthIndex) {
        onExpandedMonthChange(expandedMonthIndex - 1);
      } else if (from > expandedMonthIndex && to <= expandedMonthIndex) {
        onExpandedMonthChange(expandedMonthIndex + 1);
      }
    }
    if (deletePendingIndex !== null) {
      if (deletePendingIndex === from) {
        onDeletePendingChange(to);
      } else if (from < deletePendingIndex && to >= deletePendingIndex) {
        onDeletePendingChange(deletePendingIndex - 1);
      } else if (from > deletePendingIndex && to <= deletePendingIndex) {
        onDeletePendingChange(deletePendingIndex + 1);
      }
    }
  };

  const toggleEditMonth = (index: number) => {
    if (!onExpandedMonthChange) return;
    onExpandedMonthChange(expandedMonthIndex === index ? null : index);
  };

  const adjustDayHours = (
    monthIndex: number,
    scope: "one" | "all",
    day: number,
    delta: number,
  ) => {
    const month = months[monthIndex];
    if (!month) return;
    const base = defaultHoursPerDay;
    const hours = [...(month.dayHours ?? Array(month.days).fill(base))];
    while (hours.length < month.days) {
      hours.push(base);
    }
    const apply = (idx: number) => {
      hours[idx] = Math.max(0, (hours[idx] ?? base) + delta);
    };
    if (scope === "all") {
      for (let i = 0; i < month.days; i++) apply(i);
    } else {
      apply(day - 1);
    }
    updateMonth(monthIndex, { dayHours: hours });
  };

  const monthEditorPanel = (month: CalendarMonth, index: number) => (
    <div className="ml-1 space-y-2 rounded-md border border-border/50 bg-muted/15 p-2">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-7 shrink-0"
          onClick={() => updateMonth(index, { days: Math.max(1, month.days - 1) })}
        >
          ‹
        </Button>
        <EditableNumberInput
          min={1}
          fallback={1}
          className="h-7 flex-1 text-center text-xs"
          value={month.days}
          onValueChange={(n) => updateMonth(index, { days: Math.max(1, n ?? 1) })}
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
      {hoursEditEnabled ? (
        <div className="space-y-1.5 border-t border-border/40 pt-2">
          <p className="text-[10px] font-medium text-muted-foreground">
            {t("edit.editDayHours")}
          </p>
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[10px]"
              onClick={() => adjustDayHours(index, "all", 1, 1)}
            >
              {t("edit.addHourAll")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[10px]"
              onClick={() => adjustDayHours(index, "all", 1, -1)}
            >
              {t("edit.removeHourAll")}
            </Button>
          </div>
          <div className="max-h-28 space-y-1 overflow-y-auto">
            {Array.from({ length: month.days }, (_, d) => {
              const day = d + 1;
              const hrs = month.dayHours?.[d] ?? defaultHoursPerDay;
              return (
                <div
                  key={day}
                  className="flex items-center justify-between gap-1 text-[10px]"
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
                      onClick={() => adjustDayHours(index, "one", day, 1)}
                    >
                      +
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => adjustDayHours(index, "one", day, -1)}
                    >
                      −
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      {variant === "compact" ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-full text-[10px] text-destructive"
          disabled={months.length <= 1}
          onClick={() => {
            onMonthsChange(months.filter((_, i) => i !== index));
            onDeletePendingChange(null);
            onExpandedMonthChange?.(null);
          }}
        >
          {t("edit.removeMonth")}
        </Button>
      ) : null}
    </div>
  );

  if (variant === "compact") {
    return (
      <MonthListDnDProvider onReorder={moveMonth}>
        {months.map((month, index) => (
          <MonthDropRow key={index} index={index} className="space-y-1">
            <div className="flex items-center gap-1">
              <MonthDragHandle index={index} />
              <Input
                value={month.name}
                className="h-8 min-w-0 flex-1 text-xs"
                placeholder={t("edit.monthName")}
                onChange={(e) => updateMonth(index, { name: e.target.value })}
              />
              <Button
                type="button"
                variant={expandedMonthIndex === index ? "secondary" : "outline"}
                size="sm"
                className="h-8 shrink-0 px-2 text-[10px]"
                onClick={() => toggleEditMonth(index)}
              >
                {t("edit.editMonth")}
              </Button>
            </div>
            {expandedMonthIndex === index ? monthEditorPanel(month, index) : null}
          </MonthDropRow>
        ))}
        <div className="flex justify-center pt-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-full"
            onClick={() => onMonthsChange([...months, createEmptyMonth()])}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </MonthListDnDProvider>
    );
  }

  return (
    <MonthListDnDProvider onReorder={moveMonth}>
      <div className="space-y-1">
        {months.map((month, index) => (
          <MonthDropRow
            key={index}
            index={index}
            className="grid grid-cols-[16px_minmax(0,1fr)] gap-1"
          >
            <MonthDragHandle index={index} className="h-full min-h-[68px]" />
            <div className="space-y-1">
              <Input
                value={month.name}
                className="h-8 min-w-0 w-full rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground"
                placeholder={t("edit.monthName")}
                onChange={(e) => updateMonth(index, { name: e.target.value })}
              />
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-8 shrink-0"
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
                  className="size-8 shrink-0"
                  onClick={() => updateMonth(index, { days: month.days + 1 })}
                >
                  ›
                </Button>
                <Button
                  type="button"
                  variant={deletePendingIndex === index ? "destructive" : "outline"}
                  size="icon"
                  className="ml-auto size-8 shrink-0"
                  disabled={months.length <= 1}
                  onClick={() => {
                    if (deletePendingIndex === index) {
                      onMonthsChange(months.filter((_, i) => i !== index));
                      onDeletePendingChange(null);
                    } else {
                      onDeletePendingChange(index);
                    }
                  }}
                  aria-label={t("edit.removeMonth")}
                  title={t("edit.removeMonth")}
                >
                  {deletePendingIndex === index ? "✓" : "×"}
                </Button>
              </div>
            </div>
          </MonthDropRow>
        ))}

        <div className="flex justify-center pt-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-full"
            onClick={() => onMonthsChange([...months, createEmptyMonth()])}
            aria-label={t("edit.addMonth")}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>
    </MonthListDnDProvider>
  );
}
