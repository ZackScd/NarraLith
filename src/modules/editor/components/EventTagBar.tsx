import { Tag } from "lucide-react";
import { useTranslation } from "react-i18next";

import { barTimeTagReconcileKey } from "@/lib/calendar/timeTagReconcile";
import type { BarTag } from "@/lib/types/manuscript";
import { timeDraftFromRawTag } from "@/lib/editor/timeTagDraft";
import { EventTagChip } from "@/modules/editor/components/EventTagChip";
import { TimeTagChip } from "@/modules/editor/components/TimeTagChip";
import { useCalendarStore } from "@/stores/useCalendarStore";
import { useEditorStore } from "@/stores/useEditorStore";
import { useLayoutStore } from "@/stores/useLayoutStore";
import { useTimeTagDialogStore } from "@/stores/useTimeTagDialogStore";

interface EventTagBarProps {
  segmentId: string;
  segmentIndex: number;
  eventName: string;
  barTags: BarTag[];
}

export function EventTagBar({
  segmentId,
  segmentIndex,
  eventName,
  barTags,
}: EventTagBarProps) {
  const { t } = useTranslation("editor");
  const visible = useLayoutStore((s) => s.inlineMetadataVisible);
  const calendar = useCalendarStore((s) => s.config);
  const reconciledTimeTagKeys = useEditorStore((s) => s.reconciledTimeTagKeys);
  const openTimeDialog = useTimeTagDialogStore((s) => s.open);

  if (!visible) {
    return null;
  }

  const openBarTagEdit = (tagIndex: number, tag: BarTag, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const filePath = useEditorStore.getState().activeFilePath;
    if (!filePath || !calendar) {
      return;
    }
    openTimeDialog({
      filePath,
      blockIndex: segmentIndex + 1,
      initial: timeDraftFromRawTag(tag.value, calendar, tag.hour ?? null),
      mode: "edit",
      editTarget: { kind: "bar", segmentId, tagIndex },
      position: { x: event.clientX + 12, y: event.clientY + 12 },
    });
  };

  return (
    <div
      className="narra-event-tags-row flex flex-wrap items-center gap-1.5 py-1"
      data-event-segment-id={segmentId}
    >
      <EventTagChip segmentId={segmentId} eventName={eventName} />
      {barTags.map((tag, tagIndex) => {
        if (tag.type !== "time" || !tag.value.trim()) {
          return null;
        }
        return (
          <TimeTagChip
            key={`${segmentId}:${tagIndex}:${tag.value}`}
            value={tag.value}
            hour={tag.hour}
            calendarReconciled={
              tag.calendarReconciled === true ||
              reconciledTimeTagKeys.has(barTimeTagReconcileKey(segmentId, tagIndex))
            }
            onClick={(event) => openBarTagEdit(tagIndex, tag, event)}
          />
        );
      })}
      <button
        type="button"
        className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-dashed border-border/60 px-2 py-0.5 font-sans text-[10px] text-muted-foreground hover:border-primary/40 hover:bg-muted/40 hover:text-foreground"
        title={t("panel.addBarTag")}
        aria-label={t("panel.addBarTag")}
        onClick={(e) => e.stopPropagation()}
      >
        <Tag className="size-3" aria-hidden />
        <span aria-hidden>+</span>
      </button>
    </div>
  );
}
