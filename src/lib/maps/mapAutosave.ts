/** Debounce autosave dibujo MAP-005 (spec D9). */
export const MAP_AUTOSAVE_DEBOUNCE_MS = 500;

export type MapAutosaveFlushReason =
  | "debounce"
  | "mapSwitch"
  | "canvasOp"
  | "exitEdit"
  | "projectSwitch"
  | "pagehide";
