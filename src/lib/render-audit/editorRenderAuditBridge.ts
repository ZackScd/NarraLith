import type { EventFrameRect } from "@/lib/editor/measureEventFrames";

export interface EditorDirtyDiffRegion {
  paragraphIndex: number;
  from: number;
  to: number;
}

export interface EditorRenderAuditSnapshot {
  scrollTop: number;
  visibleLineRange: [number, number] | null;
  caretLine: number | null;
  lineHeights: number[];
  eventFrames: EventFrameRect[];
  dirtyDiffRegions: EditorDirtyDiffRegion[];
  gutterMarkerCount: number;
  hasFocus: boolean;
}

const emptySnapshot: EditorRenderAuditSnapshot = {
  scrollTop: 0,
  visibleLineRange: null,
  caretLine: null,
  lineHeights: [],
  eventFrames: [],
  dirtyDiffRegions: [],
  gutterMarkerCount: 0,
  hasFocus: false,
};

let snapshot: EditorRenderAuditSnapshot = { ...emptySnapshot };
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getEditorRenderAuditSnapshot(): EditorRenderAuditSnapshot {
  return snapshot;
}

export function patchEditorRenderAudit(
  partial: Partial<EditorRenderAuditSnapshot>,
): void {
  snapshot = { ...snapshot, ...partial };
  notify();
}

export function resetEditorRenderAuditSnapshot(): void {
  snapshot = { ...emptySnapshot };
  notify();
}

export function subscribeEditorRenderAudit(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
