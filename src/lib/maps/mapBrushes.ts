/** Pinceles v1 MAP-005 — única fuente de verdad (spec §3bis D2). */

export type MapBrushId = "pen" | "pencil" | "marker";

export type MapPressureCurve = "none" | "soft" | "strong";

export interface MapBrushPreset {
  id: MapBrushId;
  labelKey: string;
  defaultSize: number;
  defaultOpacity: number;
  pressureSize: MapPressureCurve;
  pressureOpacity: boolean;
}

export const MAP_STUDIO_PALETTE = [
  "#000000",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#78716c",
] as const;

export const MAP_STUDIO_BRUSHES: MapBrushPreset[] = [
  {
    id: "pen",
    labelKey: "studio.brushes.pen",
    defaultSize: 2,
    defaultOpacity: 1,
    pressureSize: "strong",
    pressureOpacity: false,
  },
  {
    id: "pencil",
    labelKey: "studio.brushes.pencil",
    defaultSize: 4,
    defaultOpacity: 0.85,
    pressureSize: "strong",
    pressureOpacity: true,
  },
  {
    id: "marker",
    labelKey: "studio.brushes.marker",
    defaultSize: 12,
    defaultOpacity: 0.55,
    pressureSize: "soft",
    pressureOpacity: true,
  },
];

export const MAP_STUDIO_DEFAULT_BRUSH_ID: MapBrushId = "pen";
export const MAP_STUDIO_DEFAULT_COLOR = MAP_STUDIO_PALETTE[0];
export const MAP_STUDIO_SIZE_MIN = 1;
export const MAP_STUDIO_SIZE_MAX = 128;
export const MAP_STUDIO_MIN_POINT_DISTANCE = 1.5;

const BRUSH_BY_ID = new Map<MapBrushId, MapBrushPreset>(
  MAP_STUDIO_BRUSHES.map((brush) => [brush.id, brush]),
);

export function getBrushPreset(brushId: string): MapBrushPreset {
  return BRUSH_BY_ID.get(brushId as MapBrushId) ?? BRUSH_BY_ID.get("pen")!;
}

export function clampStudioSize(value: number): number {
  return Math.min(MAP_STUDIO_SIZE_MAX, Math.max(MAP_STUDIO_SIZE_MIN, value));
}

export function clampStudioOpacity(value: number): number {
  return Math.min(1, Math.max(0.05, value));
}
