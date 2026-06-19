import type { MapHotspotBoundsV1 } from "@/lib/types/maps";

const MIN_HOTSPOT_SIZE = 4;

export function normalizeHotspotBounds(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  canvasWidth: number,
  canvasHeight: number,
): MapHotspotBoundsV1 | null {
  let x = Math.min(x0, x1);
  let y = Math.min(y0, y1);
  let width = Math.abs(x1 - x0);
  let height = Math.abs(y1 - y0);

  if (width < MIN_HOTSPOT_SIZE || height < MIN_HOTSPOT_SIZE) {
    return null;
  }

  if (x < 0) {
    width += x;
    x = 0;
  }
  if (y < 0) {
    height += y;
    y = 0;
  }
  if (x + width > canvasWidth) {
    width = canvasWidth - x;
  }
  if (y + height > canvasHeight) {
    height = canvasHeight - y;
  }

  if (width < MIN_HOTSPOT_SIZE || height < MIN_HOTSPOT_SIZE) {
    return null;
  }

  return { x, y, width, height };
}
