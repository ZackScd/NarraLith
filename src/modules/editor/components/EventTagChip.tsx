import { Bookmark } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ManuscriptTagChip } from "@/modules/editor/components/ManuscriptTagChip";
import { useEditorStore } from "@/stores/useEditorStore";
import { useEventFramePendingStore } from "@/stores/useEventFramePendingStore";

interface EventTagChipProps {
  segmentId: string;
  eventName: string;
  visible?: boolean;
}

export function EventTagChip({ segmentId, eventName, visible = true }: EventTagChipProps) {
  const { t } = useTranslation("editor");
  const label = eventName.trim() || t("panel.eventNamePlaceholder");
  const pendingTagDelete = useEventFramePendingStore((s) => s.pendingTagDelete);
  const setPendingTagDelete = useEventFramePendingStore((s) => s.setPendingTagDelete);
  const clearPending = useEventFramePendingStore((s) => s.clearPending);
  const removeEventFromEditor = useEditorStore((s) => s.removeEventFromEditor);
  const isPending = pendingTagDelete === segmentId;

  if (!visible) {
    return null;
  }

  return (
    <button
      type="button"
      className="inline-flex max-w-[14rem] shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      title={isPending ? t("eventFrame.deleteEventConfirm") : t("metadata.event")}
      aria-label={
        isPending ? t("eventFrame.deleteEventConfirm") : t("eventFrame.deleteEventPending")
      }
      data-event-pending-target="tag"
      onClick={(e) => {
        e.stopPropagation();
        if (isPending) {
          if (removeEventFromEditor(segmentId)) {
            clearPending();
          }
          return;
        }
        setPendingTagDelete(segmentId);
      }}
    >
      <ManuscriptTagChip
        icon={Bookmark}
        label={label}
        title={t("metadata.event")}
        visible
        invalid={isPending}
      />
    </button>
  );
}
