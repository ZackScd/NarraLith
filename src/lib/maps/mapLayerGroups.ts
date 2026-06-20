import {
  clampLayerOpacity,
  normalizeLayerName,
} from "@/lib/maps/mapDrawingSession";
import type {
  MapDrawingLayerGroupV2,
  MapDrawingLayerV2,
  MapDrawingV2,
} from "@/lib/types/maps";

export interface LayerEffectiveState {
  visible: boolean;
  opacity: number;
  locked: boolean;
}

export type LayerPanelRow =
  | {
      kind: "layer";
      layer: MapDrawingLayerV2;
      stackIndex: number;
    }
  | {
      kind: "group";
      group: MapDrawingLayerGroupV2;
      members: { layer: MapDrawingLayerV2; stackIndex: number }[];
    };

export function drawingGroups(drawing: MapDrawingV2): MapDrawingLayerGroupV2[] {
  return drawing.groups ?? [];
}

export function createGroupId(): string {
  return `group-${crypto.randomUUID().slice(0, 8)}`;
}

export function resolveLayerEffectiveState(
  layer: MapDrawingLayerV2,
  groups: MapDrawingLayerGroupV2[] | undefined,
): LayerEffectiveState {
  const base = {
    visible: layer.visible,
    opacity: layer.opacity,
    locked: layer.locked,
  };
  if (!layer.groupId) {
    return base;
  }
  const group = groups?.find((item) => item.id === layer.groupId);
  if (!group) {
    return base;
  }
  return {
    visible: base.visible && group.visible,
    opacity: clampLayerOpacity(base.opacity * group.opacity),
    locked: base.locked || group.locked,
  };
}

function emptyPanelGroups(drawing: MapDrawingV2): MapDrawingLayerGroupV2[] {
  const groups = drawingGroups(drawing);
  return [...groups]
    .reverse()
    .filter((group) => !drawing.layers.some((layer) => layer.groupId === group.id));
}

export function buildLayerPanelRows(drawing: MapDrawingV2): LayerPanelRow[] {
  const groups = drawingGroups(drawing);
  const reversed = [...drawing.layers].reverse().map((layer, panelIndex) => ({
    layer,
    stackIndex: drawing.layers.length - 1 - panelIndex,
  }));
  const rows: LayerPanelRow[] = [];
  const emittedGroups = new Set<string>();

  for (const group of emptyPanelGroups(drawing)) {
    rows.push({ kind: "group", group, members: [] });
    emittedGroups.add(group.id);
  }

  for (const entry of reversed) {
    const groupId = entry.layer.groupId;
    if (groupId) {
      if (emittedGroups.has(groupId)) {
        continue;
      }
      const group = groups.find((item) => item.id === groupId);
      if (!group) {
        rows.push({ kind: "layer", layer: entry.layer, stackIndex: entry.stackIndex });
        continue;
      }
      const members = reversed.filter((item) => item.layer.groupId === groupId);
      rows.push({ kind: "group", group, members });
      emittedGroups.add(groupId);
      continue;
    }
    rows.push({ kind: "layer", layer: entry.layer, stackIndex: entry.stackIndex });
  }

  return rows;
}

export function addLayerGroup(
  drawing: MapDrawingV2,
  name?: string,
): { drawing: MapDrawingV2; groupId: string } {
  const groupId = createGroupId();
  const index = (drawing.groups?.length ?? 0) + 1;
  const group: MapDrawingLayerGroupV2 = {
    id: groupId,
    name: normalizeLayerName(name ?? `Carpeta ${index}`, index),
    visible: true,
    opacity: 1,
    locked: false,
    collapsed: false,
  };
  return {
    drawing: {
      ...drawing,
      groups: [...drawingGroups(drawing), group],
    },
    groupId,
  };
}

export type LayerGroupPatch = Partial<
  Pick<MapDrawingLayerGroupV2, "name" | "visible" | "opacity" | "locked" | "collapsed">
>;

export function updateLayerGroup(
  drawing: MapDrawingV2,
  groupId: string,
  patch: LayerGroupPatch,
): MapDrawingV2 {
  const groups = drawingGroups(drawing);
  const index = groups.findIndex((item) => item.id === groupId);
  if (index === -1) {
    return drawing;
  }
  const nextPatch = { ...patch };
  if (typeof nextPatch.opacity === "number") {
    nextPatch.opacity = clampLayerOpacity(nextPatch.opacity);
  }
  if (typeof nextPatch.name === "string") {
    nextPatch.name = normalizeLayerName(nextPatch.name, index + 1);
  }
  const nextGroups = groups.map((group) =>
    group.id === groupId ? { ...group, ...nextPatch } : group,
  );
  return { ...drawing, groups: nextGroups };
}

/** Elimina carpeta; las capas hijas vuelven a la raíz (disolver). */
export function removeLayerGroup(drawing: MapDrawingV2, groupId: string): MapDrawingV2 {
  return {
    ...drawing,
    groups: drawingGroups(drawing).filter((group) => group.id !== groupId),
    layers: drawing.layers.map((layer) =>
      layer.groupId === groupId ? { ...layer, groupId: null } : layer,
    ),
  };
}

export function assignLayerToGroup(
  drawing: MapDrawingV2,
  layerId: string,
  groupId: string | null,
): MapDrawingV2 {
  if (groupId && !drawingGroups(drawing).some((group) => group.id === groupId)) {
    return drawing;
  }
  const layerIndex = drawing.layers.findIndex((layer) => layer.id === layerId);
  if (layerIndex === -1) {
    return drawing;
  }

  let layers = drawing.layers.map((layer) =>
    layer.id === layerId ? { ...layer, groupId: groupId ?? null } : layer,
  );

  if (groupId) {
    const block = layers.filter((layer) => layer.groupId === groupId);
    const rest = layers.filter((layer) => layer.groupId !== groupId);
    layers = [...rest, ...block];
  }

  return { ...drawing, layers };
}

export function moveGroupToStackIndex(
  drawing: MapDrawingV2,
  groupId: string,
  toStackIndex: number,
): MapDrawingV2 {
  const layerIds = drawing.layers.filter((layer) => layer.groupId === groupId).map((l) => l.id);
  if (layerIds.length === 0) {
    return drawing;
  }
  const idSet = new Set(layerIds);
  const block = drawing.layers.filter((layer) => idSet.has(layer.id));
  const rest = drawing.layers.filter((layer) => !idSet.has(layer.id));
  const clamped = Math.max(0, Math.min(toStackIndex, rest.length));
  const layers = [...rest.slice(0, clamped), ...block, ...rest.slice(clamped)];
  return { ...drawing, layers };
}

export function panelRowDragId(row: LayerPanelRow): string {
  return row.kind === "group" ? `group:${row.group.id}` : `layer:${row.layer.id}`;
}

function reorderGroupMetadata(
  drawing: MapDrawingV2,
  fromGroupId: string,
  toGroupId: string,
): MapDrawingV2 {
  const groups = [...drawingGroups(drawing)];
  const fromIndex = groups.findIndex((group) => group.id === fromGroupId);
  const toIndex = groups.findIndex((group) => group.id === toGroupId);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return drawing;
  }
  const [item] = groups.splice(fromIndex, 1);
  groups.splice(toIndex, 0, item);
  return { ...drawing, groups };
}

function moveLayerRelativeToRow(
  drawing: MapDrawingV2,
  layerId: string,
  toRow: Extract<LayerPanelRow, { kind: "layer" }>,
): MapDrawingV2 {
  const fromIndex = drawing.layers.findIndex((layer) => layer.id === layerId);
  const toIndex = drawing.layers.findIndex((layer) => layer.id === toRow.layer.id);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
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

export function reorderPanelRows(
  drawing: MapDrawingV2,
  fromRow: LayerPanelRow,
  toRow: LayerPanelRow,
): MapDrawingV2 {
  if (fromRow.kind === "group" && toRow.kind === "group") {
    if (fromRow.group.id === toRow.group.id) {
      return drawing;
    }
    if (fromRow.members.length === 0 && toRow.members.length === 0) {
      return reorderGroupMetadata(drawing, fromRow.group.id, toRow.group.id);
    }
    if (fromRow.members.length > 0) {
      const targetIndex =
        toRow.members.length > 0
          ? Math.min(...toRow.members.map((item) => item.stackIndex))
          : 0;
      return moveGroupToStackIndex(drawing, fromRow.group.id, targetIndex);
    }
    return reorderGroupMetadata(drawing, fromRow.group.id, toRow.group.id);
  }

  if (fromRow.kind === "layer" && toRow.kind === "layer") {
    const fromGroupId = fromRow.layer.groupId ?? null;
    const toGroupId = toRow.layer.groupId ?? null;
    let next = drawing;
    if (fromGroupId !== toGroupId) {
      next = assignLayerToGroup(next, fromRow.layer.id, toGroupId);
    }
    return moveLayerRelativeToRow(next, fromRow.layer.id, toRow);
  }

  if (fromRow.kind === "group" && toRow.kind === "layer") {
    return moveGroupToStackIndex(drawing, fromRow.group.id, toRow.stackIndex);
  }

  if (fromRow.kind === "layer" && toRow.kind === "group") {
    return assignLayerToGroup(drawing, fromRow.layer.id, toRow.group.id);
  }

  return drawing;
}
