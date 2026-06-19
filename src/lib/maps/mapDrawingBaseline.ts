import type { MapDrawingV2 } from "@/lib/types/maps";

/** Huella estructural del dibujo en disco (MAP-005b D18 + MAP-006 D7). */
export function fingerprintMapDrawing(drawing: MapDrawingV2): string {
  const layerKeys = drawing.layers.map(
    (layer) =>
      `${layer.id}:${layer.name}:${layer.visible ? 1 : 0}:${layer.opacity}:${layer.locked ? 1 : 0}`,
  );
  const strokeKeys = drawing.layers.flatMap((layer) =>
    layer.strokes.map(
      (stroke) =>
        `${layer.id}:${stroke.id}:${stroke.tool}:${stroke.brush}:${stroke.points.length}`,
    ),
  );
  return `${drawing.version}:${drawing.width}x${drawing.height}|L:${layerKeys.join(",")}|S:${strokeKeys.join(";")}`;
}

export function isDrawingDirtyAgainstBaseline(
  drawing: MapDrawingV2,
  baselineFingerprint: string,
): boolean {
  return fingerprintMapDrawing(drawing) !== baselineFingerprint;
}
