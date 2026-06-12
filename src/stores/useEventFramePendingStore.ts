import { create } from "zustand";

interface EventFramePendingState {
  pendingTagDelete: string | null;
  pendingEndDelete: string | null;
  setPendingTagDelete: (segmentId: string | null) => void;
  setPendingEndDelete: (segmentId: string | null) => void;
  clearPending: () => void;
}

export const useEventFramePendingStore = create<EventFramePendingState>((set) => ({
  pendingTagDelete: null,
  pendingEndDelete: null,
  setPendingTagDelete: (segmentId) =>
    set({ pendingTagDelete: segmentId, pendingEndDelete: null }),
  setPendingEndDelete: (segmentId) =>
    set({ pendingEndDelete: segmentId, pendingTagDelete: null }),
  clearPending: () => set({ pendingTagDelete: null, pendingEndDelete: null }),
}));
