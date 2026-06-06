import { Calendar, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { BarTag } from "@/lib/types/manuscript";
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
  const displayName = eventName.trim() || t("panel.eventNamePlaceholder");

  return (
    <div
      className="narra-event-tag-bar-row flex min-h-0 w-full items-center gap-0 font-mono text-xs text-muted-foreground"
      data-event-segment-id={segmentId}
      data-event-chrome="top"
    >
      <span className="narra-event-corner shrink-0 select-none" aria-hidden>
        ┌
      </span>
      <div className="narra-event-tag-bar-inner flex min-w-0 flex-1 flex-wrap items-center gap-1.5 border-t border-border/60 px-2 py-1">
        <span className="shrink-0 font-sans text-[11px] font-medium text-foreground">
          [{t("metadata.event")}]: {displayName}
        </span>
        {timeTags.length > 0 && (
          <span className="select-none text-muted-foreground/70" aria-hidden>
            |
          </span>
        )}
        {timeTags.map((tag) => (
          <span
            key={`${tag.type}-${tag.value}`}
            className="inline-flex max-w-[14rem] items-center gap-1 rounded-full border border-border/60 bg-background px-2 py-0.5 font-sans text-[11px] text-foreground"
            title={t("metadata.time")}
          >
            <Calendar className="size-3 shrink-0 text-muted-foreground" />
            <span className="truncate">{tag.value}</span>
          </span>
        ))}
        <button
          type="button"
          className="ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-md border border-dashed border-border/60 px-1.5 py-0.5 font-sans text-[10px] text-muted-foreground hover:border-primary/40 hover:bg-muted/40 hover:text-foreground"
          title={t("panel.addBarTag")}
          aria-label={t("panel.addBarTag")}
          onClick={(e) => e.stopPropagation()}
        >
          <Tag className="size-3" aria-hidden />
          <span aria-hidden>+</span>
        </button>
      </div>
      <span className="narra-event-corner shrink-0 select-none" aria-hidden>
        ┐
      </span>
    </div>
  );
}
