import { create } from "zustand";

import { invokeCommand, parseAppError } from "@/lib/ipc";
import { buildEntityIndex, clearEntityIndex } from "@/lib/search/entityIndex";
import type { EntitySearchRow } from "@/lib/types/entitySearch";

interface EntitySearchState {
  isReady: boolean;
  isLoading: boolean;
  entityCount: number;
  lastErrorKey: string | null;
  rebuildIndex: () => Promise<boolean>;
  reset: () => void;
}

export const useEntitySearchStore = create<EntitySearchState>((set) => ({
  isReady: false,
  isLoading: false,
  entityCount: 0,
  lastErrorKey: null,

  rebuildIndex: async () => {
    set({ isLoading: true, lastErrorKey: null });
    try {
      const rows = await invokeCommand<EntitySearchRow[]>("list_entities_for_search");
      buildEntityIndex(rows);
      set({
        isReady: true,
        isLoading: false,
        entityCount: rows.length,
      });
      return true;
    } catch (err) {
      clearEntityIndex();
      set({
        isReady: false,
        isLoading: false,
        entityCount: 0,
        lastErrorKey: parseAppError(err)?.key ?? "error.unknown",
      });
      return false;
    }
  },

  reset: () => {
    clearEntityIndex();
    set({
      isReady: false,
      isLoading: false,
      entityCount: 0,
      lastErrorKey: null,
    });
  },
}));
