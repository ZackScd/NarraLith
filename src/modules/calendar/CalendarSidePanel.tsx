import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  PanelAccordionTrigger,
  PanelDraftFooter,
  TimelineFiltersSection,
  WorkspaceRightPanel,
} from "@/components/workspace-ui";
import { CalendarDraftDialogs } from "@/modules/calendar/CalendarDraftDialogs";
import { CalendarEditPanel } from "@/modules/calendar/CalendarEditPanel";
import { calendarErrorI18nKey } from "@/stores/useCalendarStore";
import { useCalendarViewStore } from "@/stores/useCalendarViewStore";
import { useTimelineStore } from "@/stores/useTimelineStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import type { CalendarConfig } from "@/lib/types/calendar";

interface CalendarSidePanelProps {
  draft: CalendarConfig;
  onDraftChange: (next: CalendarConfig) => void;
}

export function CalendarSidePanel({ draft, onDraftChange }: CalendarSidePanelProps) {
  const { t } = useTranslation("calendarView");
  const { t: tCalendar } = useTranslation("calendar");
  const { t: tTimeline } = useTranslation("timeline");
  const returnView = useCalendarViewStore((s) => s.returnView);
  const setMainView = useWorkspaceStore((s) => s.setMainView);
  const editExpanded = useCalendarViewStore((s) => s.editExpanded);
  const setEditExpanded = useCalendarViewStore((s) => s.setEditExpanded);
  const guardNavigation = useCalendarViewStore((s) => s.guardNavigation);
  const isDirty = useCalendarViewStore((s) => s.isDirty);
  const saveDraft = useCalendarViewStore((s) => s.saveDraft);
  const discardDraft = useCalendarViewStore((s) => s.discardDraft);
  const isSavingDraft = useCalendarViewStore((s) => s.isSavingDraft);
  const draftValidationKey = useCalendarViewStore((s) => s.draftValidationKey);
  const setDeleteDialogOpen = useCalendarViewStore((s) => s.setDeleteDialogOpen);
  const filters = useTimelineStore((s) => s.filters);
  const toggleFilter = useTimelineStore((s) => s.toggleFilter);

  const dirty = isDirty();

  const filterLabels = useMemo(
    () => ({
      sectionFilters: t("filters"),
      sectionAnnuals: tTimeline("filters.annuals"),
      manuscript: tTimeline("filters.manuscript"),
      events: tTimeline("filters.events"),
      festivals: t("legend.festival"),
      anniversaries: t("legend.anniversary"),
      cosmic: t("legend.cosmic"),
    }),
    [t, tTimeline],
  );

  const validationMessage = draftValidationKey
    ? tCalendar(calendarErrorI18nKey(draftValidationKey))
    : null;

  return (
    <>
      <WorkspaceRightPanel
        header={
          <div className="p-3">
            <Button
              type="button"
              variant="outline"
              className="h-8 w-full justify-start gap-2 text-xs"
              onClick={() => guardNavigation(() => setMainView(returnView), "leave")}
            >
              <ArrowLeft className="size-3.5" />
              {t("back")}
            </Button>
          </div>
        }
        footer={
          editExpanded || dirty ? (
            <PanelDraftFooter
              validationMessage={validationMessage}
              saveLabel={isSavingDraft ? t("actions.saving") : t("actions.save")}
              discardLabel={t("actions.discard")}
              deleteLabel={t("deleteCalendar.button")}
              dirty={dirty}
              saving={isSavingDraft}
              onSave={() => void saveDraft()}
              onDiscard={() => discardDraft()}
              onDelete={() => setDeleteDialogOpen(true)}
            />
          ) : undefined
        }
      >
        <div className="flex flex-col p-2">
          <TimelineFiltersSection
            filters={filters}
            onToggle={toggleFilter}
            labels={filterLabels}
          />

          <PanelAccordionTrigger
            expanded={editExpanded}
            onToggle={() => setEditExpanded(!editExpanded)}
            label={t("editCalendar")}
            dirtyIndicator={
              dirty ? (
                <span
                  className="ml-auto size-1.5 shrink-0 rounded-full bg-amber-500"
                  title={t("actions.unsavedHint")}
                />
              ) : null
            }
          />

          {editExpanded ? (
            <CalendarEditPanel draft={draft} onChange={onDraftChange} />
          ) : null}
        </div>
      </WorkspaceRightPanel>

      <CalendarDraftDialogs />
    </>
  );
}
