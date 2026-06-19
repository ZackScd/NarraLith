import { audit } from "@/lib/audit";
import { isDrawingDirtyAgainstBaseline } from "@/lib/maps/mapDrawingBaseline";
import {
  MAP_UNDO_MAX_DEPTH,
  type MapDrawingUndoOp,
} from "@/lib/maps/mapDrawingSession";
import { normalizeProjectPath } from "@/lib/pathUtils";
import type {
  MapDrawingLayerV2,
  MapDrawingV2,
  MapStrokePointV2,
  MapStrokeV2,
} from "@/lib/types/maps";

export const MAP_DRAWING_DRAFTS_STORAGE_KEY = "narralith:map-drawing-drafts-v1";
export const MAP_DRAWING_DRAFT_SOFT_SIZE_BYTES = 2 * 1024 * 1024;

export interface MapDrawingDraft {
  drawing: MapDrawingV2;
  undoOps: MapDrawingUndoOp[];
  redoOps: MapDrawingUndoOp[];
  baselineFingerprint: string;
  activeLayerId?: string;
  updatedAt: number;
}

type MapDrawingDraftsStore = Record<string, Record<string, MapDrawingDraft>>;

function normalizeRoot(projectRoot: string): string {
  return normalizeProjectPath(projectRoot);
}

function isStrokePoint(value: unknown): value is MapStrokePointV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.x === "number" && typeof record.y === "number";
}

function isStroke(value: unknown): value is MapStrokeV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    (record.tool === "brush" || record.tool === "eraser") &&
    typeof record.brush === "string" &&
    typeof record.color === "string" &&
    typeof record.baseSize === "number" &&
    typeof record.baseOpacity === "number" &&
    Array.isArray(record.points) &&
    record.points.every(isStrokePoint)
  );
}

function isLayer(value: unknown): value is MapDrawingLayerV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.visible === "boolean" &&
    typeof record.opacity === "number" &&
    typeof record.locked === "boolean" &&
    Array.isArray(record.strokes) &&
    record.strokes.every(isStroke)
  );
}

export function isValidMapDrawingV2(value: unknown): value is MapDrawingV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.version === 2 &&
    typeof record.width === "number" &&
    typeof record.height === "number" &&
    Array.isArray(record.layers) &&
    record.layers.every(isLayer)
  );
}

function isUndoOp(value: unknown): value is MapDrawingUndoOp {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    (record.kind === "addStroke" || record.kind === "removeStroke") &&
    typeof record.layerId === "string" &&
    isStroke(record.stroke)
  );
}

export function truncateDraftStacks(draft: MapDrawingDraft): MapDrawingDraft {
  return {
    ...draft,
    undoOps: draft.undoOps.slice(-MAP_UNDO_MAX_DEPTH),
    redoOps: draft.redoOps.slice(-MAP_UNDO_MAX_DEPTH),
  };
}

/** Valida borrador contra el dibujo en disco (MAP-005b D19). */
export function validateMapDrawingDraft(
  draft: unknown,
  diskDrawing: MapDrawingV2,
): draft is MapDrawingDraft {
  if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
    return false;
  }
  const record = draft as Record<string, unknown>;
  if (!isValidMapDrawingV2(record.drawing)) {
    return false;
  }
  if (
    record.drawing.width !== diskDrawing.width ||
    record.drawing.height !== diskDrawing.height
  ) {
    return false;
  }
  if (typeof record.baselineFingerprint !== "string") {
    return false;
  }
  if (typeof record.updatedAt !== "number") {
    return false;
  }
  if (!Array.isArray(record.undoOps) || !record.undoOps.every(isUndoOp)) {
    return false;
  }
  if (!Array.isArray(record.redoOps) || !record.redoOps.every(isUndoOp)) {
    return false;
  }
  return isDrawingDirtyAgainstBaseline(
    record.drawing,
    record.baselineFingerprint,
  );
}

function loadStore(): MapDrawingDraftsStore {
  try {
    const raw = localStorage.getItem(MAP_DRAWING_DRAFTS_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as MapDrawingDraftsStore;
  } catch {
    return {};
  }
}

function saveStore(store: MapDrawingDraftsStore): void {
  localStorage.setItem(MAP_DRAWING_DRAFTS_STORAGE_KEY, JSON.stringify(store));
}

export function getMapDrawingDraft(
  projectRoot: string,
  mapId: string,
): MapDrawingDraft | null {
  const root = normalizeRoot(projectRoot);
  const draft = loadStore()[root]?.[mapId];
  if (!draft || typeof draft !== "object") {
    return null;
  }
  return draft;
}

export function setMapDrawingDraft(
  projectRoot: string,
  mapId: string,
  draft: MapDrawingDraft,
): void {
  const normalized = truncateDraftStacks(draft);
  const root = normalizeRoot(projectRoot);
  const store = loadStore();
  const projectDrafts = { ...(store[root] ?? {}), [mapId]: normalized };
  const payload = JSON.stringify({ ...store, [root]: projectDrafts });
  if (payload.length > MAP_DRAWING_DRAFT_SOFT_SIZE_BYTES) {
    audit.debug("project", "obs.map.draftPersist.large", {
      mapId,
      bytes: payload.length,
      limit: MAP_DRAWING_DRAFT_SOFT_SIZE_BYTES,
    });
  }
  saveStore({ ...store, [root]: projectDrafts });
}

export function clearMapDrawingDraft(projectRoot: string, mapId: string): void {
  const root = normalizeRoot(projectRoot);
  const store = loadStore();
  const projectDrafts = store[root];
  if (!projectDrafts?.[mapId]) {
    return;
  }
  const nextProjectDrafts = { ...projectDrafts };
  delete nextProjectDrafts[mapId];
  const nextStore = { ...store };
  if (Object.keys(nextProjectDrafts).length === 0) {
    delete nextStore[root];
  } else {
    nextStore[root] = nextProjectDrafts;
  }
  saveStore(nextStore);
}

export function clearProjectMapDrawingDrafts(projectRoot: string): void {
  const root = normalizeRoot(projectRoot);
  const store = loadStore();
  if (!store[root]) {
    return;
  }
  const nextStore = { ...store };
  delete nextStore[root];
  saveStore(nextStore);
}
