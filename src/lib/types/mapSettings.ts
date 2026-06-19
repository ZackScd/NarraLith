/** Preferencias de guardado de mapas (MAP-005b D17/D22). */
export interface MapSaveSettings {
  /** Si false, solo guardado manual (Ctrl+S / diálogo). */
  mapAutosaveEnabled: boolean;
}

export const DEFAULT_MAP_SAVE_SETTINGS: MapSaveSettings = {
  mapAutosaveEnabled: false,
};
