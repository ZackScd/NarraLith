import { create } from "zustand";

interface AppState {
  /** Indica que el shell de la app terminó la inicialización (i18n, tema, etc.). */
  isInitialized: boolean;
  setInitialized: (value: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isInitialized: false,
  setInitialized: (value) => set({ isInitialized: value }),
}));
