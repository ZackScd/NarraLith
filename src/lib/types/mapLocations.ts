/** Ocurrencia ubicación manuscrito con tiempo efectivo §4bis.1 (MAP-011). */

export type ProjectLocationTagKind = "bar" | "inline" | "metadata";

export interface ProjectLocationOccurrenceV1 {
  id: string;
  locationKey: string;
  label: string;
  effectiveTimeRaw: string;
  effectiveTimestamp: string | null;
  sourcePath: string;
  segmentId: string | null;
  tagKind: ProjectLocationTagKind;
  charOffset?: number;
}

export interface MapLocationPinV1 {
  id: string;
  locationKey: string;
  label?: string;
  x: number;
  y: number;
  updatedAt: string;
}

export interface MapLocationPinsFileV1 {
  version: 1;
  pins: MapLocationPinV1[];
}

/** Marcador compuesto para pintar X en compositor. */
export interface MapLocatedMarkerV1 {
  pinId: string;
  locationKey: string;
  label: string;
  x: number;
  y: number;
}
