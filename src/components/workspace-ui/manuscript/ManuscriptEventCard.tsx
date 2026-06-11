import { Minus, Plus } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PanelGroupLabel } from "@/components/workspace-ui/PanelGroupLabel";
import { panelInputClass, panelTextareaClass } from "@/components/workspace-ui/tokens";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/useEditorStore";
import { useManuscriptLabelDraftStore } from "@/stores/useManuscriptLabelDraftStore";

export interface ManuscriptEventCardProps {
  sectionTitle: string;
  namePlaceholder: string;
  descriptionPlaceholder: string;
  closeAriaLabel: string;
  expandAriaLabel: string;
}

/** Tarjeta de evento en el panel lateral: staging RAM + cierre `[-]` / expansión `[+]`. */
export function ManuscriptEventCard({
  sectionTitle,
  namePlaceholder,
  descriptionPlaceholder,
  closeAriaLabel,
  expandAriaLabel,
}: ManuscriptEventCardProps) {
  const activeFilePath = useEditorStore((s) => s.activeFilePath);
  const manuscript = useEditorStore((s) => s.manuscript);
  const activeEventContext = useEditorStore((s) => s.activeEventContext);
  const closeEventAtCursor = useEditorStore((s) => s.closeEventAtCursor);
  const expandEventAtCursor = useEditorStore((s) => s.expandEventAtCursor);
  const stageEvent = useManuscriptLabelDraftStore((s) => s.stageEvent);
  const pending = useManuscriptLabelDraftStore((s) => s.pending);

  const currentEvent = useMemo(() => {
    if (
      !manuscript ||
      !activeEventContext.inEvent ||
      activeEventContext.segmentIndex === null
    ) {
      return null;
    }
    const segment = manuscript.segments.find(
      (s) => s.kind === "event" && s.segmentIndex === activeEventContext.segmentIndex,
    );
    return segment?.kind === "event" ? segment : null;
  }, [manuscript, activeEventContext]);

  const pendingEvent = useMemo(() => {
    if (!pending || pending.filePath !== activeFilePath || !pending.event) {
      return null;
    }
    const draftSeg = pending.eventSegmentIndex;
    const activeSeg = activeEventContext.segmentIndex;
    // Borrador de nuevo evento (segmentIndex null) solo fuera de un tramo existente.
    if (draftSeg === null) {
      if (activeEventContext.inEvent && activeSeg !== null) {
        return null;
      }
      return pending.event;
    }
    if (activeSeg === null || draftSeg !== activeSeg) {
      return null;
    }
    return pending.event;
  }, [pending, activeFilePath, activeEventContext]);

  const name = pendingEvent?.name ?? currentEvent?.name ?? "";
  const description = pendingEvent?.description ?? currentEvent?.description ?? "";

  const pushDraft = (nextName: string, nextDescription: string) => {
    if (!activeFilePath) {
      return;
    }
    stageEvent({
      filePath: activeFilePath,
      name: nextName,
      description: nextDescription,
      segmentIndex: activeEventContext.inEvent ? activeEventContext.segmentIndex : null,
    });
  };

  const canClose =
    activeEventContext.inEvent &&
    !activeEventContext.eventClosed &&
    Boolean(activeFilePath);

  const canExpand =
    activeEventContext.inEvent &&
    activeEventContext.eventClosed &&
    Boolean(activeFilePath);

  const toggleEventSpan = canClose || canExpand;

  return (
    <div className="manuscript-event-card space-y-2 rounded-lg border border-border bg-card/40 p-3">
      <PanelGroupLabel className="px-0 pb-0">{sectionTitle}</PanelGroupLabel>

      <div className="flex items-center gap-1">
        <Input
          value={name}
          onChange={(e) => pushDraft(e.target.value, description)}
          placeholder={namePlaceholder}
          className={cn(panelInputClass, "min-w-0 flex-1")}
          aria-label={namePlaceholder}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          aria-label={canClose ? closeAriaLabel : expandAriaLabel}
          title={canClose ? closeAriaLabel : expandAriaLabel}
          disabled={!toggleEventSpan}
          onClick={() => {
            if (canClose) {
              closeEventAtCursor();
              return;
            }
            if (canExpand) {
              expandEventAtCursor();
            }
          }}
        >
          {canClose ? <Minus className="size-3.5" /> : <Plus className="size-3.5" />}
        </Button>
      </div>

      <textarea
        autoComplete="off"
        value={description}
        onChange={(e) => pushDraft(name, e.target.value)}
        placeholder={descriptionPlaceholder}
        className={cn(
          "flex w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
          panelTextareaClass,
          "min-w-0",
        )}
        aria-label={descriptionPlaceholder}
      />
    </div>
  );
}
