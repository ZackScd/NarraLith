import { useTranslation } from "react-i18next";

import { TimeEntryRow } from "@/components/workspace-ui";
import {
  calendarEntryColor,
  calendarEntryTooltip,
  type CalendarTimeEntry,
} from "@/lib/calendar/calendarEntries";
import { useEditorStore } from "@/stores/useEditorStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

interface CalendarStaleEntriesSectionProps {
  entries: CalendarTimeEntry[];
  className?: string;
}

export function CalendarStaleEntriesSection({
  entries,
  className,
}: CalendarStaleEntriesSectionProps) {
  const { t } = useTranslation("calendarView");
  const { t: tEditor } = useTranslation("editor");
  const requestOpenDocument = useEditorStore((s) => s.requestOpenDocument);
  const setMainView = useWorkspaceStore((s) => s.setMainView);

  if (entries.length === 0) return null;

  const openEntry = (entry: CalendarTimeEntry) => {
    if (entry.kind === "file" && entry.path) {
      void requestOpenDocument(entry.path);
      setMainView("editor");
    }
  };

  return (
    <div className={className}>
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-destructive">
        {t("staleEntries.title", { count: entries.length })}
      </p>
      <p className="mb-2 text-[10px] text-muted-foreground">{t("staleEntries.hint")}</p>
      <div className="space-y-1">
        {entries.map((entry) => (
          <TimeEntryRow
            key={entry.id}
            color={calendarEntryColor(entry)}
            label={entry.label}
            subtitle={entry.dateLabel}
            stale
            title={calendarEntryTooltip(tEditor, entry)}
            onClick={() => openEntry(entry)}
          />
        ))}
      </div>
    </div>
  );
}
