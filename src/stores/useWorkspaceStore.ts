import { create } from "zustand";

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

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  mainView: "editor",
  setMainView: (view) => set({ mainView: view }),
  reset: () => set({ mainView: "editor" }),
}));
