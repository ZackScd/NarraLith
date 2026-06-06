/** Preferencias del editor persistidas en `localStorage`. */
export interface EditorSaveSettings {
  /** Si false, solo guardado manual (Ctrl+S / botón). */
  autosaveEnabled: boolean;
  /** Segundos de pausa tras escribir antes de guardar (5–600). */
  autosaveDebounceSec: number;
  /** Intervalo periódico en segundos; 0 = desactivado (30–3600). */
  autosaveIntervalSec: number;
  /** Reindexar grafo al abrir la vista Grafo (Fase 8). */
  graphAutoRebuildOnView: boolean;
}

export const DEFAULT_EDITOR_SAVE_SETTINGS: EditorSaveSettings = {
  autosaveEnabled: false,
  autosaveDebounceSec: 30,
  autosaveIntervalSec: 0,
  graphAutoRebuildOnView: false,
};

export const EDITOR_SAVE_LIMITS = {
  debounceMin: 5,
  debounceMax: 600,
  intervalMin: 0,
  intervalMax: 3600,
} as const;
