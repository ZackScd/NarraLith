import { create } from "zustand";

import { trackAction } from "@/lib/action-audit/trackAction";
import type { MapUnsavedContext } from "@/lib/maps/mapDrawingGuard";
import type { MapUnsavedDialogTrigger } from "@/lib/maps/mapDrawingGuard";

interface MapUnsavedStoreState {
  dialogOpen: boolean;
  context: MapUnsavedContext;
  mapId: string | null;
  trigger: MapUnsavedDialogTrigger;
  isSaving: boolean;
  openDialog: (
    context: MapUnsavedContext,
    meta: { mapId: string | null; trigger: MapUnsavedDialogTrigger },
  ) => void;
  closeDialog: () => void;
  setSaving: (saving: boolean) => void;
}

export const useMapUnsavedStore = create<MapUnsavedStoreState>((set) => ({
  dialogOpen: false,
  context: "leave",
  mapId: null,
  trigger: "viewChange",
  isSaving: false,

  openDialog: (context, meta) => {
    trackAction("map", "unsavedDialog", {
      mapId: meta.mapId,
      trigger: meta.trigger,
    });
    set({
      dialogOpen: true,
      context,
      mapId: meta.mapId,
      trigger: meta.trigger,
      isSaving: false,
    });
  },

  closeDialog: () => {
    set({ dialogOpen: false, isSaving: false });
  },

  setSaving: (isSaving) => {
    set({ isSaving });
  },
}));
