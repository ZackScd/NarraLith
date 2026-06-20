import type { MapLocatedMarkerV1 } from "@/lib/types/mapLocations";

const MARKER_SIZE = 14;

/** Dibuja marcas «X» stub §4bis.4.1. */
export function drawLocationMarkers(
  ctx: CanvasRenderingContext2D,
  markers: MapLocatedMarkerV1[],
): void {
  if (markers.length === 0) return;
  ctx.save();
  ctx.strokeStyle = "rgba(220, 38, 38, 0.95)";
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 2;
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const marker of markers) {
    const half = MARKER_SIZE / 2;
    ctx.fillRect(marker.x - half, marker.y - half, MARKER_SIZE, MARKER_SIZE);
    ctx.strokeRect(marker.x - half + 0.5, marker.y - half + 0.5, MARKER_SIZE - 1, MARKER_SIZE - 1);
    ctx.fillStyle = "rgba(220, 38, 38, 0.95)";
    ctx.fillText("X", marker.x, marker.y + 0.5);
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  }

  ctx.restore();
}

/** Preview pin placement (modo edición). */
export function drawLocationPinDraft(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  ctx.save();
  ctx.strokeStyle = "rgba(234, 179, 8, 0.95)";
  ctx.fillStyle = "rgba(234, 179, 8, 0.25)";
  const half = MARKER_SIZE / 2;
  ctx.fillRect(x - half, y - half, MARKER_SIZE, MARKER_SIZE);
  ctx.strokeRect(x - half + 0.5, y - half + 0.5, MARKER_SIZE - 1, MARKER_SIZE - 1);
  ctx.restore();
}
