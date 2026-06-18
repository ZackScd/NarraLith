/** Tipos IPC mapas v2 (espejo de Rust `fs::maps_store`). */

export type OpenPreference = "pinned" | "lastViewed" | "lastModified";

export interface MapsIndexV2 {
  version: 2;
  openPreference?: OpenPreference;
  maps: MapIndexEntryV2[];
}

export interface MapIndexEntryV2 {
  id: string;
  name: string;
  defaultOnOpen?: boolean;
  updatedAt: string;
}

export interface MapSummaryV2 {
  id: string;
  name: string;
  width: number;
  height: number;
  updatedAt: string;
  defaultOnOpen?: boolean;
}

export interface MapDocumentV1 {
  version: 1;
  id: string;
  name: string;
  width: number;
  height: number;
  desde: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MapStrokeTool = "brush" | "eraser";

export interface MapStrokePointV2 {
  x: number;
  y: number;
  pressure?: number;
}

export interface MapStrokeV2 {
  id: string;
  tool: MapStrokeTool;
  brush: string;
  color: string;
  baseSize: number;
  baseOpacity: number;
  points: MapStrokePointV2[];
}

export interface MapDrawingLayerV2 {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  locked: boolean;
  strokes: MapStrokeV2[];
}

export interface MapDrawingV2 {
  version: 2;
  width: number;
  height: number;
  layers: MapDrawingLayerV2[];
}

export interface MapHotspotsFileV1 {
  version: 1;
  hotspots: unknown[];
}

/** Defaults MAP-003 sustituirá el diálogo completo. */
export const MAP_CREATE_DEFAULT_WIDTH = 2400;
export const MAP_CREATE_DEFAULT_HEIGHT = 1600;
