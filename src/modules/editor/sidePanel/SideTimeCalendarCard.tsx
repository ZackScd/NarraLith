import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Plus,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { formatTimeTagDisplay } from "@/lib/calendar/dateTags";
import { effectiveCalendarForYear } from "@/lib/calendar/effectiveCalendar";
import {
  formatCalendarDisplayDate,
  type CalendarDateParts,
  type CalendarDisplayDateMode,
} from "@/lib/calendar/formatCalendarDisplayDate";
import type { CalendarAnnualEvent, CalendarConfig } from "@/lib/types/calendar";
import { cn } from "@/lib/utils";

import { SideMonthGrid } from "./SideMonthGrid";
import { SideWeekStrip } from "./SideWeekStrip";

export type SideCalendarViewMode = "week" | "month";

interface DateDisplayRowProps {
  parts: CalendarDateParts | null;
  emptyLabel: string;
  calendar: CalendarConfig;
  displayMode: CalendarDisplayDateMode;
}

export function DateDisplayRow({
  parts,
  emptyLabel,
  calendar,
  displayMode,
}: DateDisplayRowProps) {
  const formatted = parts
    ? formatCalendarDisplayDate(parts, calendar, displayMode)
    : emptyLabel;

  return (
    <div className="flex items-center gap-2 rounded-md border border-border/70 bg-background/40 px-2 py-1.5">
      <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" />
      <span
        className={cn(
          "truncate text-xs",
          parts ? "text-foreground" : "text-muted-foreground/80 italic",
        )}
        title={formatted}
      >
        {formatted}
      </span>
    </div>
  );
}

interface SideTimeCalendarCardProps {
  calendar: CalendarConfig;
  displayMode: CalendarDisplayDateMode;
  documentLast: CalendarDateParts | null;
  globalLast: CalendarDateParts | null;
  showDocumentRow: boolean;
  anchor: CalendarDateParts;
  fallbackDate: CalendarDateParts;
  hasWeekAnchor: boolean;
  calendarViewMode: SideCalendarViewMode;
  onToggleViewMode: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  storyDayKeys: Set<string>;
  annualByKey: Map<string, CalendarAnnualEvent[]>;
  addTimeButton: ReactNode;
}

export function SideTimeCalendarCard({
  calendar,
  displayMode,
  documentLast,
  globalLast,
  showDocumentRow,
  anchor,
  calendarViewMode,
  onToggleViewMode,
  onPrev,
  onNext,
  onToday,
  hasWeekAnchor,
  storyDayKeys,
  annualByKey,
  addTimeButton,
}: SideTimeCalendarCardProps) {
  const { t } = useTranslation("editor");

  const monthName =
    effectiveCalendarForYear(anchor.year, calendar).months[anchor.month - 1]?.name ??
    String(anchor.month);

  const viewTitle =
    calendarViewMode === "week" ? t("panel.weekTitle") : t("panel.monthTitle");
  const prevLabel =
    calendarViewMode === "week" ? t("panel.weekPrev") : t("panel.monthPrev");
  const nextLabel =
    calendarViewMode === "week" ? t("panel.weekNext") : t("panel.monthNext");
  const toggleLabel =
    calendarViewMode === "week" ? t("panel.toggleToMonth") : t("panel.toggleToWeek");

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/40 p-3">
      {showDocumentRow ? (
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("panel.lastAddedDocumentTitle")}
          </p>
          <DateDisplayRow
            parts={documentLast}
            emptyLabel={t("panel.noLastDate")}
            calendar={calendar}
            displayMode={displayMode}
          />
        </div>
      ) : null}

      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 shrink-0"
              title={toggleLabel}
              aria-label={toggleLabel}
              onClick={onToggleViewMode}
            >
              <LayoutGrid className="size-3.5" />
            </Button>
            <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {viewTitle}
            </p>
          </div>
          <span className="shrink-0 text-[10px] text-muted-foreground/80">
            {monthName} · {anchor.year}
          </span>
        </div>

        {calendarViewMode === "week" ? (
          <SideWeekStrip
            calendar={calendar}
            anchor={anchor}
            storyDayKeys={storyDayKeys}
            annualByKey={annualByKey}
          />
        ) : (
          <SideMonthGrid
            calendar={calendar}
            anchor={anchor}
            globalLast={globalLast}
            storyDayKeys={storyDayKeys}
            annualByKey={annualByKey}
          />
        )}

        <div className="mt-2 flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-7"
            title={prevLabel}
            aria-label={prevLabel}
            onClick={onPrev}
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-7 flex-1 px-2 text-[11px]"
            title={t("panel.weekToday")}
            onClick={onToday}
            disabled={!hasWeekAnchor}
          >
            <Sparkles className="mr-1 size-3" />
            {t("panel.weekToday")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-7"
            title={nextLabel}
            aria-label={nextLabel}
            onClick={onNext}
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>

      {addTimeButton}
    </div>
  );
}

interface AddTimeButtonProps {
  canEdit: boolean;
  isEditingThisBlock: boolean;
  pendingForActive: boolean;
  displayParts: CalendarDateParts | null;
  displayHour: number | null;
  calendar: CalendarConfig;
  onClick: () => void;
}

export function SideAddTimeButton({
  canEdit,
  isEditingThisBlock,
  pendingForActive,
  displayParts,
  displayHour,
  calendar,
  onClick,
}: AddTimeButtonProps) {
  const { t } = useTranslation("editor");

  const hasTime = displayParts !== null;

  const buttonLabel = (() => {
    if (!canEdit) return t("panel.timeAddDisabled");
    if (displayParts) {
      return formatTimeTagDisplay(displayParts, {
        hour: displayHour,
        includeHour: calendar.hoursEnabled !== false,
      });
    }
    return t("panel.timeAddCta");
  })();

  return (
    <Button
      type="button"
      variant={pendingForActive || hasTime ? "secondary" : "outline"}
      className={cn(
        "h-8 w-full justify-start gap-2 px-2 text-xs",
        isEditingThisBlock && "border-primary/60 bg-primary/10",
      )}
      disabled={!canEdit}
      onClick={onClick}
      title={
        pendingForActive || hasTime ? t("panel.timeEditTooltip") : t("panel.timeAddCta")
      }
    >
      {pendingForActive || hasTime ? (
        <CalendarDays className="size-3.5 shrink-0" />
      ) : (
        <Plus className="size-3.5 shrink-0" />
      )}
      <span className="truncate">{buttonLabel}</span>
    </Button>
  );
}
