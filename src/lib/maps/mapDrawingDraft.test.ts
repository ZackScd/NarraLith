import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearMapDrawingDraft,
  getMapDrawingDraft,
  setMapDrawingDraft,
  truncateDraftStacks,
  validateMapDrawingDraft,
} from "@/lib/maps/mapDrawingDraft";
import { fingerprintMapDrawing } from "@/lib/maps/mapDrawingBaseline";
import { getLayerStrokes } from "@/lib/maps/mapImageLayers";
import {
  MAP_UNDO_MAX_DEPTH,
  type MapDrawingUndoOp,
} from "@/lib/maps/mapDrawingSession";
import type { MapDrawingV2, MapStrokeV2 } from "@/lib/types/maps";

const PROJECT = "C:/Books/MyNovel";
const MAP_ID = "map-1";

const storage = new Map<string, string>();

function sampleDrawing(strokes = 0): MapDrawingV2 {
  const strokeList: MapStrokeV2[] = [];
  for (let i = 0; i < strokes; i += 1) {
    strokeList.push({
      id: `s${i}`,
      tool: "brush",
      brush: "pen",
      color: "#000",
      baseSize: 2,
      baseOpacity: 1,
      points: [{ x: i, y: i }],
    });
  }
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
        strokes: strokeList,
      },
    ],
  };
}

function sampleDraft(strokes = 1) {
  const drawing = sampleDrawing(strokes);
  return {
    drawing,
    undoOps: [
      {
        kind: "addStroke" as const,
        layerId: "layer-1",
        stroke: getLayerStrokes(drawing.layers[0]!)[0]!,
      },
    ],
    redoOps: [] as MapDrawingUndoOp[],
    baselineFingerprint: "baseline",
    updatedAt: Date.now(),
  };
}

describe("mapDrawingDraft", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trip por proyecto y mapa", () => {
    const draft = sampleDraft();
    setMapDrawingDraft(PROJECT, MAP_ID, draft);
    expect(getMapDrawingDraft(PROJECT, MAP_ID)).toEqual(draft);
    expect(getMapDrawingDraft("D:/Other", MAP_ID)).toBeNull();
  });

  it("normaliza separadores de ruta del proyecto", () => {
    const draft = sampleDraft();
    setMapDrawingDraft("C:\\Books\\MyNovel", MAP_ID, draft);
    expect(getMapDrawingDraft(PROJECT, MAP_ID)).toEqual(draft);
  });

  it("trunca stacks undo/redo al persistir", () => {
    const undoOps: MapDrawingUndoOp[] = [];
    for (let i = 0; i < MAP_UNDO_MAX_DEPTH + 5; i += 1) {
      undoOps.push({
        kind: "addStroke",
        layerId: "layer-1",
        stroke: {
          id: `s${i}`,
          tool: "brush",
          brush: "pen",
          color: "#000",
          baseSize: 2,
          baseOpacity: 1,
          points: [{ x: i, y: i }],
        },
      });
    }
    const draft = {
      ...sampleDraft(),
      undoOps,
      redoOps: undoOps,
    };
    setMapDrawingDraft(PROJECT, MAP_ID, draft);
    const stored = getMapDrawingDraft(PROJECT, MAP_ID)!;
    expect(stored.undoOps).toHaveLength(MAP_UNDO_MAX_DEPTH);
    expect(stored.redoOps).toHaveLength(MAP_UNDO_MAX_DEPTH);
    expect(stored.undoOps[0]?.stroke.id).toBe("s5");
  });

  it("validateMapDrawingDraft rechaza dimensiones distintas al disco", () => {
    const disk = sampleDrawing();
    const draft = sampleDraft();
    draft.drawing.height = 200;
    expect(validateMapDrawingDraft(draft, disk)).toBe(false);
  });

  it("validateMapDrawingDraft rechaza borrador limpio", () => {
    const disk = sampleDrawing();
    const draft = {
      drawing: sampleDrawing(),
      undoOps: [] as MapDrawingUndoOp[],
      redoOps: [] as MapDrawingUndoOp[],
      baselineFingerprint: fingerprintMapDrawing(disk),
      updatedAt: Date.now(),
    };
    expect(validateMapDrawingDraft(draft, disk)).toBe(false);
  });

  it("clearMapDrawingDraft elimina la entrada", () => {
    setMapDrawingDraft(PROJECT, MAP_ID, sampleDraft());
    clearMapDrawingDraft(PROJECT, MAP_ID);
    expect(getMapDrawingDraft(PROJECT, MAP_ID)).toBeNull();
  });
});

describe("truncateDraftStacks", () => {
  it("conserva solo las últimas MAP_UNDO_MAX_DEPTH ops", () => {
    const undoOps: MapDrawingUndoOp[] = Array.from({ length: 60 }, (_, i) => ({
      kind: "addStroke",
      layerId: "layer-1",
      stroke: {
        id: `s${i}`,
        tool: "brush",
        brush: "pen",
        color: "#000",
        baseSize: 2,
        baseOpacity: 1,
        points: [{ x: i, y: i }],
      },
    }));
    const truncated = truncateDraftStacks({
      drawing: sampleDrawing(),
      undoOps,
      redoOps: undoOps,
      baselineFingerprint: "x",
      updatedAt: 0,
    });
    expect(truncated.undoOps).toHaveLength(MAP_UNDO_MAX_DEPTH);
    expect(truncated.redoOps).toHaveLength(MAP_UNDO_MAX_DEPTH);
  });
});
