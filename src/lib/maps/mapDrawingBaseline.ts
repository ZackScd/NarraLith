import type { MapDrawingV2 } from "@/lib/types/maps";

/** Huella estructural del dibujo en disco (MAP-005b D18). */
export function fingerprintMapDrawing(drawing: MapDrawingV2): string {
  const strokeKeys = drawing.layers.flatMap((layer) =>
    layer.strokes.map(
      (stroke) =>
        `${layer.id}:${stroke.id}:${stroke.tool}:${stroke.brush}:${stroke.points.length}`,
    ),
  );
  return `${drawing.version}:${drawing.width}x${drawing.height}|${strokeKeys.join(";")}`;
}

export function isDrawingDirtyAgainstBaseline(
  drawing: MapDrawingV2,
  baselineFingerprint: string,
): boolean {
  return fingerprintMapDrawing(drawing) !== baselineFingerprint;
}
