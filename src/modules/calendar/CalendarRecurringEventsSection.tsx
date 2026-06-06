import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { EditableNumberInput } from "@/components/EditableNumberInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createEmptyAnnualEvent,
  normalizeAnnualKind,
  RECURRING_EVENT_KINDS,
} from "@/lib/calendar/recurringEvents";
import type { CalendarAnnualEvent, CalendarConfig } from "@/lib/types/calendar";
import {
  PanelSectionHeader,
  panelInputClass,
  panelSectionClass,
} from "@/components/workspace-ui";
import { WikiPathInput } from "@/modules/calendar/WikiPathInput";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/useEditorStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

interface CalendarRecurringEventsSectionProps {
  draft: CalendarConfig;
  onChange: (next: CalendarConfig) => void;
}

function recurringWarnings(event: CalendarAnnualEvent): ("day" | "interval")[] {
  const out: ("day" | "interval")[] = [];
  if (event.day === 0) out.push("day");
  if (event.repeatEveryYears === 0) out.push("interval");
  return out;
}

function RecurringEventReadOnly({
  event,
  monthName,
  maxDay,
  kindLabelText,
  hoursEnabled,
  onOpenLinkedPath,
  t,
}: {
  event: CalendarAnnualEvent;
  monthName: string;
  maxDay: number;
  kindLabelText: string;
  hoursEnabled: boolean;
  onOpenLinkedPath: () => void;
  t: (key: string, opts?: { day?: number }) => string;
}) {
  const linkedPath = (event.linkedPath ?? "").trim();
  const dayLabel =
    event.day >= 1 && event.day <= maxDay
      ? t("edit.dayN", { day: event.day })
      : t("edit.day");
  const hourValue = event.hour != null ? `${event.hour}h` : "—";
  const intervalValue =
    event.repeatEveryYears != null ? String(event.repeatEveryYears) : "—";

  const detailClass = "text-[10px] text-muted-foreground";
  const valueClass = "text-foreground/85";

  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "min-w-0 text-xs font-medium",
            event.name.trim() ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {event.name.trim() || t("edit.eventName")}
        </span>
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {kindLabelText}
        </span>
      </div>

      <p className={detailClass}>
        {monthName} · {dayLabel}
      </p>

      <div
        className={cn(
          "grid gap-x-4 gap-y-0.5",
          hoursEnabled ? "grid-cols-2" : "grid-cols-1",
        )}
      >
        {hoursEnabled ? (
          <p className={detailClass}>
            {t("edit.eventHourOptional")}:{" "}
            <span className={valueClass}>{hourValue}</span>
          </p>
        ) : null}
        <p className={detailClass}>
          {t("edit.eventTimeInterval")}:{" "}
          <span className={valueClass}>{intervalValue}</span>
        </p>
      </div>

      <p className={detailClass}>
        {t("edit.linkedPath")}:{" "}
        {linkedPath ? (
          <button
            type="button"
            className={cn(valueClass, "text-left text-primary hover:underline")}
            onClick={onOpenLinkedPath}
          >
            {linkedPath}
          </button>
        ) : (
          <span className={valueClass}>—</span>
        )}
      </p>

      <p className={detailClass}>
        {t("edit.eventFirstCountedYear")}:{" "}
        <span className={valueClass}>{event.startsAtYear}</span>
      </p>
    </div>
  );
}

export function CalendarRecurringEventsSection({
  draft,
  onChange,
}: CalendarRecurringEventsSectionProps) {
  const { t } = useTranslation("calendarView");
  const [expanded, setExpanded] = useState(false);
  const [editEnabled, setEditEnabled] = useState(false);
  const [deletePendingIndex, setDeletePendingIndex] = useState<number | null>(null);
  const requestOpenDocument = useEditorStore((s) => s.requestOpenDocument);
  const setMainView = useWorkspaceStore((s) => s.setMainView);

  const events = draft.annualEvents ?? [];
  const hoursEnabled = Boolean(draft.hoursEnabled);
  const maxHour = Math.max(0, draft.hoursPerDay - 1);

  const updateAnnual = (index: number, patch: Partial<CalendarAnnualEvent>) => {
    onChange({
      ...draft,
      annualEvents: events.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    });
  };

  const removeAnnual = (index: number) => {
    setDeletePendingIndex(null);
    onChange({
      ...draft,
      annualEvents: events.filter((_, i) => i !== index),
    });
  };

  const addAnnual = () => {
    setExpanded(true);
    onChange({
      ...draft,
      annualEvents: [...events, createEmptyAnnualEvent()],
    });
  };

  const openLinkedPath = async (path: string | undefined) => {
    const linkedPath = (path ?? "").trim();
    if (!linkedPath) return;
    await requestOpenDocument(linkedPath);
    setMainView("editor");
  };

  const kindLabel = (kind: string) => {
    const k = normalizeAnnualKind(kind);
    if (k === "anniversary") return t("edit.kindAnniversary");
    if (k === "cosmic") return t("edit.kindStellar");
    return t("edit.kindFestival");
  };

  const selectClass =
    "h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs";

  return (
    <section className={cn(panelSectionClass, "space-y-2")}>
      <PanelSectionHeader
        title={t("edit.recurringDates")}
        expanded={expanded}
        onToggleExpand={() => setExpanded((prev) => !prev)}
        editEnabled={editEnabled}
        onToggleEdit={() => {
          setEditEnabled((prev) => !prev);
          setDeletePendingIndex(null);
        }}
        editAriaLabel={t("edit.edit")}
        confirmEditAriaLabel={t("edit.confirmEdit")}
      />

      {expanded ? (
        <div className="space-y-2 border-t border-border/50 pt-2">
          {events.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">
              {t("edit.recurringEmpty")}
            </p>
          ) : null}

          <ul className="space-y-2 border-l border-border/50 pl-3">
            {events.map((event, index) => {
              const kind = normalizeAnnualKind(event.kind);
              const monthIndex = Math.max(
                1,
                Math.min(draft.months.length, event.month),
              );
              const maxDay = draft.months[monthIndex - 1]?.days ?? 1;
              const monthName =
                draft.months[monthIndex - 1]?.name ||
                `${t("edit.month")} ${monthIndex}`;
              const isDeletePending = deletePendingIndex === index;
              const warnings = recurringWarnings(event);
              const daySelectValue =
                event.day >= 1 && event.day <= maxDay ? String(event.day) : "";

              return (
                <li
                  key={event.id}
                  className="space-y-1.5 rounded-md border border-border/60 bg-muted/10 p-2"
                >
                  {editEnabled ? (
                    <>
                      <Input
                        value={event.name}
                        placeholder={t("edit.eventName")}
                        className={panelInputClass}
                        onChange={(e) => updateAnnual(index, { name: e.target.value })}
                      />

                      <div className="flex items-center gap-1">
                        <>
                          <select
                            className={selectClass}
                            aria-label={t("edit.month")}
                            value={monthIndex}
                            onChange={(e) => {
                              const nextMonth = Number(e.target.value) || 1;
                              const nextMax = draft.months[nextMonth - 1]?.days ?? 1;
                              const nextDay =
                                event.day >= 1 && event.day <= nextMax
                                  ? event.day
                                  : event.day === 0
                                    ? 0
                                    : Math.min(Math.max(1, event.day), nextMax);
                              updateAnnual(index, {
                                month: nextMonth,
                                day: nextDay,
                              });
                            }}
                          >
                            {draft.months.map((m, mi) => (
                              <option key={`ev-m-${event.id}-${mi}`} value={mi + 1}>
                                {m.name || `${t("edit.month")} ${mi + 1}`}
                              </option>
                            ))}
                          </select>
                          <select
                            className={cn(selectClass, "max-w-[42%]")}
                            aria-label={t("edit.day")}
                            value={daySelectValue}
                            onChange={(e) => {
                              const raw = e.target.value;
                              updateAnnual(index, {
                                day: raw === "" ? 0 : Number(raw),
                              });
                            }}
                          >
                            <option value="">{t("edit.day")}</option>
                            {Array.from({ length: maxDay }, (_, di) => {
                              const d = di + 1;
                              return (
                                <option key={`ev-d-${event.id}-${d}`} value={d}>
                                  {t("edit.dayN", { day: d })}
                                </option>
                              );
                            })}
                          </select>
                        </>
                      </div>

                      <div className="flex items-start gap-1">
                        {hoursEnabled ? (
                          <EditableNumberInput
                            min={0}
                            max={maxHour}
                            nullable
                            placeholder={t("edit.eventHourOptional")}
                            className={cn(panelInputClass, "min-w-0 flex-1")}
                            value={event.hour ?? null}
                            onValueChange={(n) => updateAnnual(index, { hour: n })}
                          />
                        ) : null}
                        <EditableNumberInput
                          min={0}
                          nullable
                          placeholder={t("edit.eventTimeInterval")}
                          className={cn(panelInputClass, "min-w-0 flex-1")}
                          value={event.repeatEveryYears ?? null}
                          onValueChange={(n) =>
                            updateAnnual(index, {
                              repeatEveryYears: n,
                            })
                          }
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <WikiPathInput
                          value={event.linkedPath ?? ""}
                          placeholder={t("edit.linkedPath")}
                          className={cn(panelInputClass, "min-w-0 flex-1")}
                          onChange={(linkedPath) => updateAnnual(index, { linkedPath })}
                        />
                        <select
                          className="h-8 w-28 shrink-0 rounded-md border border-input bg-background px-2 text-xs"
                          aria-label={t("edit.kindFestival")}
                          value={kind}
                          onChange={(e) =>
                            updateAnnual(index, {
                              kind: normalizeAnnualKind(e.target.value),
                            })
                          }
                        >
                          {RECURRING_EVENT_KINDS.map((k) => (
                            <option key={k} value={k}>
                              {kindLabel(k)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1">
                        <EditableNumberInput
                          placeholder={t("edit.eventFirstCountedYear")}
                          className={cn(panelInputClass, "min-w-0 flex-1")}
                          value={event.startsAtYear}
                          fallback={0}
                          onValueChange={(n) =>
                            updateAnnual(index, { startsAtYear: n ?? 0 })
                          }
                        />
                        <Button
                          type="button"
                          variant={isDeletePending ? "destructive" : "outline"}
                          size="icon"
                          className="size-8 shrink-0"
                          aria-label={t("edit.removeRecurring")}
                          title={t("edit.removeRecurring")}
                          onClick={() => {
                            if (isDeletePending) {
                              removeAnnual(index);
                            } else {
                              setDeletePendingIndex(index);
                            }
                          }}
                        >
                          {isDeletePending ? "✓" : "×"}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <RecurringEventReadOnly
                      event={event}
                      monthName={monthName}
                      maxDay={maxDay}
                      kindLabelText={kindLabel(kind)}
                      hoursEnabled={hoursEnabled}
                      onOpenLinkedPath={() => void openLinkedPath(event.linkedPath)}
                      t={t}
                    />
                  )}

                  {warnings.length > 0 ? (
                    <div className="space-y-0.5">
                      {warnings.includes("day") ? (
                        <p className="text-[10px] text-amber-600 dark:text-amber-500">
                          {t("edit.warnRecurringDayZero")}
                        </p>
                      ) : null}
                      {warnings.includes("interval") ? (
                        <p className="text-[10px] text-amber-600 dark:text-amber-500">
                          {t("edit.warnRecurringIntervalZero")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {editEnabled ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 rounded-full"
                aria-label={t("edit.addRecurring")}
                title={t("edit.addRecurring")}
                onClick={addAnnual}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
