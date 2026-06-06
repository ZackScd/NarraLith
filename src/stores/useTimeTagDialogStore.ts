import { create } from "zustand";

export interface TimeDraft {
  day: number;
  month: number;
  year: number;
  /** Hora dentro del día (0..hoursPerDay-1). null = sin hora específica. */
  hour: number | null;
}

interface TimeTagDialogState {
  isOpen: boolean;
  /** Posición flotante absoluta (px) en el viewport. */
  position: { x: number; y: number };
  /** Pestaña/archivo y bloque a los que pertenece la edición en curso. */
  filePath: string | null;
  blockIndex: number | null;
  /** Borrador editable mientras está abierto el diálogo. */
  draft: TimeDraft;
  /** Si true, el botón principal inserta directo al documento. */
  commitOnSave: boolean;
  timelinePreviewOpen: boolean;
  timelinePreviewPosition: { x: number; y: number };

  open: (params: {
    filePath: string;
    blockIndex: number;
    initial: TimeDraft;
    position?: { x: number; y: number };
    commitOnSave?: boolean;
  }) => void;
  close: () => void;
  setPosition: (position: { x: number; y: number }) => void;
  setDraft: (patch: Partial<TimeDraft>) => void;
  toggleTimelinePreview: () => void;
  closeTimelinePreview: () => void;
  setTimelinePreviewPosition: (position: { x: number; y: number }) => void;
}

const DEFAULT_POSITION = { x: 200, y: 120 };
const DEFAULT_DRAFT: TimeDraft = { day: 1, month: 1, year: 0, hour: null };
const PREVIEW_WIDTH = 520;
const PREVIEW_HEIGHT = 168;
const PREVIEW_OFFSET_Y = 16;
const VIEWPORT_MARGIN = 8;

function clampPreviewPosition(x: number, y: number): { x: number; y: number } {
  const w = typeof window !== "undefined" ? window.innerWidth : 1024;
  const h = typeof window !== "undefined" ? window.innerHeight : 720;
  const maxX = Math.max(VIEWPORT_MARGIN, w - PREVIEW_WIDTH - VIEWPORT_MARGIN);
  const maxY = Math.max(VIEWPORT_MARGIN, h - PREVIEW_HEIGHT - VIEWPORT_MARGIN);
  return {
    x: Math.min(Math.max(VIEWPORT_MARGIN, x), maxX),
    y: Math.min(Math.max(VIEWPORT_MARGIN, y), maxY),
  };
}

export const useTimeTagDialogStore = create<TimeTagDialogState>((set) => ({
  isOpen: false,
  position: DEFAULT_POSITION,
  filePath: null,
  blockIndex: null,
  draft: DEFAULT_DRAFT,
  commitOnSave: false,
  timelinePreviewOpen: false,
  timelinePreviewPosition: DEFAULT_POSITION,

  open: ({ filePath, blockIndex, initial, position, commitOnSave }) =>
    set((state) => ({
      isOpen: true,
      filePath,
      blockIndex,
      draft: { ...initial },
      commitOnSave: !!commitOnSave,
      position: position ?? state.position,
      timelinePreviewOpen: false,
    })),

  close: () =>
    set({
      isOpen: false,
      filePath: null,
      blockIndex: null,
      commitOnSave: false,
      timelinePreviewOpen: false,
    }),

  setPosition: (position) => set({ position }),

  setDraft: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),

  toggleTimelinePreview: () =>
    set((state) => {
      if (state.timelinePreviewOpen) {
        return { timelinePreviewOpen: false };
      }
      const initialY = state.position.y + 400 + PREVIEW_OFFSET_Y;
      return {
        timelinePreviewOpen: true,
        timelinePreviewPosition: clampPreviewPosition(state.position.x, initialY),
      };
    }),

  closeTimelinePreview: () => set({ timelinePreviewOpen: false }),

  setTimelinePreviewPosition: (position) =>
    set({ timelinePreviewPosition: clampPreviewPosition(position.x, position.y) }),
}));
