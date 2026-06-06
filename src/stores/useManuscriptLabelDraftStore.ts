import { create } from "zustand";

import type { TimeDraft } from "@/stores/useTimeTagDialogStore";
import { formatTimeTag } from "@/lib/calendar/dateTags";

export interface PendingTimeLabel {
  timeTag: string;
  timeHour: number | null;
  draft: TimeDraft;
}

export interface PendingEventLabel {
  name: string;
  description: string;
}

export interface PendingManuscriptLabel {
  filePath: string;
  /** Segmento al que aplica el borrador de evento; `null` = nuevo evento al final. */
  eventSegmentIndex: number | null;
  event: PendingEventLabel | null;
  time: PendingTimeLabel | null;
}

export interface ManuscriptLabelDraftState {
  pending: PendingManuscriptLabel | null;

  stageTime: (params: { filePath: string; draft: TimeDraft }) => void;
  stageEvent: (params: {
    filePath: string;
    name: string;
    description: string;
    segmentIndex?: number | null;
  }) => void;
  clear: () => void;
}

export const useManuscriptLabelDraftStore = create<ManuscriptLabelDraftState>(
  (set, get) => ({
    pending: null,

    stageTime: ({ filePath, draft }) =>
      set({
        pending: {
          filePath,
          eventSegmentIndex:
            get().pending?.filePath === filePath
              ? (get().pending?.eventSegmentIndex ?? null)
              : null,
          event:
            get().pending?.filePath === filePath
              ? (get().pending?.event ?? null)
              : null,
          time: {
            timeTag: formatTimeTag({
              day: draft.day,
              month: draft.month,
              year: draft.year,
            }),
            timeHour: draft.hour ?? null,
            draft,
          },
        },
      }),

    stageEvent: ({ filePath, name, description, segmentIndex = null }) =>
      set({
        pending: {
          filePath,
          eventSegmentIndex: segmentIndex,
          event: { name, description },
          time:
            get().pending?.filePath === filePath ? (get().pending?.time ?? null) : null,
        },
      }),

    clear: () => set({ pending: null }),
  }),
);
