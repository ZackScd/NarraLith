import type { ActiveEventContext } from "@/lib/editor/documentSync";
import { segmentHasBarTime } from "@/lib/editor/manuscriptBlocks";
import type { BarTag } from "@/lib/types/manuscript";
import type { PendingManuscriptLabel } from "@/stores/useManuscriptLabelDraftStore";
import { useEditorStore } from "@/stores/useEditorStore";

function timeBarTag(timeTag: string, hour: number | null | undefined): BarTag {
  const tag: BarTag = { type: "time", value: timeTag };
  if (hour != null) {
    tag.hour = hour;
  }
  return tag;
}

/** Envuelve commit de etiqueta para suprimir autoguardado (§1.3.1). */
export async function runLabelCommitAsync<T>(fn: () => Promise<T>): Promise<T> {
  useEditorStore.getState().beginLabelCommit();
  try {
    return await fn();
  } finally {
    useEditorStore.getState().endLabelCommit();
  }
}

export function runLabelCommit<T>(fn: () => T): T {
  useEditorStore.getState().beginLabelCommit();
  try {
    return fn();
  } finally {
    useEditorStore.getState().endLabelCommit();
  }
}

function eventDraftMatchesContext(
  pending: PendingManuscriptLabel,
  activeEventContext: ActiveEventContext,
): boolean {
  if (!pending.event?.name.trim()) {
    return false;
  }
  if (!activeEventContext.inEvent || !activeEventContext.segmentId) {
    return true;
  }
  if (pending.eventSegmentIndex === null) {
    return false;
  }
  return pending.eventSegmentIndex === activeEventContext.segmentIndex;
}

/** Aplica borrador del panel al manuscrito en RAM (§1.3.1 — sin disco). */
export function commitManuscriptLabel(params: {
  pending: PendingManuscriptLabel;
  activeEventContext: ActiveEventContext;
  entityPath?: string;
  insertInlineTagAtCursor: (tagType: string, value: string) => boolean;
  commitEventAtCursor: (params: {
    name: string;
    description: string;
    entityPath: string;
    barTags: BarTag[];
  }) => boolean;
  updateEventAtCursor: (params: {
    name: string;
    description: string;
    barTags: BarTag[] | null;
  }) => boolean;
  appendBarTimeToActiveEvent: (timeTag: string, hour?: number | null) => boolean;
}): boolean {
  const {
    pending,
    activeEventContext,
    entityPath = "",
    insertInlineTagAtCursor,
    commitEventAtCursor,
    updateEventAtCursor,
    appendBarTimeToActiveEvent,
  } = params;

  const eventDraft = pending.event;
  const timeDraft = pending.time;
  const hasEventName = Boolean(eventDraft?.name.trim());
  const barTags: BarTag[] = timeDraft
    ? [timeBarTag(timeDraft.timeTag, timeDraft.timeHour)]
    : [];

  if (
    hasEventName &&
    eventDraft &&
    eventDraftMatchesContext(pending, activeEventContext)
  ) {
    if (activeEventContext.inEvent && activeEventContext.segmentId) {
      return updateEventAtCursor({
        name: eventDraft.name.trim(),
        description: eventDraft.description.trim(),
        barTags: timeDraft ? barTags : null,
      });
    }

    return commitEventAtCursor({
      name: eventDraft.name.trim(),
      description: eventDraft.description.trim(),
      entityPath: entityPath.trim(),
      barTags,
    });
  }

  if (timeDraft) {
    const timeValue = timeDraft.timeTag;

    if (activeEventContext.inEvent && activeEventContext.segmentId) {
      const manuscript = useEditorStore.getState().manuscript;
      const segment = manuscript?.segments.find(
        (s) =>
          s.kind === "event" && s.segmentIndex === activeEventContext.segmentIndex,
      );
      const hasBarTime =
        segment?.kind === "event" && segmentHasBarTime(segment.barTags);

      if (!hasBarTime) {
        return appendBarTimeToActiveEvent(timeValue, timeDraft.timeHour);
      }
      return insertInlineTagAtCursor("time", timeValue);
    }

    return insertInlineTagAtCursor("time", timeValue);
  }

  return false;
}
