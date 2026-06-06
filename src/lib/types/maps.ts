/** Tipos IPC mapas (espejo de Rust `fs::maps_store`). */

export interface MapSummary {
  id: string;
  name: string;
  parentMapId?: string | null;
  imagePath: string;
  width: number;
  height: number;
}

export interface MapOverlay {
  id: string;
  name: string;
  imagePath: string;
  bounds: [[number, number], [number, number]];
  fromTimestamp?: string | null;
  toTimestamp?: string | null;
  zIndex: number;
}

export interface MapManifest {
  id: string;
  name: string;
  imagePath: string;
  width: number;
  height: number;
  parentMapId?: string | null;
  overlays: MapOverlay[];
}

export interface MapLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  zIndex: number;
  categoryFilter?: string | null;
}

export type MapFeatureKind = "pin" | "polygon";

export interface MapFeatureStyle {
  color?: string | null;
  fillOpacity?: number | null;
}

export interface MapFeature {
  id: string;
  layerId: string;
  kind: MapFeatureKind;
  latlng: [number, number][];
  entityPath?: string | null;
  label?: string | null;
  childMapId?: string | null;
  style?: MapFeatureStyle | null;
}

export interface MapLayersFile {
  version: number;
  layers: MapLayer[];
  features: MapFeature[];
}

export interface MapData {
  manifest: MapManifest;
  layers: MapLayersFile;
}

export interface MapStateAt {
  manifest: MapManifest;
  layers: MapLayersFile;
  activeOverlays: MapOverlay[];
  previewTimestamp?: string | null;
}

export type MapDrawMode = "select" | "pin" | "polygon" | "delete";
