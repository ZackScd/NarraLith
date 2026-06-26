import { documentDistance } from "@/lib/maps/mapDrawCoords";
import type { MapHotspotShapeV2 } from "@/lib/types/maps";

export const HOTSPOT_CIRCLE_MIN_RADIUS = 4;

export interface MapHotspotCircleDraft {
  cx: number;
  cy: number;
  radius: number;
}

export function normalizeHotspotCircle(
  cx: number,
  cy: number,
  edgeX: number,
  edgeY: number,
  canvasWidth: number,
  canvasHeight: number,
): MapHotspotCircleDraft | null {
  const clampedCenter = {
    cx: Math.min(canvasWidth, Math.max(0, cx)),
    cy: Math.min(canvasHeight, Math.max(0, cy)),
  };
  let radius = documentDistance({ x: clampedCenter.cx, y: clampedCenter.cy }, { x: edgeX, y: edgeY });
  if (radius < HOTSPOT_CIRCLE_MIN_RADIUS) return null;

  const maxRadius = Math.min(
    clampedCenter.cx,
    clampedCenter.cy,
    canvasWidth - clampedCenter.cx,
    canvasHeight - clampedCenter.cy,
  );
  radius = Math.min(radius, maxRadius);
  if (radius < HOTSPOT_CIRCLE_MIN_RADIUS) return null;

  return { ...clampedCenter, radius };
}

export function circleShapeFromDraft(draft: MapHotspotCircleDraft): MapHotspotShapeV2 {
  return { kind: "circle", cx: draft.cx, cy: draft.cy, radius: draft.radius };
}
