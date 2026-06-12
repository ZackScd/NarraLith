import { Tag } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { BarTag } from "@/lib/types/manuscript";
import { EventTagChip } from "@/modules/editor/components/EventTagChip";
import { TimeTagChip } from "@/modules/editor/components/TimeTagChip";
import { useLayoutStore } from "@/stores/useLayoutStore";

interface EventTagBarProps {
  segmentId: string;
  eventName: string;
  barTags: BarTag[];
}

function timeBarTags(tags: BarTag[]): BarTag[] {
  return tags.filter((t) => t.type === "time" && t.value.trim().length > 0);
}

export function EventTagBar({ segmentId, eventName, barTags }: EventTagBarProps) {
  const { t } = useTranslation("editor");
  const visible = useLayoutStore((s) => s.inlineMetadataVisible);

  if (!visible) {
    return null;
  }

  const timeTags = timeBarTags(barTags);

  return (
    <div
      className="narra-event-tags-row flex flex-wrap items-center gap-1.5 py-1"
      data-event-segment-id={segmentId}
    >
      <EventTagChip segmentId={segmentId} eventName={eventName} />
      {timeTags.map((tag) => (
        <TimeTagChip
          key={`${tag.type}-${tag.value}-${tag.hour ?? ""}`}
          value={tag.value}
          hour={tag.hour}
        />
      ))}
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
