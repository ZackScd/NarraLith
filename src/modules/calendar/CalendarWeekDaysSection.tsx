import { Check, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { useMemo, useState, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { EditableNumberInput } from "@/components/EditableNumberInput";
import { Input } from "@/components/ui/input";
import { resolveWeekDayNames, syncWeekDays } from "@/lib/calendar/weekDays";
import type { CalendarConfig } from "@/lib/types/calendar";
import {
  panelInputClass,
  panelNumberClass,
  panelSectionClass,
  panelSectionTitleClass,
  panelStaticClass,
} from "@/components/workspace-ui";
import { cn } from "@/lib/utils";

interface CalendarWeekDaysSectionProps {
  draft: CalendarConfig;
  onChange: (next: CalendarConfig) => void;
}

export function CalendarWeekDaysSection({
  draft,
  onChange,
}: CalendarWeekDaysSectionProps) {
  const { t } = useTranslation("calendarView");
  const [daysExpanded, setDaysExpanded] = useState(false);
  const [daysEditEnabled, setDaysEditEnabled] = useState(false);

  const defaultName = useMemo(
    () => (n: number) => t("edit.weekDayDefault", { n }),
    [t],
  );

  const weekDayNames = resolveWeekDayNames(draft);
  const count = Math.max(1, draft.daysPerWeek);

  const setDaysPerWeek = (daysPerWeek: number) => {
    const next = Math.max(1, daysPerWeek);
    onChange({
      ...draft,
      daysPerWeek: next,
      weekDays: syncWeekDays(next, draft.weekDays, defaultName),
    });
  };

  const updateWeekDayName = (index: number, name: string) => {
    const next = syncWeekDays(count, draft.weekDays, defaultName);
    next[index] = { name };
    onChange({ ...draft, weekDays: next });
  };

  const stopClick = (e: MouseEvent) => e.stopPropagation();
  const stopPropagation = (e: { stopPropagation: () => void }) => e.stopPropagation();

  return (
    <section className={cn(panelSectionClass, "space-y-2")}>
      <div className="flex items-center gap-2">
        <span className={cn(panelSectionTitleClass, "min-w-0 flex-1")}>
          {t("edit.daysPerWeek")}
        </span>
        <EditableNumberInput
          min={1}
          max={14}
          fallback={draft.daysPerWeek}
          className={cn(panelNumberClass, "w-16")}
          value={draft.daysPerWeek}
          onValueChange={(n) => setDaysPerWeek(n ?? draft.daysPerWeek)}
        />
      </div>

      <div className="border-t border-border/50 pt-2">
        <div
          role="button"
          tabIndex={0}
          className="flex cursor-pointer items-center gap-1"
          onClick={() => setDaysExpanded((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setDaysExpanded((prev) => !prev);
            }
          }}
        >
          {daysExpanded ? (
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          <h3 className={cn(panelSectionTitleClass, "min-w-0 flex-1")}>
            {t("edit.editWeekDays")}
          </h3>
          <Button
            type="button"
            variant={daysEditEnabled ? "secondary" : "outline"}
            size="icon"
            className="size-8 shrink-0"
            aria-label={daysEditEnabled ? t("edit.confirmEdit") : t("edit.edit")}
            title={daysEditEnabled ? t("edit.confirmEdit") : t("edit.edit")}
            onClick={(e) => {
              stopClick(e);
              setDaysEditEnabled((prev) => !prev);
            }}
          >
            {daysEditEnabled ? (
              <Check className="size-3.5" />
            ) : (
              <Pencil className="size-3.5" />
            )}
          </Button>
        </div>

        {daysExpanded ? (
          <ul className="mt-2 space-y-1 border-l border-border/50 pl-3">
            {Array.from({ length: count }, (_, index) => {
              const name = weekDayNames[index] ?? "";
              return (
                <li
                  key={`weekday-${index}`}
                  className="flex items-center gap-1.5"
                  onClick={stopPropagation}
                  onKeyDown={stopPropagation}
                >
                  <span className="w-12 shrink-0 text-[10px] font-medium text-muted-foreground">
                    {t("edit.weekDayLabel", { n: index + 1 })}
                  </span>
                  {daysEditEnabled ? (
                    <Input
                      value={name}
                      placeholder={t("edit.weekDayName")}
                      className={cn(panelInputClass, "min-w-0 flex-1")}
                      onChange={(e) => updateWeekDayName(index, e.target.value)}
                    />
                  ) : (
                    <span className={cn(panelStaticClass, "flex-1")}>
                      {name.trim() || t("edit.weekDayName")}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
