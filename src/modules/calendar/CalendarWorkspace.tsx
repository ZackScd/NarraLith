import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useProjectTimeline } from "@/hooks/useProjectTimeline";
import {
  buildCalendarTimeEntries,
  buildStaleCalendarEntriesOutsideYear,
} from "@/lib/calendar/calendarEntries";
import { resolveInitialCalendarYear } from "@/lib/calendar/lastProjectTime";
import { CalendarMonthDetail } from "@/modules/calendar/CalendarMonthDetail";
import { CalendarMonthGrid } from "@/modules/calendar/CalendarMonthGrid";
import { CalendarMonthToolPanel } from "@/modules/calendar/CalendarMonthToolPanel";
import { CalendarSidePanel } from "@/modules/calendar/CalendarSidePanel";
import { CalendarTopBar } from "@/modules/calendar/CalendarTopBar";
import { useCalendarStore } from "@/stores/useCalendarStore";
import { useCalendarViewStore } from "@/stores/useCalendarViewStore";
import { useEditorStore } from "@/stores/useEditorStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useTimelineStore } from "@/stores/useTimelineStore";

export function CalendarWorkspace() {
  const { t } = useTranslation("calendarView");
  const config = useCalendarStore((s) => s.config);
  const baselineConfig = useCalendarStore((s) => s.baselineConfig);
  const isLoading = useCalendarStore((s) => s.isLoading);
  const loadCalendar = useCalendarStore((s) => s.loadCalendar);
  const draft = useCalendarViewStore((s) => s.draft);
  const viewYear = useCalendarViewStore((s) => s.viewYear);
  const expandedMonthIndex = useCalendarViewStore((s) => s.expandedMonthIndex);
  const initFromConfig = useCalendarViewStore((s) => s.initFromConfig);
  const setViewYear = useCalendarViewStore((s) => s.setViewYear);
  const calendarYearHydratedProjectKey = useCalendarViewStore(
    (s) => s.calendarYearHydratedProjectKey,
  );
  const calendarDraftInitializedProjectKey = useCalendarViewStore(
    (s) => s.calendarDraftInitializedProjectKey,
  );
  const setCalendarYearHydratedProjectKey = useCalendarViewStore(
    (s) => s.setCalendarYearHydratedProjectKey,
  );
  const markCalendarDraftInitialized = useCalendarViewStore(
    (s) => s.markCalendarDraftInitialized,
  );
  const resetCalendarSession = useCalendarViewStore((s) => s.resetCalendarSession);
  const setDraft = useCalendarViewStore((s) => s.setDraft);
  const { events, lastAdded, hasLoaded: timelineReady } = useProjectTimeline();
  const activeProject = useProjectStore((s) => s.activeProject);
  const filters = useTimelineStore((s) => s.filters);
  const reconciledTimeTagKeys = useEditorStore((s) => s.reconciledTimeTagKeys);
  const dataRevision = useCalendarViewStore((s) => s.dataRevision);

  const allEntries = useMemo(() => {
    if (!draft) return [];
    return buildCalendarTimeEntries(
      viewYear,
      events,
      draft,
      filters,
      baselineConfig,
      reconciledTimeTagKeys,
    );
  }, [viewYear, events, draft, filters, baselineConfig, reconciledTimeTagKeys]);

  const staleOutsideYear = useMemo(() => {
    if (!draft) return [];
    return buildStaleCalendarEntriesOutsideYear(
      viewYear,
      events,
      draft,
      filters,
      baselineConfig,
      reconciledTimeTagKeys,
    );
  }, [viewYear, events, draft, filters, baselineConfig, reconciledTimeTagKeys]);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  /** Al cambiar de proyecto, reiniciar flags de sesión del calendario. */
  useEffect(() => {
    if (!activeProject) {
      resetCalendarSession();
      return;
    }

    const projectKey = activeProject.rootPath;
    const sessionBound =
      calendarYearHydratedProjectKey ?? calendarDraftInitializedProjectKey;
    if (sessionBound !== null && sessionBound !== projectKey) {
      resetCalendarSession();
    }
  }, [
    activeProject,
    calendarYearHydratedProjectKey,
    calendarDraftInitializedProjectKey,
    resetCalendarSession,
  ]);

  /** Carga el borrador una vez por proyecto y sesión (persiste al remontar la vista). */
  useEffect(() => {
    if (!config || !activeProject) return;

    const projectKey = activeProject.rootPath;
    if (calendarDraftInitializedProjectKey === projectKey) return;

    initFromConfig(config);
    markCalendarDraftInitialized(projectKey);
  }, [
    config,
    activeProject,
    calendarDraftInitializedProjectKey,
    initFromConfig,
    markCalendarDraftInitialized,
  ]);

  /** Año inicial del manuscrito: una vez por proyecto y sesión de app. */
  useEffect(() => {
    if (!config || !timelineReady || !activeProject) return;

    const projectKey = activeProject.rootPath;
    if (calendarYearHydratedProjectKey === projectKey) return;

    setViewYear(resolveInitialCalendarYear(events, config, lastAdded));
    setCalendarYearHydratedProjectKey(projectKey);
  }, [
    config,
    timelineReady,
    events,
    lastAdded,
    activeProject,
    calendarYearHydratedProjectKey,
    setViewYear,
    setCalendarYearHydratedProjectKey,
  ]);

  if (isLoading || !draft) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  const monthOpen = expandedMonthIndex !== null;

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <CalendarTopBar config={draft} events={events} />
        {monthOpen ? (
          <CalendarMonthDetail
            key={dataRevision}
            year={viewYear}
            monthIndex={expandedMonthIndex}
            config={draft}
            events={events}
            filters={filters}
          />
        ) : (
          <CalendarMonthGrid
            key={dataRevision}
            year={viewYear}
            config={draft}
            events={events}
            filters={filters}
          />
        )}
      </div>

      {monthOpen ? (
        <CalendarMonthToolPanel
          config={draft}
          year={viewYear}
          monthIndex={expandedMonthIndex}
          allEntries={allEntries}
          staleOutsideYear={staleOutsideYear}
        />
      ) : (
        <CalendarSidePanel
          draft={draft}
          onDraftChange={setDraft}
          staleOutsideYear={staleOutsideYear}
        />
      )}
    </div>
  );
}
