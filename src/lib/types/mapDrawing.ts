/** Documento de trazos del estudio de dibujo (`.narralith/maps/{id}/drawing.json`). */

export type MapStudioTool = "brush" | "eraser";

export type MapBrushPreset = "pen" | "pencil" | "marker";

export interface MapDrawPoint {
  x: number;
  y: number;
}

export interface MapDrawStroke {
  id: string;
  tool: MapStudioTool;
  color: string;
  size: number;
  opacity: number;
  preset: MapBrushPreset;
  points: MapDrawPoint[];
}

export interface MapDrawingDocument {
  version: 1;
  width: number;
  height: number;
  strokes: MapDrawStroke[];
}

export const BRUSH_PRESETS: Record<
  MapBrushPreset,
  { size: number; opacity: number; lineCap: CanvasLineCap }
> = {
  pen: { size: 3, opacity: 1, lineCap: "round" },
  pencil: { size: 2, opacity: 0.65, lineCap: "round" },
  marker: { size: 12, opacity: 0.45, lineCap: "round" },
};

export const STUDIO_PALETTE = [
  "#18181b",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
  "#ffffff",
];
