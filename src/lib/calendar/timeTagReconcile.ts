import { timelineMarkerId } from "@/lib/calendar/timeMarks";
import type { ParsedManuscript } from "@/lib/types/manuscript";
import type { TimelineEvent } from "@/lib/types/timeline";

export function barTimeTagReconcileKey(segmentId: string, tagIndex: number): string {
  return `bar:${segmentId}:${tagIndex}`;
}

export function inlineReconcileKey(nodeKey: string): string {
  return `inline:${nodeKey}`;
}

export function timelineEventForBarTag(
  filePath: string,
  segmentIndex: number,
  segmentId: string,
  rawTime: string,
): TimelineEvent {
  return {
    path: filePath,
    blockIndex: segmentIndex + 1,
    rawTime,
    segmentId,
    tagKind: "bar",
    charOffset: null,
    isParallel: false,
    characters: [],
  };
}

export function timelineReconcileKeyForBarTag(
  filePath: string,
  segmentIndex: number,
  segmentId: string,
  rawTime: string,
): string {
  return timelineMarkerId(timelineEventForBarTag(filePath, segmentIndex, segmentId, rawTime));
}

export function timelineReconcileKeyForInlineTag(
  filePath: string,
  blockIndex: number,
  segmentId: string,
  charOffset: number,
  rawTime: string,
): string {
  return timelineMarkerId({
    path: filePath,
    blockIndex,
    rawTime,
    segmentId,
    tagKind: "inline",
    charOffset,
    isParallel: false,
    characters: [],
  });
}

/** Claves editor + timeline derivadas de barTags persistidos con calendarReconciled. */
export function reconciledKeysFromManuscript(manuscript: ParsedManuscript): string[] {
  const keys: string[] = [];
  for (const seg of manuscript.segments) {
    if (seg.kind !== "event") {
      continue;
    }
    (seg.barTags ?? []).forEach((tag, idx) => {
      if (!tag.calendarReconciled || tag.type !== "time") {
        return;
      }
      keys.push(barTimeTagReconcileKey(seg.id, idx));
      keys.push(
        timelineReconcileKeyForBarTag(
          manuscript.filePath,
          seg.segmentIndex,
          seg.id,
          tag.value,
        ),
      );
    });
  }
  return keys;
}

export function isTimelineMarkerReconciled(
  event: TimelineEvent,
  reconciledKeys: ReadonlySet<string>,
): boolean {
  return event.calendarReconciled === true || reconciledKeys.has(timelineMarkerId(event));
}
