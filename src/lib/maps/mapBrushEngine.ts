import type { MapPressureCurve } from "@/lib/maps/mapBrushes";
import { getBrushPreset } from "@/lib/maps/mapBrushes";
import type { MapStrokePointV2 } from "@/lib/types/maps";

export interface BrushPointStyle {
  size: number;
  opacity: number;
}

function applyPressureSize(baseSize: number, pressure: number, curve: MapPressureCurve): number {
  switch (curve) {
    case "none":
      return baseSize;
    case "strong":
      return baseSize * (0.35 + 0.65 * pressure);
    case "soft":
      return baseSize * (0.55 + 0.45 * pressure);
    default:
      return baseSize;
  }
}

function applyPressureOpacity(
  baseOpacity: number,
  pressure: number,
  modulate: boolean,
  curve: MapPressureCurve,
): number {
  if (!modulate) return baseOpacity;
  if (curve === "soft") {
    return baseOpacity * (0.45 + 0.55 * pressure);
  }
  return baseOpacity * (0.25 + 0.75 * pressure);
}

export function resolveStrokePressure(point: MapStrokePointV2): number {
  return point.pressure ?? 1;
}

export function strokePointStyle(
  brushId: string,
  baseSize: number,
  baseOpacity: number,
  pressure: number,
): BrushPointStyle {
  const preset = getBrushPreset(brushId);
  return {
    size: applyPressureSize(baseSize, pressure, preset.pressureSize),
    opacity: applyPressureOpacity(
      baseOpacity,
      pressure,
      preset.pressureOpacity,
      preset.pressureSize,
    ),
  };
}

export function segmentStrokeStyle(
  brushId: string,
  baseSize: number,
  baseOpacity: number,
  from: MapStrokePointV2,
  to: MapStrokePointV2,
): BrushPointStyle {
  const p1 = strokePointStyle(brushId, baseSize, baseOpacity, resolveStrokePressure(from));
  const p2 = strokePointStyle(brushId, baseSize, baseOpacity, resolveStrokePressure(to));
  return {
    size: (p1.size + p2.size) / 2,
    opacity: (p1.opacity + p2.opacity) / 2,
  };
}
