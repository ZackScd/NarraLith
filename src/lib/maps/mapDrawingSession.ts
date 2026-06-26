import { MAP_STUDIO_MIN_POINT_DISTANCE } from "@/lib/maps/mapBrushes";
import { documentDistance } from "@/lib/maps/mapDrawCoords";
import { resolveLayerEffectiveState } from "@/lib/maps/mapLayerGroups";
import { getLayerStrokes, isImageLayer } from "@/lib/maps/mapImageLayers";
import type {
  MapDrawingImageLayerV2,
  MapDrawingLayerV2,
  MapDrawingV2,
  MapStrokePointV2,
  MapStrokeV2,
} from "@/lib/types/maps";

export type MapDrawingSaveStatus = "idle" | "saving" | "saved" | "error";

/** Profundidad máxima undo/redo (MAP-005b D20). */
export const MAP_UNDO_MAX_DEPTH = 50;

export const MAP_LAYER_NAME_MAX_LENGTH = 64;

export type MapLayerErrorCode = "last_layer" | "not_found" | "invalid_name";

export class MapLayerError extends Error {
  readonly code: MapLayerErrorCode;

  constructor(code: MapLayerErrorCode) {
    super(code);
    this.code = code;
  }
}

export interface MapDrawingUndoOp {
  kind: "addStroke" | "removeStroke";
  layerId: string;
  stroke: MapStrokeV2;
}

export type MapLayerPatch = Partial<
  Pick<MapDrawingLayerV2, "name" | "visible" | "opacity" | "locked">
>;

export const MAP_DRAWING_DEFAULT_BACKGROUND = "#ffffff";

export function patchDrawingBackground(
  drawing: MapDrawingV2,
  backgroundColor: string | null,
): MapDrawingV2 {
  return { ...drawing, backgroundColor };
}

export function cloneDrawing(drawing: MapDrawingV2): MapDrawingV2 {
  return structuredClone(drawing);
}

export function createLayerId(): string {
  return `layer-${crypto.randomUUID().slice(0, 8)}`;
}

export function clampLayerOpacity(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function normalizeLayerName(name: string, fallbackIndex: number): string {
  const trimmed = name.trim().slice(0, MAP_LAYER_NAME_MAX_LENGTH);
  return trimmed.length > 0 ? trimmed : `Capa ${fallbackIndex}`;
}

/** Primera capa dibujable o, si ninguna, la primera del stack (MAP-006 D3). */
export function resolveDefaultActiveLayerId(drawing: MapDrawingV2): string | null {
  const drawable = drawing.layers.find((layer) => {
    if (isImageLayer(layer)) return false;
    const effective = resolveLayerEffectiveState(layer, drawing.groups);
    return effective.visible && !effective.locked;
  });
  return drawable?.id ?? drawing.layers.find((layer) => !isImageLayer(layer))?.id ?? null;
}

/** Capa activa explícita o fallback a la primera dibujable (MAP-006 D3). */
export function resolveActiveLayer(
  drawing: MapDrawingV2,
  activeLayerId?: string | null,
): MapDrawingLayerV2 | null {
  if (activeLayerId) {
    const selected = drawing.layers.find((layer) => layer.id === activeLayerId);
    if (selected) {
      const effective = resolveLayerEffectiveState(selected, drawing.groups);
      if (isImageLayer(selected)) return null;
      return effective.visible && !effective.locked ? selected : null;
    }
  }
  return (
    drawing.layers.find((layer) => {
      if (isImageLayer(layer)) return false;
      const effective = resolveLayerEffectiveState(layer, drawing.groups);
      return effective.visible && !effective.locked;
    }) ?? null
  );
}

export function getDrawBlockReason(
  drawing: MapDrawingV2,
  activeLayerId: string | null,
): "locked" | "no_layer" | null {
  if (activeLayerId) {
    const selected = drawing.layers.find((layer) => layer.id === activeLayerId);
    if (selected) {
      const effective = resolveLayerEffectiveState(selected, drawing.groups);
      if (effective.locked) {
        return "locked";
      }
      if (!effective.visible) {
        return "no_layer";
      }
      return null;
    }
  }
  return resolveActiveLayer(drawing, null) ? null : "no_layer";
}

export function ensureActiveLayerId(
  drawing: MapDrawingV2,
  current: string | null,
): string | null {
  if (current) {
    const layer = drawing.layers.find((item) => item.id === current);
    if (layer) {
      const effective = resolveLayerEffectiveState(layer, drawing.groups);
      if (effective.visible && !effective.locked) {
        return current;
      }
    }
  }
  return resolveDefaultActiveLayerId(drawing);
}

export function countLayerStrokes(layer: MapDrawingLayerV2): number {
  return getLayerStrokes(layer).length;
}

export function addLayer(
  drawing: MapDrawingV2,
  name?: string,
): { drawing: MapDrawingV2; layerId: string } {
  const layerId = createLayerId();
  const layer: MapDrawingLayerV2 = {
    kind: "vector",
    id: layerId,
    name: normalizeLayerName(name ?? "", drawing.layers.length + 1),
    visible: true,
    opacity: 1,
    locked: false,
    strokes: [],
  };
  return {
    drawing: { ...drawing, layers: [...drawing.layers, layer] },
    layerId,
  };
}

export function addImageLayer(
  drawing: MapDrawingV2,
  assetPath: string,
  naturalWidth: number,
  naturalHeight: number,
  name?: string,
): { drawing: MapDrawingV2; layerId: string } {
  const layerId = createLayerId();
  const x = (drawing.width - naturalWidth) / 2;
  const y = (drawing.height - naturalHeight) / 2;
  const layer: MapDrawingImageLayerV2 = {
    kind: "image",
    id: layerId,
    name: normalizeLayerName(name ?? "", drawing.layers.length + 1),
    visible: true,
    opacity: 1,
    locked: false,
    assetPath,
    x,
    y,
    width: naturalWidth,
    height: naturalHeight,
  };
  return {
    drawing: { ...drawing, layers: [...drawing.layers, layer] },
    layerId,
  };
}

export function removeLayer(drawing: MapDrawingV2, layerId: string): MapDrawingV2 {
  if (drawing.layers.length <= 1) {
    throw new MapLayerError("last_layer");
  }
  const index = drawing.layers.findIndex((layer) => layer.id === layerId);
  if (index === -1) {
    throw new MapLayerError("not_found");
  }
  return {
    ...drawing,
    layers: drawing.layers.filter((layer) => layer.id !== layerId),
  };
}

export function updateLayer(
  drawing: MapDrawingV2,
  layerId: string,
  patch: MapLayerPatch,
): MapDrawingV2 {
  const index = drawing.layers.findIndex((layer) => layer.id === layerId);
  if (index === -1) {
    throw new MapLayerError("not_found");
  }
  const nextPatch = { ...patch };
  if (typeof nextPatch.opacity === "number") {
    nextPatch.opacity = clampLayerOpacity(nextPatch.opacity);
  }
  if (typeof nextPatch.name === "string") {
    nextPatch.name = normalizeLayerName(nextPatch.name, index + 1);
  }
  return {
    ...drawing,
    layers: drawing.layers.map((layer) =>
      layer.id === layerId ? { ...layer, ...nextPatch } : layer,
    ),
  };
}

export function reorderLayers(
  drawing: MapDrawingV2,
  fromIndex: number,
  toIndex: number,
): MapDrawingV2 {
  if (
    fromIndex < 0 ||
    fromIndex >= drawing.layers.length ||
    toIndex < 0 ||
    toIndex >= drawing.layers.length ||
    fromIndex === toIndex
  ) {
    return drawing;
  }
  const layers = [...drawing.layers];
  const [item] = layers.splice(fromIndex, 1);
  if (!item) {
    return drawing;
  }
  layers.splice(toIndex, 0, item);
  return { ...drawing, layers };
}

export function layerArrayIndex(drawing: MapDrawingV2, layerId: string): number {
  return drawing.layers.findIndex((layer) => layer.id === layerId);
}

/** Sube la capa en el stack visual (índice mayor = encima). */
export function moveLayerTowardFront(
  drawing: MapDrawingV2,
  layerId: string,
): MapDrawingV2 {
  const index = layerArrayIndex(drawing, layerId);
  if (index < 0 || index >= drawing.layers.length - 1) {
    return drawing;
  }
  return reorderLayers(drawing, index, index + 1);
}

/** Baja la capa en el stack visual. */
export function moveLayerTowardBack(
  drawing: MapDrawingV2,
  layerId: string,
): MapDrawingV2 {
  const index = layerArrayIndex(drawing, layerId);
  if (index <= 0) {
    return drawing;
  }
  return reorderLayers(drawing, index, index - 1);
}

/** Capa superior primero — orden de panel UI (MAP-006 D2). */
export function layersForPanel(drawing: MapDrawingV2): MapDrawingLayerV2[] {
  return [...drawing.layers].reverse();
}

export function createStrokeId(): string {
  return `stroke-${crypto.randomUUID()}`;
}

export function shouldAppendPoint(
  last: MapStrokePointV2 | undefined,
  next: MapStrokePointV2,
): boolean {
  if (!last) return true;
  return documentDistance(last, next) >= MAP_STUDIO_MIN_POINT_DISTANCE;
}

export function appendPointToStroke(
  stroke: MapStrokeV2,
  point: MapStrokePointV2,
): MapStrokeV2 {
  if (!shouldAppendPoint(stroke.points[stroke.points.length - 1], point)) {
    return stroke;
  }
  return {
    ...stroke,
    points: [...stroke.points, point],
  };
}

export function pushStrokeToLayer(
  drawing: MapDrawingV2,
  layerId: string,
  stroke: MapStrokeV2,
): MapDrawingV2 {
  return {
    ...drawing,
    layers: drawing.layers.map((layer) => {
      if (layer.id !== layerId || isImageLayer(layer)) return layer;
      return { ...layer, strokes: [...getLayerStrokes(layer), stroke] };
    }),
  };
}

export function removeStrokeFromLayer(
  drawing: MapDrawingV2,
  layerId: string,
  strokeId: string,
): { drawing: MapDrawingV2; removed: MapStrokeV2 | null } {
  let removed: MapStrokeV2 | null = null;
  const layers = drawing.layers.map((layer) => {
    if (layer.id !== layerId || isImageLayer(layer)) return layer;
    const strokes = getLayerStrokes(layer).filter((stroke) => {
      if (stroke.id === strokeId) {
        removed = stroke;
        return false;
      }
      return true;
    });
    return { ...layer, strokes };
  });
  return { drawing: { ...drawing, layers }, removed };
}
