import { create } from "zustand";

import { trackAction } from "@/lib/action-audit/trackAction";

export type WorkspaceMainView =
  | "editor"
  | "timeline"
  | "calendar"
  | "consistency"
  | "map"
  | "graph";

interface WorkspaceState {
  mainView: WorkspaceMainView;
  setMainView: (view: WorkspaceMainView) => void;
  reset: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  mainView: "editor",
  setMainView: (view) => {
    const from = get().mainView;
    if (from !== view) {
      trackAction("workspace", "viewChange", { from, to: view });
    }
    set({ mainView: view });
  },
  reset: () => set({ mainView: "editor" }),
}));
