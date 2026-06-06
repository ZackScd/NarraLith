import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  findSeasonOverlapPairs,
  overlapPartnerIndices,
  seasonIndicesWithOverlap,
} from "@/lib/calendar/seasonOverlap";

import {
  createSpecialYearCycle,
  ensureCycleMonths,
} from "@/lib/calendar/specialYearMonths";
import type {
  CalendarConfig,
  CalendarSeason,
  SpecialYearCycle,
} from "@/lib/types/calendar";
import { cn } from "@/lib/utils";
import { CalendarMonthRows } from "@/modules/calendar/CalendarMonthRows";
import {
  MonthDragHandle,
  MonthDropRow,
  MonthListDnDProvider,
} from "@/modules/calendar/monthListDnD";
import {
  PanelIconToggle,
  PanelSectionHeader,
  panelInputClass,
  panelSectionClass,
  panelStaticClass,
} from "@/components/workspace-ui";
import { CalendarHoursSection } from "@/modules/calendar/CalendarHoursSection";
import { CalendarRecurringEventsSection } from "@/modules/calendar/CalendarRecurringEventsSection";
import { CalendarWeekDaysSection } from "@/modules/calendar/CalendarWeekDaysSection";
import { SpecialYearMonthsEditor } from "@/modules/calendar/SpecialYearMonthsEditor";
import { WikiPathInput } from "@/modules/calendar/WikiPathInput";
import { EditableNumberInput } from "@/components/EditableNumberInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCalendarViewStore } from "@/stores/useCalendarViewStore";
import { useEditorStore } from "@/stores/useEditorStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { normalizeCalendarConfig } from "@/lib/calendar/normalizeCalendarConfig";
import { clampHighlightOpacity } from "@/lib/calendar/seasonHighlight";
import { createEmptySeason } from "@/stores/useCalendarStore";

interface CalendarEditPanelProps {
  draft: CalendarConfig;
  onChange: (next: CalendarConfig) => void;
}

export function CalendarEditPanel({ draft, onChange }: CalendarEditPanelProps) {
  const { t } = useTranslation("calendarView");
  const editAriaLabel = t("edit.edit");
  const confirmEditAriaLabel = t("edit.confirmEdit");
  const monthDeletePending = useCalendarViewStore((s) => s.monthDeletePending);
  const setMonthDeletePending = useCalendarViewStore((s) => s.setMonthDeletePending);
  const editingSpecialYearId = useCalendarViewStore((s) => s.editingSpecialYearId);
  const setEditingSpecialYearId = useCalendarViewStore(
    (s) => s.setEditingSpecialYearId,
  );
  const expandedSpecialMonth = useCalendarViewStore((s) => s.expandedSpecialMonth);
  const setExpandedSpecialMonth = useCalendarViewStore(
    (s) => s.setExpandedSpecialMonth,
  );
  const [monthsExpanded, setMonthsExpanded] = useState(false);
  const [monthsEditEnabled, setMonthsEditEnabled] = useState(false);
  const [seasonsExpanded, setSeasonsExpanded] = useState(false);
  const [seasonsEditEnabled, setSeasonsEditEnabled] = useState(false);
  const [specialYearsExpanded, setSpecialYearsExpanded] = useState(false);
  const [specialYearsEditEnabled, setSpecialYearsEditEnabled] = useState(false);
  const calendarEditMode = useCalendarViewStore((s) => s.editExpanded);
  const requestOpenDocument = useEditorStore((s) => s.requestOpenDocument);
  const setMainView = useWorkspaceStore((s) => s.setMainView);

  const seasonOverlapPairs = useMemo(
    () => findSeasonOverlapPairs(draft.seasons ?? [], draft.months),
    [draft.seasons, draft.months],
  );
  const overlappingSeasonIndices = useMemo(
    () => seasonIndicesWithOverlap(seasonOverlapPairs),
    [seasonOverlapPairs],
  );

  const specialEnabled = draft.specialYearsEnabled !== false;

  const setSpecialEnabled = (enabled: boolean) => {
    if (!enabled) {
      onChange({ ...draft, specialYearsEnabled: false });
      setEditingSpecialYearId(null);
      setExpandedSpecialMonth(null);
      setSpecialYearsEditEnabled(false);
      return;
    }
    onChange({ ...draft, specialYearsEnabled: true });
  };

  const updateBaseMonths = (months: CalendarConfig["months"]) => {
    onChange(normalizeCalendarConfig({ ...draft, months }));
  };

  const updateSeason = (index: number, patch: Partial<CalendarSeason>) => {
    const seasons = [...(draft.seasons ?? [])];
    seasons[index] = { ...seasons[index], ...patch };
    onChange({ ...draft, seasons });
  };

  const addSeason = () => {
    const seasons = draft.seasons ?? [];
    const season = createEmptySeason(draft.months);
    if (seasons.length > 0) {
      const previous = seasons[seasons.length - 1];
      season.from = {
        month: previous.to.month,
        day: previous.to.day,
      };
      season.to = {
        month: previous.to.month,
        day: previous.to.day,
      };
    }
    onChange({
      ...draft,
      seasons: [...seasons, normalizeSeasonToMonths(season, draft.months)],
    });
  };

  const removeSeason = (index: number) => {
    onChange({
      ...draft,
      seasons: (draft.seasons ?? []).filter((_, i) => i !== index),
    });
  };

  const moveSeason = (from: number, to: number) => {
    const seasons = draft.seasons ?? [];
    if (to < 0 || to >= seasons.length || from === to) return;
    const next = [...seasons];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    onChange({ ...draft, seasons: next });
  };

  const openSeasonLinkedPath = async (path: string | undefined) => {
    const linkedPath = (path ?? "").trim();
    if (!linkedPath) return;
    await requestOpenDocument(linkedPath);
    setMainView("editor");
  };

  const updateCycle = (index: number, patch: Partial<SpecialYearCycle>) => {
    const cycles = [...(draft.specialYearCycles ?? [])];
    cycles[index] = { ...cycles[index], ...patch };
    onChange({ ...draft, specialYearCycles: cycles });
  };

  const addSpecialCycle = () => {
    const cycle = createSpecialYearCycle(draft.months, t("specialYear.defaultName"));
    onChange({
      ...draft,
      specialYearsEnabled: true,
      specialYearCycles: [...(draft.specialYearCycles ?? []), cycle],
    });
    setEditingSpecialYearId(cycle.id);
    setExpandedSpecialMonth(null);
  };

  const openCycleEditor = (cycleId: string) => {
    if (editingSpecialYearId === cycleId) return;
    const ci = (draft.specialYearCycles ?? []).findIndex((c) => c.id === cycleId);
    if (ci >= 0) {
      const cycle = draft.specialYearCycles![ci];
      if (cycle.months.length === 0) {
        updateCycle(ci, {
          months: structuredClone(draft.months),
          syncFromBase: false,
        });
      }
    }
    setEditingSpecialYearId(cycleId);
  };

  const closeCycleEditor = () => {
    setEditingSpecialYearId(null);
    setExpandedSpecialMonth(null);
  };

  const removeEditingCycle = () => {
    if (!editingSpecialYearId) return;
    onChange({
      ...draft,
      specialYearCycles: (draft.specialYearCycles ?? []).filter(
        (c) => c.id !== editingSpecialYearId,
      ),
    });
    closeCycleEditor();
  };

  return (
    <div className="calendar-edit-panel space-y-3 border-t border-border pt-3 text-xs">
      <section className={cn(panelSectionClass, "space-y-2")}>
        <PanelSectionHeader
          title={t("edit.months")}
          expanded={monthsExpanded}
          onToggleExpand={() => setMonthsExpanded((prev) => !prev)}
          editEnabled={monthsEditEnabled}
          onToggleEdit={() => setMonthsEditEnabled((prev) => !prev)}
          editAriaLabel={editAriaLabel}
          confirmEditAriaLabel={confirmEditAriaLabel}
        />
        {monthsExpanded ? (
          <div className="border-t border-border/50 pt-2">
            {monthsEditEnabled ? (
              <CalendarMonthRows
                months={draft.months}
                deletePendingIndex={monthDeletePending}
                onMonthsChange={updateBaseMonths}
                onDeletePendingChange={setMonthDeletePending}
              />
            ) : (
              <div className="space-y-1">
                {draft.months.map((m, i) => (
                  <div
                    key={`${m.name}-${i}`}
                    className="rounded-md border border-border/60 bg-muted/10 px-2 py-2 text-xs"
                  >
                    <div className="font-medium text-foreground">
                      {m.name.trim() || t("edit.monthName")}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {m.days} {t("edit.days")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </section>

      <section className={cn(panelSectionClass, "space-y-2")}>
        <PanelSectionHeader
          title={t("edit.seasons")}
          expanded={seasonsExpanded}
          onToggleExpand={() => setSeasonsExpanded((prev) => !prev)}
          editEnabled={seasonsEditEnabled}
          onToggleEdit={() => setSeasonsEditEnabled((prev) => !prev)}
          editAriaLabel={editAriaLabel}
          confirmEditAriaLabel={confirmEditAriaLabel}
        />
        {seasonsExpanded ? (
          <MonthListDnDProvider onReorder={moveSeason}>
            <div className="space-y-2 border-t border-border/50 pt-2">
              {calendarEditMode && seasonOverlapPairs.length > 0 ? (
                <div className="space-y-1" role="alert">
                  <p className="text-[10px] font-medium text-amber-600 dark:text-amber-500">
                    {t("edit.seasonOverlapSummary")}
                  </p>
                  <ul className="list-inside list-disc space-y-0.5 text-[10px] text-amber-600 dark:text-amber-500">
                    {seasonOverlapPairs.map(({ indexA, indexB }) => {
                      const nameA =
                        draft.seasons?.[indexA]?.name.trim() ||
                        t("edit.seasonNumber", { n: indexA + 1 });
                      const nameB =
                        draft.seasons?.[indexB]?.name.trim() ||
                        t("edit.seasonNumber", { n: indexB + 1 });
                      return (
                        <li key={`${indexA}-${indexB}`}>
                          {t("edit.seasonOverlapPair", { a: nameA, b: nameB })}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
              {(draft.seasons ?? []).map((season, index) => {
                const seasonSafe = normalizeSeasonToMonths(season, draft.months);
                const fromMaxDay = draft.months[seasonSafe.from.month - 1]?.days ?? 1;
                const toMaxDay = draft.months[seasonSafe.to.month - 1]?.days ?? 1;
                return (
                  <MonthDropRow
                    key={seasonSafe.id}
                    index={index}
                    className="grid grid-cols-[16px_minmax(0,1fr)] gap-2 rounded-md border border-border/60 bg-muted/10 p-2"
                  >
                    <MonthDragHandle index={index} className="h-full" />
                    <div className="space-y-1.5">
                      {seasonsEditEnabled ? (
                        <Input
                          value={seasonSafe.name}
                          placeholder={t("edit.season")}
                          className={panelInputClass}
                          onChange={(e) =>
                            updateSeason(index, { name: e.target.value })
                          }
                        />
                      ) : (
                        <span className={panelStaticClass}>
                          {seasonSafe.name.trim() || t("edit.season")}
                        </span>
                      )}
                      {seasonsEditEnabled ? (
                        <WikiPathInput
                          value={seasonSafe.linkedPath ?? ""}
                          placeholder={t("edit.seasonDescriptionLink")}
                          onChange={(linkedPath) => updateSeason(index, { linkedPath })}
                        />
                      ) : (
                        <button
                          type="button"
                          className="flex h-8 w-full items-center rounded-lg border border-border bg-muted/40 px-2 text-left text-xs text-foreground hover:bg-muted/60"
                          onClick={() =>
                            void openSeasonLinkedPath(seasonSafe.linkedPath)
                          }
                        >
                          <span className="truncate">
                            {(seasonSafe.linkedPath ?? "").trim() ||
                              t("edit.seasonDescriptionLink")}
                          </span>
                        </button>
                      )}
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span className="w-14 shrink-0">{t("edit.seasonStarts")}</span>
                        <select
                          className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs"
                          value={seasonSafe.from.month}
                          disabled={!seasonsEditEnabled}
                          onChange={(e) => {
                            const nextMonth = Number(e.target.value) || 1;
                            const maxDay = draft.months[nextMonth - 1]?.days ?? 1;
                            updateSeason(index, {
                              from: {
                                month: nextMonth,
                                day: Math.min(seasonSafe.from.day, maxDay),
                              },
                            });
                          }}
                        >
                          {draft.months.map((m, mi) => (
                            <option
                              key={`from-m-${seasonSafe.id}-${mi}`}
                              value={mi + 1}
                            >
                              {m.name || `${t("edit.month")} ${mi + 1}`}
                            </option>
                          ))}
                        </select>
                        <EditableNumberInput
                          min={1}
                          max={fromMaxDay}
                          fallback={1}
                          className="h-8 w-16 px-2 text-center text-xs"
                          value={seasonSafe.from.day}
                          disabled={!seasonsEditEnabled}
                          onValueChange={(n) =>
                            updateSeason(index, {
                              from: {
                                ...seasonSafe.from,
                                day: Math.max(1, Math.min(fromMaxDay, n ?? 1)),
                              },
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span className="w-14 shrink-0">{t("edit.seasonEnds")}</span>
                        <select
                          className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs"
                          value={seasonSafe.to.month}
                          disabled={!seasonsEditEnabled}
                          onChange={(e) => {
                            const nextMonth = Number(e.target.value) || 1;
                            const maxDay = draft.months[nextMonth - 1]?.days ?? 1;
                            updateSeason(index, {
                              to: {
                                month: nextMonth,
                                day: Math.min(seasonSafe.to.day, maxDay),
                              },
                            });
                          }}
                        >
                          {draft.months.map((m, mi) => (
                            <option key={`to-m-${seasonSafe.id}-${mi}`} value={mi + 1}>
                              {m.name || `${t("edit.month")} ${mi + 1}`}
                            </option>
                          ))}
                        </select>
                        <EditableNumberInput
                          min={1}
                          max={toMaxDay}
                          fallback={1}
                          className="h-8 w-16 px-2 text-center text-xs"
                          value={seasonSafe.to.day}
                          disabled={!seasonsEditEnabled}
                          onValueChange={(n) =>
                            updateSeason(index, {
                              to: {
                                ...seasonSafe.to,
                                day: Math.max(1, Math.min(toMaxDay, n ?? 1)),
                              },
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span className="w-14 shrink-0">
                          {t("edit.highlightColor")}
                        </span>
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <input
                            type="color"
                            className="h-8 w-10 shrink-0 cursor-pointer rounded-md border border-border bg-background p-1"
                            value={seasonSafe.highlightColor || "#3b82f6"}
                            disabled={!seasonsEditEnabled}
                            onChange={(e) =>
                              updateSeason(index, { highlightColor: e.target.value })
                            }
                            aria-label={t("edit.highlightColor")}
                          />
                          <Input
                            value={seasonSafe.highlightColor || "#3b82f6"}
                            disabled={!seasonsEditEnabled}
                            className="h-8 flex-1 text-xs"
                            onChange={(e) =>
                              updateSeason(index, { highlightColor: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="w-14 shrink-0">
                          {t("edit.highlightOpacity")}
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          disabled={!seasonsEditEnabled}
                          className="min-w-0 flex-1 accent-primary"
                          value={Math.round(
                            clampHighlightOpacity(seasonSafe.highlightOpacity) * 100,
                          )}
                          aria-label={t("edit.highlightOpacity")}
                          onChange={(e) =>
                            updateSeason(index, {
                              highlightOpacity: clampHighlightOpacity(
                                Number(e.target.value) / 100,
                              ),
                            })
                          }
                        />
                        <span className="w-9 shrink-0 text-right tabular-nums">
                          {Math.round(
                            clampHighlightOpacity(seasonSafe.highlightOpacity) * 100,
                          )}
                          %
                        </span>
                      </div>
                      {calendarEditMode && overlappingSeasonIndices.has(index) ? (
                        <p
                          className="text-[10px] text-amber-600 dark:text-amber-500"
                          role="alert"
                        >
                          {t("edit.seasonOverlapWith", {
                            names: overlapPartnerIndices(index, seasonOverlapPairs)
                              .map(
                                (pi) =>
                                  draft.seasons?.[pi]?.name.trim() ||
                                  t("edit.seasonNumber", { n: pi + 1 }),
                              )
                              .join(", "),
                          })}
                        </p>
                      ) : null}
                      {seasonsEditEnabled ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-full gap-1 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => removeSeason(index)}
                        >
                          <Trash2 className="size-3.5" />
                          {t("edit.removeSeason")}
                        </Button>
                      ) : null}
                    </div>
                  </MonthDropRow>
                );
              })}
              {seasonsEditEnabled ? (
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8 rounded-full"
                    onClick={addSeason}
                    aria-label={t("edit.addSeason")}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          </MonthListDnDProvider>
        ) : null}
      </section>

      <CalendarWeekDaysSection draft={draft} onChange={onChange} />

      <CalendarHoursSection draft={draft} onChange={onChange} />

      <section className={cn(panelSectionClass, "space-y-2")}>
        <PanelSectionHeader
          title={t("edit.specialYears")}
          expanded={specialYearsExpanded}
          onToggleExpand={() => setSpecialYearsExpanded((prev) => !prev)}
          editEnabled={specialYearsEditEnabled}
          onToggleEdit={() =>
            setSpecialYearsEditEnabled((prev) => {
              const next = !prev;
              // Si se apaga la edición global, debemos colapsar cualquier editor
              // abierto dentro de la lista (bug: quedaban aún editables).
              if (!next) closeCycleEditor();
              return next;
            })
          }
          editDisabled={!specialEnabled}
          editAriaLabel={editAriaLabel}
          confirmEditAriaLabel={confirmEditAriaLabel}
          afterTitle={
            <PanelIconToggle
              checked={specialEnabled}
              onChange={setSpecialEnabled}
              aria-label={t("edit.specialYears")}
            />
          }
        />

        {specialEnabled && specialYearsExpanded ? (
          <div className="space-y-2 border-t border-border/50 pt-2">
            {(draft.specialYearCycles ?? []).map((cycle, ci) => {
              const isEditing = editingSpecialYearId === cycle.id;
              const monthsForCycle = ensureCycleMonths(cycle, draft.months);
              const displayName = cycle.name.trim() || t("specialYear.defaultName");

              return (
                <div
                  key={cycle.id}
                  className="space-y-2 rounded-md border border-border/60 bg-muted/10 p-2"
                >
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <Input
                        value={cycle.name}
                        placeholder={t("specialYear.defaultName")}
                        className={panelInputClass}
                        onChange={(e) => updateCycle(ci, { name: e.target.value })}
                      />
                    ) : (
                      <span className={panelStaticClass}>{displayName}</span>
                    )}
                    {specialYearsEditEnabled ? (
                      <Button
                        type="button"
                        variant={isEditing ? "secondary" : "outline"}
                        size="icon"
                        className="size-8 shrink-0"
                        aria-label={isEditing ? t("edit.confirmEdit") : t("edit.edit")}
                        title={isEditing ? t("edit.confirmEdit") : t("edit.edit")}
                        onClick={() =>
                          isEditing ? closeCycleEditor() : openCycleEditor(cycle.id)
                        }
                      >
                        {isEditing ? (
                          <Check className="size-3.5" />
                        ) : (
                          <Pencil className="size-3.5" />
                        )}
                      </Button>
                    ) : null}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 border-t border-border/50 pt-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px]">
                            {t("edit.startsAtYear")}
                          </Label>
                          <EditableNumberInput
                            className={panelInputClass}
                            value={cycle.startsAtYear}
                            fallback={0}
                            onValueChange={(n) =>
                              updateCycle(ci, { startsAtYear: n ?? 0 })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-[10px]">
                            {t("edit.intervalYears")}
                          </Label>
                          <EditableNumberInput
                            min={1}
                            fallback={1}
                            className={panelInputClass}
                            value={cycle.intervalYears}
                            onValueChange={(n) =>
                              updateCycle(ci, {
                                intervalYears: Math.max(1, n ?? 1),
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px]">{t("edit.linkedPath")}</Label>
                        <WikiPathInput
                          value={cycle.linkedPath ?? ""}
                          className={panelInputClass}
                          onChange={(linkedPath) => updateCycle(ci, { linkedPath })}
                        />
                      </div>

                      <SpecialYearMonthsEditor
                        cycleId={cycle.id}
                        months={monthsForCycle}
                        expanded={expandedSpecialMonth}
                        onExpandedChange={setExpandedSpecialMonth}
                        onMonthsChange={(months) =>
                          updateCycle(ci, { months, syncFromBase: false })
                        }
                        hoursEnabled={Boolean(draft.hoursEnabled)}
                        defaultHoursPerDay={draft.hoursPerDay}
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-full gap-1 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={removeEditingCycle}
                      >
                        <Trash2 className="size-3.5" />
                        {t("edit.removeCycle")}
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {specialYearsEditEnabled ? (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-8 rounded-full"
                  onClick={addSpecialCycle}
                  aria-label={t("edit.addSpecialYear")}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <CalendarRecurringEventsSection draft={draft} onChange={onChange} />
    </div>
  );
}

function normalizeSeasonToMonths(
  season: CalendarSeason,
  months: CalendarConfig["months"],
): CalendarSeason {
  const safeMonthCount = Math.max(1, months.length);
  const clampMonth = (month: number) =>
    Math.max(1, Math.min(safeMonthCount, Number.isFinite(month) ? month : 1));
  const fromMonth = clampMonth(season.from?.month ?? 1);
  const toMonth = clampMonth(season.to?.month ?? fromMonth);
  const fromMaxDay = Math.max(1, months[fromMonth - 1]?.days ?? 1);
  const toMaxDay = Math.max(1, months[toMonth - 1]?.days ?? 1);

  return {
    ...season,
    highlightColor: season.highlightColor || "#3b82f6",
    highlightOpacity: clampHighlightOpacity(season.highlightOpacity),
    from: {
      month: fromMonth,
      day: Math.max(1, Math.min(fromMaxDay, season.from?.day ?? 1)),
    },
    to: {
      month: toMonth,
      day: Math.max(1, Math.min(toMaxDay, season.to?.day ?? 1)),
    },
  };
}
