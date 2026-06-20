/** Tipos IPC mapas v2 (espejo de Rust `fs::maps_store`). */

export type OpenPreference = "pinned" | "lastViewed" | "lastModified";

export interface MapsIndexV2 {
  version: 2;
  openPreference?: OpenPreference;
  lastViewedMapId?: string | null;
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

export type InitialMapReason =
  | "pinned"
  | "lastViewed"
  | "lastModified"
  | "fallbackFirst"
  | "none";

export interface MapSessionV2 {
  openPreference: OpenPreference;
  lastViewedMapId: string | null;
  initialMapId: string | null;
  initialReason: InitialMapReason;
  maps: MapSummaryV2[];
}

export interface MapDocumentV1 {
  version: 1;
  id: string;
  name: string;
  width: number;
  height: number;
  desde: string | null;
  baseImageRel?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MapCreateMode = "blank" | "import";

export type MapAspectPreset = "none" | "16:9" | "4:3" | "1:1" | "custom";

export type MapSizePresetId = "default" | "hd" | "square" | "a4ish" | "custom";

export interface MapSizePreset {
  id: MapSizePresetId;
  width: number;
  height: number;
}

export interface MapCreateDraft {
  name: string;
  mode: MapCreateMode;
  width: number;
  height: number;
  importPath?: string | null;
}

export const MAP_SIZE_PRESETS: MapSizePreset[] = [
  { id: "default", width: 2400, height: 1600 },
  { id: "hd", width: 1920, height: 1080 },
  { id: "square", width: 2048, height: 2048 },
  { id: "a4ish", width: 2480, height: 3508 },
];

/** Defaults del diálogo crear mapa. */
export const MAP_CREATE_DEFAULT_WIDTH = 2400;
export const MAP_CREATE_DEFAULT_HEIGHT = 1600;

export const MAP_DIMENSION_MIN = 512;
export const MAP_DIMENSION_MAX = 8192;

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

export interface MapDrawingLayerGroupV2 {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  locked: boolean;
  collapsed?: boolean;
}

export interface MapDrawingLayerV2 {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  locked: boolean;
  strokes: MapStrokeV2[];
  groupId?: string | null;
}

export interface MapDrawingV2 {
  version: 2;
  width: number;
  height: number;
  layers: MapDrawingLayerV2[];
  groups?: MapDrawingLayerGroupV2[];
}

/** Host del hotspot — v1 UI solo crea `principal`; `nav` reservado v1.1 */
export type MapHostDrawingRef =
  | { kind: "principal" }
  | { kind: "nav"; id: string };

export interface MapHotspotBoundsV1 {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MapHotspotV1 {
  id: string;
  label?: string;
  hostDrawingRef: MapHostDrawingRef;
  bounds: MapHotspotBoundsV1;
  targetNavId: string;
}

export interface MapHotspotsFileV1 {
  version: 1;
  hotspots: MapHotspotV1[];
}

export interface MapNavSummaryV1 {
  id: string;
  name: string;
  updatedAt: string;
}

export interface MapNavDrawingFileV1 {
  version: 1;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  drawing: MapDrawingV2;
}

/** Frame del stack interactivo (vista hijo) — MAP-010 Fase 4+ */
export interface MapNavFrame {
  navId: string;
  name: string;
  hostDrawingRef: MapHostDrawingRef;
}

export interface MapSecondarySummaryV1 {
  id: string;
  name: string;
  tiempoInicio: string;
  tiempoFin?: string | null;
  updatedAt: string;
}

export interface MapSecondaryDrawingFileV1 {
  version: 1;
  id: string;
  name: string;
  tiempoInicio: string;
  tiempoFin?: string | null;
  createdAt: string;
  updatedAt: string;
  drawing: MapDrawingV2;
}

export type MapDrawingRef =
  | { kind: "principal" }
  | { kind: "secondary"; id: string }
  | { kind: "nav"; id: string };

export function drawingRefKey(ref: MapDrawingRef): string {
  if (ref.kind === "principal") return "principal";
  if (ref.kind === "secondary") return `secondary:${ref.id}`;
  return `nav:${ref.id}`;
}

export function parseDrawingRefKey(key: string): MapDrawingRef | null {
  if (key === "principal") {
    return { kind: "principal" };
  }
  if (key.startsWith("secondary:")) {
    const id = key.slice("secondary:".length);
    if (id.length > 0) {
      return { kind: "secondary", id };
    }
  }
  if (key.startsWith("nav:")) {
    const id = key.slice("nav:".length);
    if (id.length > 0) {
      return { kind: "nav", id };
    }
  }
  return null;
}

export const DEFAULT_MAP_DRAWING_REF: MapDrawingRef = { kind: "principal" };
