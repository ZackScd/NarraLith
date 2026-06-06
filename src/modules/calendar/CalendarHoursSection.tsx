import { Check, ChevronDown, ChevronRight, Pencil, Plus } from "lucide-react";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { EditableNumberInput } from "@/components/EditableNumberInput";
import { Input } from "@/components/ui/input";
import {
  areDayPhaseHoursAscending,
  clampDayPhases,
  clampPhaseHour,
  isGlobalDayPhasesMode,
  newDayPhaseId,
  resolveGlobalDayPhases,
  syncSeasonDayPhases,
} from "@/lib/calendar/dayPhases";
import type {
  CalendarConfig,
  CalendarDayPhase,
  CalendarSeasonDayPhases,
} from "@/lib/types/calendar";
import {
  PanelIconToggle,
  panelInputClass,
  panelNumberClass,
  panelSectionClass,
  panelSectionTitleClass,
  panelStaticClass,
} from "@/components/workspace-ui";
import { cn } from "@/lib/utils";

interface CalendarHoursSectionProps {
  draft: CalendarConfig;
  onChange: (next: CalendarConfig) => void;
}

interface DayPhasesListProps {
  phases: CalendarDayPhase[];
  hoursPerDay: number;
  editEnabled: boolean;
  deletePendingKey: string | null;
  keyPrefix: string;
  onDeletePendingChange: (key: string | null) => void;
  onPhasesChange: (phases: CalendarDayPhase[]) => void;
}

function DayPhasesList({
  phases,
  hoursPerDay,
  editEnabled,
  deletePendingKey,
  keyPrefix,
  onDeletePendingChange,
  onPhasesChange,
}: DayPhasesListProps) {
  const { t } = useTranslation("calendarView");
  const hoursAscending = areDayPhaseHoursAscending(phases);

  const updatePhase = (phaseIndex: number, patch: Partial<CalendarDayPhase>) => {
    onPhasesChange(phases.map((p, i) => (i === phaseIndex ? { ...p, ...patch } : p)));
  };

  const addPhase = () => {
    onPhasesChange([
      ...phases,
      {
        id: newDayPhaseId(),
        name: "",
        hour: clampPhaseHour(0, hoursPerDay),
      },
    ]);
  };

  const removePhase = (phaseIndex: number) => {
    if (phases.length <= 1) return;
    onPhasesChange(phases.filter((_, i) => i !== phaseIndex));
    onDeletePendingChange(null);
  };

  return (
    <>
      <div className="space-y-1">
        {phases.map((phase, phaseIndex) => {
          const pendingKey = `${keyPrefix}-${phaseIndex}`;
          const isDeletePending = deletePendingKey === pendingKey;
          return (
            <div key={phase.id} className="flex items-center gap-1">
              {editEnabled ? (
                <Input
                  value={phase.name}
                  placeholder={t("edit.phaseName")}
                  className={cn(panelInputClass, "min-w-0 flex-1")}
                  onChange={(e) => updatePhase(phaseIndex, { name: e.target.value })}
                />
              ) : (
                <span className="min-w-0 flex-1 truncate text-[10px] text-foreground">
                  {phase.name.trim() || t("edit.phaseName")}
                </span>
              )}
              {editEnabled ? (
                <EditableNumberInput
                  min={0}
                  max={Math.max(0, hoursPerDay - 1)}
                  fallback={phase.hour}
                  className={panelNumberClass}
                  value={phase.hour}
                  onValueChange={(n) =>
                    updatePhase(phaseIndex, {
                      hour: clampPhaseHour(n ?? phase.hour, hoursPerDay),
                    })
                  }
                />
              ) : (
                <span className="w-12 shrink-0 text-center text-[10px] text-muted-foreground">
                  {phase.hour}h
                </span>
              )}
              {editEnabled ? (
                <Button
                  type="button"
                  variant={isDeletePending ? "destructive" : "outline"}
                  size="icon"
                  className="size-8 shrink-0"
                  disabled={phases.length <= 1}
                  aria-label={t("edit.removePhase")}
                  title={t("edit.removePhase")}
                  onClick={() => {
                    if (isDeletePending) {
                      removePhase(phaseIndex);
                    } else {
                      onDeletePendingChange(pendingKey);
                    }
                  }}
                >
                  {isDeletePending ? "✓" : "×"}
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
      {editEnabled ? (
        <div className="flex justify-center pt-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 rounded-full"
            aria-label={t("edit.addPhase")}
            title={t("edit.addPhase")}
            onClick={addPhase}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      ) : null}
      {!hoursAscending && phases.length > 1 ? (
        <p
          className="pt-1 text-[10px] text-amber-600 dark:text-amber-500"
          role="status"
        >
          {t("edit.dayPhasesOrderWarning")}
        </p>
      ) : null}
    </>
  );
}

export function CalendarHoursSection({ draft, onChange }: CalendarHoursSectionProps) {
  const { t } = useTranslation("calendarView");
  const [phasesExpanded, setPhasesExpanded] = useState(false);
  const [phasesEditEnabled, setPhasesEditEnabled] = useState(false);
  const [deletePendingKey, setDeletePendingKey] = useState<string | null>(null);

  const isGlobalMode = isGlobalDayPhasesMode(draft.dayPhasesMode);

  const defaultLabels = useMemo(
    () => ({
      dawn: t("edit.phaseDawn"),
      noon: t("edit.phaseNoon"),
      sunset: t("edit.phaseSunset"),
      dusk: t("edit.phaseDusk"),
      midnight: t("edit.phaseMidnight"),
    }),
    [t],
  );

  const seasons = draft.seasons ?? [];
  const seasonsSyncKey = seasons.map((s) => `${s.id}\0${s.name}`).join("|");

  useEffect(() => {
    if (isGlobalMode) return;
    const existing = draft.seasonDayPhases ?? [];
    const existingById = new Map(existing.map((e) => [e.seasonId, e]));
    const needsSync =
      seasons.length !== existing.length ||
      seasons.some((s) => {
        const e = existingById.get(s.id);
        return !e || e.name !== s.name;
      }) ||
      existing.some((e) => !seasons.some((s) => s.id === e.seasonId));
    if (!needsSync) return;
    onChange({
      ...draft,
      seasonDayPhases: syncSeasonDayPhases(
        seasons,
        existing,
        draft.hoursPerDay,
        defaultLabels,
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cambiar estaciones
  }, [seasonsSyncKey, isGlobalMode]);

  const schedules =
    draft.seasonDayPhases ??
    syncSeasonDayPhases(seasons, [], draft.hoursPerDay, defaultLabels);

  const globalPhases = resolveGlobalDayPhases(draft, defaultLabels);

  const setSchedules = (next: CalendarSeasonDayPhases[]) => {
    onChange({ ...draft, seasonDayPhases: next });
  };

  const setGlobalPhases = (phases: CalendarDayPhase[]) => {
    onChange({ ...draft, globalDayPhases: phases });
  };

  const setGlobalMode = (global: boolean) => {
    setDeletePendingKey(null);
    if (global) {
      onChange({
        ...draft,
        dayPhasesMode: "global",
        globalDayPhases: resolveGlobalDayPhases(draft, defaultLabels),
      });
      return;
    }
    onChange({ ...draft, dayPhasesMode: "perSeason" });
  };

  const updateSchedule = (
    seasonIndex: number,
    patch: Partial<CalendarSeasonDayPhases>,
  ) => {
    const next = [...schedules];
    next[seasonIndex] = { ...next[seasonIndex], ...patch };
    setSchedules(next);
  };

  const onHoursPerDayChange = (hoursPerDay: number) => {
    const nextHours = Math.max(1, hoursPerDay);
    onChange({
      ...draft,
      hoursPerDay: nextHours,
      globalDayPhases: clampDayPhases(draft.globalDayPhases ?? globalPhases, nextHours),
      seasonDayPhases: (draft.seasonDayPhases ?? schedules).map((s) => ({
        ...s,
        phases: clampDayPhases(s.phases, nextHours),
      })),
    });
  };

  const stopClick = (e: MouseEvent) => e.stopPropagation();
  const stopPropagation = (e: { stopPropagation: () => void }) => e.stopPropagation();

  return (
    <section className={cn(panelSectionClass, "space-y-2")}>
      <div className="flex items-center gap-2">
        <span className={cn(panelSectionTitleClass, "min-w-0 flex-1")}>
          {t("edit.hoursPerDay")}
        </span>
        <EditableNumberInput
          min={1}
          fallback={draft.hoursPerDay}
          className={cn(panelNumberClass, "w-16")}
          value={draft.hoursPerDay}
          onValueChange={(n) => onHoursPerDayChange(n ?? draft.hoursPerDay)}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className={cn(panelSectionTitleClass, "min-w-0 flex-1")}>
          {t("edit.hoursEnabled")}
        </span>
        <PanelIconToggle
          checked={Boolean(draft.hoursEnabled)}
          onChange={(checked) => onChange({ ...draft, hoursEnabled: checked })}
          aria-label={t("edit.hoursEnabled")}
        />
      </div>

      <div className="border-t border-border/50 pt-2">
        <div
          role="button"
          tabIndex={0}
          className="flex cursor-pointer items-center gap-1"
          onClick={() => setPhasesExpanded((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setPhasesExpanded((prev) => !prev);
            }
          }}
        >
          {phasesExpanded ? (
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          <h3 className={cn(panelSectionTitleClass, "min-w-0 flex-1")}>
            {t("edit.dayPhases")}
          </h3>
          <Button
            type="button"
            variant={phasesEditEnabled ? "secondary" : "outline"}
            size="icon"
            className="size-8 shrink-0"
            aria-label={phasesEditEnabled ? t("edit.confirmEdit") : t("edit.edit")}
            title={phasesEditEnabled ? t("edit.confirmEdit") : t("edit.edit")}
            onClick={(e) => {
              stopClick(e);
              setPhasesEditEnabled((prev) => !prev);
              setDeletePendingKey(null);
            }}
          >
            {phasesEditEnabled ? (
              <Check className="size-3.5" />
            ) : (
              <Pencil className="size-3.5" />
            )}
          </Button>
        </div>

        {phasesExpanded ? (
          <div className="mt-2 space-y-2">
            {phasesEditEnabled ? (
              <div
                className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/10 p-2"
                onClick={stopPropagation}
                onKeyDown={stopPropagation}
                role="presentation"
              >
                <span className={cn(panelSectionTitleClass, "min-w-0 flex-1")}>
                  {t("edit.dayPhasesGlobal")}
                </span>
                <PanelIconToggle
                  checked={isGlobalMode}
                  onChange={setGlobalMode}
                  aria-label={t("edit.dayPhasesGlobal")}
                />
              </div>
            ) : null}

            {isGlobalMode ? (
              <div className="space-y-1.5 rounded-md border border-border/60 bg-muted/10 p-2">
                <DayPhasesList
                  phases={globalPhases}
                  hoursPerDay={draft.hoursPerDay}
                  editEnabled={phasesEditEnabled}
                  deletePendingKey={deletePendingKey}
                  keyPrefix="global"
                  onDeletePendingChange={setDeletePendingKey}
                  onPhasesChange={setGlobalPhases}
                />
              </div>
            ) : seasons.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">
                {t("edit.dayPhasesNeedSeasons")}
              </p>
            ) : (
              schedules.map((schedule, seasonIndex) => {
                const seasonName =
                  seasons.find((s) => s.id === schedule.seasonId)?.name.trim() ||
                  schedule.name.trim() ||
                  t("edit.season");
                return (
                  <div
                    key={schedule.seasonId}
                    className="space-y-1.5 rounded-md border border-border/60 bg-muted/10 p-2"
                  >
                    <span className={panelStaticClass}>{seasonName}</span>

                    <DayPhasesList
                      phases={schedule.phases}
                      hoursPerDay={draft.hoursPerDay}
                      editEnabled={phasesEditEnabled}
                      deletePendingKey={deletePendingKey}
                      keyPrefix={`season-${seasonIndex}`}
                      onDeletePendingChange={setDeletePendingKey}
                      onPhasesChange={(phases) =>
                        updateSchedule(seasonIndex, { phases })
                      }
                    />
                  </div>
                );
              })
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
