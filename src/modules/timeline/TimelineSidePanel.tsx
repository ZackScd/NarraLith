import {
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  Calendar,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  PanelAccordionTrigger,
  PanelFilterCheckbox,
  PanelIconToggle,
  TimelineFiltersSection,
} from "@/components/workspace-ui";
import { Button } from "@/components/ui/button";
import { useTimelineStore } from "@/stores/useTimelineStore";

import { TIMELINE_CALENDAR_ROW_H } from "@/modules/timeline/TimelineView";
import { useCalendarViewStore } from "@/stores/useCalendarViewStore";
import { useLayoutStore } from "@/stores/useLayoutStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

export function TimelineSidePanel() {
  const { t } = useTranslation("timeline");
  const orientation = useTimelineStore((s) => s.orientation);
  const setOrientation = useTimelineStore((s) => s.setOrientation);
  const filters = useTimelineStore((s) => s.filters);
  const toggleFilter = useTimelineStore((s) => s.toggleFilter);
  const collapseDeadTime = useTimelineStore((s) => s.collapseDeadTime);
  const collapseLevels = useTimelineStore((s) => s.collapseLevels);
  const setCollapseDeadTime = useTimelineStore((s) => s.setCollapseDeadTime);
  const setCollapseLevel = useTimelineStore((s) => s.setCollapseLevel);
  const rightPanelCollapsed = useLayoutStore((s) => s.rightPanelCollapsed);
  const toggleRightPanelCollapsed = useLayoutStore((s) => s.toggleRightPanelCollapsed);
  const setMainView = useWorkspaceStore((s) => s.setMainView);
  const setReturnView = useCalendarViewStore((s) => s.setReturnView);
  const [collapseExpanded, setCollapseExpanded] = useState(false);

  const filterLabels = useMemo(
    () => ({
      sectionFilters: t("panel.filters"),
      sectionAnnuals: t("filters.annuals"),
      sectionCollapsePeriods: t("panel.collapsePeriods"),
      manuscript: t("filters.manuscript"),
      events: t("filters.events"),
      festivals: t("filters.festivals"),
      anniversaries: t("filters.anniversaries"),
      cosmic: t("filters.cosmic"),
      collapseYears: t("panel.collapseYears"),
      collapseMonths: t("panel.collapseMonths"),
      collapseDays: t("panel.collapseDays"),
      collapseHours: t("panel.collapseHours"),
    }),
    [t],
  );

  const openCalendar = () => {
    setReturnView("timeline");
    setMainView("calendar");
  };

  if (rightPanelCollapsed) {
    return (
      <aside
        className="flex h-full w-full shrink-0 flex-col items-center gap-1 border-l border-border bg-card py-2"
        aria-label={t("panel.title")}
      >
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          title={t("panel.expandTools")}
          onClick={toggleRightPanelCollapsed}
        >
          <PanelRightOpen className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={orientation === "horizontal" ? "secondary" : "ghost"}
          className="size-8"
          title={t("panel.horizontal")}
          onClick={() => setOrientation("horizontal")}
        >
          <AlignHorizontalJustifyCenter className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 opacity-50"
          disabled
          title={t("panel.verticalSoon")}
        >
          <AlignVerticalJustifyCenter className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          title={t("panel.calendar")}
          onClick={openCalendar}
        >
          <Calendar className="size-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside
      className="flex h-full w-full shrink-0 flex-col border-l border-border bg-card"
      aria-label={t("panel.title")}
    >
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-card/70 px-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-7 shrink-0"
          title={t("panel.collapseTools")}
          onClick={toggleRightPanelCollapsed}
        >
          <PanelRightClose className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant={orientation === "horizontal" ? "secondary" : "outline"}
          size="icon"
          className="size-7 shrink-0"
          aria-pressed={orientation === "horizontal"}
          title={t("panel.horizontal")}
          onClick={() => setOrientation("horizontal")}
        >
          <AlignHorizontalJustifyCenter className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-7 shrink-0 opacity-50"
          disabled
          title={t("panel.verticalSoon")}
          aria-pressed={false}
        >
          <AlignVerticalJustifyCenter className="size-3.5" />
        </Button>
      </div>

      <div
        className={`${TIMELINE_CALENDAR_ROW_H} flex shrink-0 items-center border-b border-border px-3`}
      >
        <Button
          type="button"
          variant="outline"
          className="h-8 w-full justify-start gap-2 px-3 text-xs"
          title={t("panel.calendar")}
          onClick={openCalendar}
        >
          <Calendar className="size-3.5 shrink-0" />
          {t("panel.calendar")}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2">
        <PanelAccordionTrigger
          expanded={collapseExpanded}
          onToggle={() => setCollapseExpanded((prev) => !prev)}
          label={filterLabels.sectionCollapsePeriods}
          className="mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-normal hover:bg-muted/60"
          dirtyIndicator={
            <div
              className="ml-auto"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <PanelIconToggle
                checked={collapseDeadTime}
                onChange={setCollapseDeadTime}
                aria-label={t("panel.collapseDeadTime")}
              />
            </div>
          }
        />
        {collapseExpanded ? (
          <div className="mb-2">
            <PanelFilterCheckbox
              checked={collapseLevels.years}
              label={filterLabels.collapseYears}
              onCheckedChange={() => setCollapseLevel("years", !collapseLevels.years)}
            />
            <PanelFilterCheckbox
              checked={collapseLevels.months}
              label={filterLabels.collapseMonths}
              onCheckedChange={() => setCollapseLevel("months", !collapseLevels.months)}
              indent
            />
            <PanelFilterCheckbox
              checked={collapseLevels.days}
              label={filterLabels.collapseDays}
              onCheckedChange={() => setCollapseLevel("days", !collapseLevels.days)}
              indent
            />
            <PanelFilterCheckbox
              checked={collapseLevels.hours}
              label={filterLabels.collapseHours}
              onCheckedChange={() => setCollapseLevel("hours", !collapseLevels.hours)}
              indent
            />
          </div>
        ) : null}

        <TimelineFiltersSection
          filters={filters}
          onToggle={toggleFilter}
          labels={filterLabels}
        />
      </div>
    </aside>
  );
}
