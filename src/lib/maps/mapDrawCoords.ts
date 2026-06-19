import type { MapViewportState } from "@/lib/maps/useMapViewport";
import type { MapStrokePointV2 } from "@/lib/types/maps";

export function screenToDocument(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  viewport: MapViewportState,
): { x: number; y: number } {
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  return {
    x: (localX - viewport.panX) / viewport.zoom,
    y: (localY - viewport.panY) / viewport.zoom,
  };
}

export function documentDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

export function samplePointerPoint(
  event: Pick<PointerEvent, "clientX" | "clientY" | "pointerType" | "pressure">,
  rect: DOMRect,
  viewport: MapViewportState,
): MapStrokePointV2 {
  const { x, y } = screenToDocument(event.clientX, event.clientY, rect, viewport);
  if (event.pointerType === "pen") {
    return { x, y, pressure: Math.min(1, Math.max(0.05, event.pressure)) };
  }
  return { x, y };
}
