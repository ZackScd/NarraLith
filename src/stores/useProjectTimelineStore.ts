import { create } from "zustand";

import { invokeCommand } from "@/lib/ipc";
import type { LastAddedTimeMarker, TimelineEvent } from "@/lib/types/timeline";
import { useProjectStore } from "@/stores/useProjectStore";

interface ProjectTimelineState {
  events: TimelineEvent[];
  lastAdded: LastAddedTimeMarker | null;
  loading: boolean;
  hasLoaded: boolean;
  errorKey: string | null;
  load: () => Promise<void>;
  reset: () => void;
}

let inflightLoad: Promise<void> | null = null;

export const useProjectTimelineStore = create<ProjectTimelineState>((set) => ({
  events: [],
  lastAdded: null,
  loading: false,
  hasLoaded: false,
  errorKey: null,

  load: async () => {
    if (inflightLoad) return inflightLoad;

    inflightLoad = (async () => {
      const activeProject = useProjectStore.getState().activeProject;
      if (!activeProject) {
        set({
          events: [],
          lastAdded: null,
          hasLoaded: false,
          loading: false,
          errorKey: null,
        });
        return;
      }

      set({ loading: true, errorKey: null });
      try {
        const [data, lastAddedMarker] = await Promise.all([
          invokeCommand<TimelineEvent[]>("get_timeline_events", {
            filters: { limit: 2000 },
          }),
          invokeCommand<LastAddedTimeMarker | null>("get_last_added_time", {}),
        ]);
        set({ events: data, lastAdded: lastAddedMarker });
      } catch {
        set({
          errorKey: "timeline.loadFailed",
          events: [],
          lastAdded: null,
        });
      } finally {
        set({ loading: false, hasLoaded: true });
      }
    })().finally(() => {
      inflightLoad = null;
    });

    return inflightLoad;
  },

  reset: () => {
    inflightLoad = null;
    set({
      events: [],
      lastAdded: null,
      loading: false,
      hasLoaded: false,
      errorKey: null,
    });
  },
}));
