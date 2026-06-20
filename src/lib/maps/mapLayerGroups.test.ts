import { describe, expect, it } from "vitest";

import {
  addLayerGroup,
  assignLayerToGroup,
  buildLayerPanelRows,
  removeLayerGroup,
  reorderPanelRows,
  resolveLayerEffectiveState,
} from "@/lib/maps/mapLayerGroups";
import type { MapDrawingV2 } from "@/lib/types/maps";

function sampleDrawing(): MapDrawingV2 {
  return {
    version: 2,
    width: 100,
    height: 100,
    layers: [
      {
        id: "layer-1",
        name: "Capa 1",
        visible: true,
        opacity: 1,
        locked: false,
        strokes: [],
      },
      {
        id: "layer-2",
        name: "Capa 2",
        visible: true,
        opacity: 0.5,
        locked: false,
        strokes: [],
        groupId: "group-1",
      },
    ],
    groups: [
      {
        id: "group-1",
        name: "Carpeta",
        visible: true,
        opacity: 0.8,
        locked: false,
      },
    ],
  };
}

describe("resolveLayerEffectiveState", () => {
  it("multiplica opacidad grupo × capa", () => {
    const layer = sampleDrawing().layers[1]!;
    expect(resolveLayerEffectiveState(layer, sampleDrawing().groups)).toMatchObject({
      visible: true,
      opacity: 0.4,
      locked: false,
    });
  });

  it("oculta capa si carpeta está oculta", () => {
    const drawing = sampleDrawing();
    drawing.groups![0]!.visible = false;
    const layer = drawing.layers[1]!;
    expect(resolveLayerEffectiveState(layer, drawing.groups).visible).toBe(false);
  });
});

describe("buildLayerPanelRows", () => {
  it("agrupa capas bajo fila carpeta", () => {
    const rows = buildLayerPanelRows(sampleDrawing());
    expect(rows.some((row) => row.kind === "group")).toBe(true);
  });

  it("muestra carpetas vacías en la lista", () => {
    const { drawing } = addLayerGroup(sampleDrawing(), "Vacía");
    const rows = buildLayerPanelRows(drawing);
    expect(rows.some((row) => row.kind === "group" && row.members.length === 0)).toBe(true);
  });
});

describe("assignLayerToGroup", () => {
  it("asigna groupId y reagrupa bloque", () => {
    const drawing = sampleDrawing();
    const next = assignLayerToGroup(drawing, "layer-1", "group-1");
    expect(next.layers.every((layer) => layer.groupId === "group-1")).toBe(true);
  });
});

describe("removeLayerGroup", () => {
  it("disuelve carpeta dejando capas sueltas", () => {
    const next = removeLayerGroup(sampleDrawing(), "group-1");
    expect(next.groups).toHaveLength(0);
    expect(next.layers.every((layer) => !layer.groupId)).toBe(true);
  });
});

describe("addLayerGroup", () => {
  it("añade carpeta vacía", () => {
    const base: MapDrawingV2 = {
      version: 2,
      width: 100,
      height: 100,
      layers: sampleDrawing().layers.map((layer) => ({ ...layer, groupId: null })),
    };
    const { drawing, groupId } = addLayerGroup(base, "Bosque");
    expect(drawing.groups?.some((group) => group.id === groupId)).toBe(true);
  });
});

describe("reorderPanelRows", () => {
  it("asigna capa suelta al soltar sobre carpeta vacía", () => {
    const base: MapDrawingV2 = {
      version: 2,
      width: 100,
      height: 100,
      layers: [
        {
          id: "layer-1",
          name: "Capa 1",
          visible: true,
          opacity: 1,
          locked: false,
          strokes: [],
        },
      ],
    };
    const { drawing, groupId } = addLayerGroup(base, "Carpeta");
    const rows = buildLayerPanelRows(drawing);
    const groupRow = rows.find((row) => row.kind === "group");
    const layerRow = rows.find((row) => row.kind === "layer");
    expect(groupRow?.kind).toBe("group");
    expect(layerRow?.kind).toBe("layer");
    if (groupRow?.kind !== "group" || layerRow?.kind !== "layer") return;

    const next = reorderPanelRows(drawing, layerRow, groupRow);
    expect(next.layers.find((layer) => layer.id === "layer-1")?.groupId).toBe(groupId);
  });
});
