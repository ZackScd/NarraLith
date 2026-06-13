import { useEffect, useMemo } from "react";

import { resolveGlobalLastAddedTime } from "@/lib/calendar/lastProjectTime";
import { renderAudit } from "@/lib/render-audit";
import { UI_EVENTS } from "@/lib/render-audit/events";
import { useProjectTimeline } from "@/hooks/useProjectTimeline";
import { buildWeekCells } from "@/modules/editor/sidePanel/SideMonthGrid";
import { useCalendarStore } from "@/stores/useCalendarStore";
import { useProjectTimelineStore } from "@/stores/useProjectTimelineStore";
import { useTimelineStore } from "@/stores/useTimelineStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

export function useCalendarPanelRenderAudit(): void {
  const mainView = useWorkspaceStore((s) => s.mainView);
  const calendar = useCalendarStore((s) => s.config);
  const focusYear = useTimelineStore((s) => s.focusYear);
  const focusMonth = useTimelineStore((s) => s.focusMonth);
  const focusDay = useTimelineStore((s) => s.focusDay);
  const { events, lastAdded } = useProjectTimeline();
  const timelineEvents = useProjectTimelineStore((s) => s.events);

  const focusDate = useMemo(() => {
    if (mainView === "timeline" && focusYear !== null) {
      return { year: focusYear, month: focusMonth ?? 1, day: focusDay ?? 1 };
    }
    const globalLast = resolveGlobalLastAddedTime(lastAdded, timelineEvents);
    return globalLast ?? { year: 0, month: 1, day: 1 };
  }, [mainView, focusYear, focusMonth, focusDay, lastAdded, timelineEvents]);

  const weekDays = useMemo(() => {
    if (!calendar) {
      return [];
    }
    return buildWeekCells(focusDate, calendar, new Set(), new Map()).map((cell) => ({
      day: cell.day,
      month: cell.month,
      year: cell.year,
      isAnchor: cell.isAnchor,
    }));
  }, [calendar, focusDate]);

  useEffect(() => {
    if (!renderAudit.isStandardEnabled()) {
      return;
    }
    if (mainView !== "editor" && mainView !== "timeline" && mainView !== "calendar") {
      return;
    }
    const timer = window.setTimeout(() => {
      renderAudit.ui(UI_EVENTS.calendarPanel.week, {
        mainView,
        focusDate,
        weekDays,
      });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [mainView, focusDate, weekDays]);

  useEffect(() => {
    if (!renderAudit.isStandardEnabled()) {
      return;
    }
    if (mainView !== "editor" && mainView !== "timeline") {
      return;
    }
    const range =
      events.length > 0
        ? {
            firstRawTime: events[0]?.rawTime ?? null,
            lastRawTime: events[events.length - 1]?.rawTime ?? null,
          }
        : null;
    renderAudit.ui(UI_EVENTS.calendarPanel.miniTimeline, {
      mainView,
      markerCount: events.length,
      range,
    });
  }, [mainView, events]);
}
