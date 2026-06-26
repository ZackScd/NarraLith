import { circleShapeFromDraft, type MapHotspotCircleDraft } from "@/lib/maps/mapHotspotCircle";
import { polygonShapeFromPoints } from "@/lib/maps/mapHotspotPolygon";
import { rectShapeFromBounds } from "@/lib/maps/mapHotspotShape";
import type { MapHotspotBoundsV1, MapHotspotPointV2, MapHotspotShapeV2 } from "@/lib/types/maps";
import type { MapHotspotDrawTool } from "@/stores/useMapHotspotDrawStore";

export type PendingNavChildZone =
  | { kind: "polygon"; points: MapHotspotPointV2[] }
  | { kind: "rect"; bounds: MapHotspotBoundsV1 }
  | { kind: "circle"; circle: MapHotspotCircleDraft };

export function drawToolForShapeKind(shapeKind: MapHotspotShapeV2["kind"]): MapHotspotDrawTool {
  if (shapeKind === "polygon") return "lasso";
  if (shapeKind === "circle") return "circle";
  return "rect";
}

export function shapeFromPendingNavChildZone(zone: PendingNavChildZone): MapHotspotShapeV2 {
  if (zone.kind === "polygon") {
    return polygonShapeFromPoints(zone.points);
  }
  if (zone.kind === "circle") {
    return circleShapeFromDraft(zone.circle);
  }
  return rectShapeFromBounds(zone.bounds);
}
