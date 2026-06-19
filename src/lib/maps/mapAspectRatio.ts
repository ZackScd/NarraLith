import type { MapAspectPreset } from "@/lib/types/maps";
import { MAP_DIMENSION_MAX, MAP_DIMENSION_MIN } from "@/lib/types/maps";

export function aspectRatioValue(
  preset: MapAspectPreset,
  customAspectW: number,
  customAspectH: number,
): number | null {
  switch (preset) {
    case "none":
      return null;
    case "16:9":
      return 16 / 9;
    case "4:3":
      return 4 / 3;
    case "1:1":
      return 1;
    case "custom": {
      if (customAspectW <= 0 || customAspectH <= 0) return null;
      return customAspectW / customAspectH;
    }
    default:
      return null;
  }
}

export function clampDimension(value: number): number {
  return Math.min(MAP_DIMENSION_MAX, Math.max(MAP_DIMENSION_MIN, Math.round(value)));
}

export function applyAspectToWidth(width: number, ratio: number): number {
  return clampDimension(Math.round(width / ratio));
}

export function applyAspectToHeight(height: number, ratio: number): number {
  return clampDimension(Math.round(height * ratio));
}

export function isDimensionInRange(value: number): boolean {
  return Number.isFinite(value) && value >= MAP_DIMENSION_MIN && value <= MAP_DIMENSION_MAX;
}
