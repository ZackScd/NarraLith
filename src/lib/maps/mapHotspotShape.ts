import type {
  MapHotspotBoundsV1,
  MapHotspotPointV2,
  MapHotspotShapeV2,
  MapHotspotV1,
  MapHotspotV2,
} from "@/lib/types/maps";

export function rectShapeFromBounds(bounds: MapHotspotBoundsV1): MapHotspotShapeV2 {
  return {
    kind: "rect",
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  };
}

export function migrateHotspotV1ToV2(hotspot: MapHotspotV1): MapHotspotV2 {
  return {
    id: hotspot.id,
    label: hotspot.label,
    hostDrawingRef: hotspot.hostDrawingRef,
    shape: rectShapeFromBounds(hotspot.bounds),
    targetNavId: hotspot.targetNavId,
  };
}

export function migrateHotspotsFileV1ToV2(
  hotspots: MapHotspotV1[],
): MapHotspotV2[] {
  return hotspots.map(migrateHotspotV1ToV2);
}

export function hotspotRectBounds(shape: MapHotspotShapeV2): MapHotspotBoundsV1 | null {
  if (shape.kind !== "rect") return null;
  return { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
}

/** Caja axis-aligned para overlay / etiquetas (cualquier forma). */
export function hotspotShapeAabb(shape: MapHotspotShapeV2): MapHotspotBoundsV1 {
  if (shape.kind === "rect") {
    return { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
  }
  if (shape.kind === "circle") {
    return {
      x: shape.cx - shape.radius,
      y: shape.cy - shape.radius,
      width: shape.radius * 2,
      height: shape.radius * 2,
    };
  }
  if (shape.points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  let minX = shape.points[0]!.x;
  let minY = shape.points[0]!.y;
  let maxX = minX;
  let maxY = minY;
  for (const point of shape.points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function pointInHotspotBounds(
  x: number,
  y: number,
  bounds: MapHotspotBoundsV1,
): boolean {
  return (
    x >= bounds.x &&
    x < bounds.x + bounds.width &&
    y >= bounds.y &&
    y < bounds.y + bounds.height
  );
}

export function pointInHotspotShape(x: number, y: number, shape: MapHotspotShapeV2): boolean {
  if (shape.kind === "rect") {
    return pointInHotspotBounds(x, y, hotspotRectBounds(shape)!);
  }
  if (shape.kind === "circle") {
    const dx = x - shape.cx;
    const dy = y - shape.cy;
    return dx * dx + dy * dy <= shape.radius * shape.radius;
  }
  if (shape.points.length < 3) return false;
  return pointInPolygon(x, y, shape.points);
}

function pointInPolygon(x: number, y: number, points: ReadonlyArray<MapHotspotPointV2>): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const pi = points[i]!;
    const pj = points[j]!;
    const intersects =
      pi.y > y !== pj.y > y &&
      x < ((pj.x - pi.x) * (y - pi.y)) / (pj.y - pi.y + Number.EPSILON) + pi.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

export type HotspotOverlayStyle = "edit" | "interactive";

export function drawHotspotShape(
  ctx: CanvasRenderingContext2D,
  shape: MapHotspotShapeV2,
  stroke: string,
  fill: string,
  style: HotspotOverlayStyle = "edit",
): void {
  const lineWidth = style === "interactive" ? 1.5 : 2;
  const dash = style === "interactive" ? [6, 4] : [];

  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dash);

  if (shape.kind === "rect") {
    ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
    ctx.strokeRect(shape.x + 0.5, shape.y + 0.5, shape.width - 1, shape.height - 1);
    ctx.setLineDash([]);
    return;
  }

  if (shape.kind === "circle") {
    ctx.beginPath();
    ctx.arc(shape.cx, shape.cy, Math.max(shape.radius, 0.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }

  if (shape.points.length < 2) {
    ctx.setLineDash([]);
    return;
  }

  ctx.beginPath();
  ctx.moveTo(shape.points[0]!.x, shape.points[0]!.y);
  for (let i = 1; i < shape.points.length; i += 1) {
    ctx.lineTo(shape.points[i]!.x, shape.points[i]!.y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);
}
