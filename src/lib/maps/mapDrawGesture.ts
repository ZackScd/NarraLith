import type { MapBrushId } from "@/lib/maps/mapBrushes";
import { createStrokeId } from "@/lib/maps/mapDrawingSession";
import type { MapStrokePointV2, MapStrokeV2 } from "@/lib/types/maps";
import type { MapStudioTool } from "@/stores/useMapStudioStore";
import type { MapViewMode } from "@/stores/useMapStore";

export function shouldPanPointer(
  viewMode: MapViewMode,
  studioTool: MapStudioTool,
  button: number,
  spacePressed: boolean,
): boolean {
  if (button === 1) return true;
  if (spacePressed && button === 0) return true;
  if (viewMode === "interactive") return button === 0;
  if (viewMode === "edit" && studioTool === "pan") return button === 0;
  return false;
}

export function shouldDrawPointer(
  viewMode: MapViewMode,
  studioTool: MapStudioTool,
  button: number,
  spacePressed: boolean,
  canDraw: boolean,
): boolean {
  if (!canDraw) return false;
  if (viewMode !== "edit") return false;
  if (spacePressed) return false;
  if (button !== 0) return false;
  return studioTool === "brush" || studioTool === "eraser";
}

export function createStudioStroke(options: {
  tool: MapStudioTool;
  brushId: MapBrushId;
  color: string;
  baseSize: number;
  baseOpacity: number;
  firstPoint: MapStrokePointV2;
}): MapStrokeV2 {
  return {
    id: createStrokeId(),
    tool: options.tool === "eraser" ? "eraser" : "brush",
    brush: options.brushId,
    color: options.color,
    baseSize: options.baseSize,
    baseOpacity: options.baseOpacity,
    points: [options.firstPoint],
  };
}
