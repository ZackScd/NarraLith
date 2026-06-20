import { useCallback, useEffect, useRef, useState } from "react";

import {
  fingerprintMapDrawing,
  isDrawingDirtyAgainstBaseline,
} from "@/lib/maps/mapDrawingBaseline";
import {
  getMapDrawingDraft,
  validateMapDrawingDraft,
  type MapDrawingDraft,
} from "@/lib/maps/mapDrawingDraft";
import {
  addLayer,
  cloneDrawing,
  ensureActiveLayerId,
  MAP_UNDO_MAX_DEPTH,
  pushStrokeToLayer,
  removeLayer,
  removeStrokeFromLayer,
  reorderLayers,
  resolveActiveLayer,
  resolveDefaultActiveLayerId,
  updateLayer,
  type MapDrawingSaveStatus,
  type MapDrawingUndoOp,
  type MapLayerPatch,
} from "@/lib/maps/mapDrawingSession";
import {
  addLayerGroup,
  assignLayerToGroup,
  buildLayerPanelRows,
  panelRowDragId,
  removeLayerGroup,
  reorderPanelRows,
  updateLayerGroup,
  type LayerGroupPatch,
} from "@/lib/maps/mapLayerGroups";
import { strokeHadPressure } from "@/lib/maps/mapDrawingStats";
import { trackAction } from "@/lib/action-audit/trackAction";
import type { MapDrawingV2, MapStrokeV2 } from "@/lib/types/maps";

export { MAP_UNDO_MAX_DEPTH };

interface UseMapDrawingSessionOptions {
  sessionKey: string;
  sourceDrawing: MapDrawingV2 | null;
  mapId?: string | null;
  projectRoot?: string;
  drawingRefKey?: string;
}

export function useMapDrawingSession({
  sessionKey,
  sourceDrawing,
  mapId = null,
  projectRoot = "",
  drawingRefKey = "principal",
}: UseMapDrawingSessionOptions) {
  const [drawing, setDrawing] = useState<MapDrawingV2 | null>(null);
  const [activeLayerId, setActiveLayerIdState] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<MapDrawingSaveStatus>("idle");
  const [currentStroke, setCurrentStroke] = useState<MapStrokeV2 | null>(null);
  const undoStack = useRef<MapDrawingUndoOp[]>([]);
  const redoStack = useRef<MapDrawingUndoOp[]>([]);
  const lastKey = useRef<string | null>(null);
  const baselineFingerprint = useRef("");
  const drawingRef = useRef<MapDrawingV2 | null>(null);
  const activeLayerIdRef = useRef<string | null>(null);
  const [undoDepth, setUndoDepth] = useState(0);
  const [redoDepth, setRedoDepth] = useState(0);

  drawingRef.current = drawing;
  activeLayerIdRef.current = activeLayerId;

  const applyDirtyFromDrawing = useCallback((next: MapDrawingV2 | null) => {
    if (!next) {
      setIsDirty(false);
      return;
    }
    setIsDirty(isDrawingDirtyAgainstBaseline(next, baselineFingerprint.current));
  }, []);

  const syncActiveLayerAfterDrawingChange = useCallback((next: MapDrawingV2) => {
    const resolved = ensureActiveLayerId(next, activeLayerIdRef.current);
    setActiveLayerIdState(resolved);
    return resolved;
  }, []);

  const resetFromSource = useCallback((next: MapDrawingV2 | null) => {
    setDrawing(next ? cloneDrawing(next) : null);
    baselineFingerprint.current = next ? fingerprintMapDrawing(next) : "";
    setActiveLayerIdState(next ? resolveDefaultActiveLayerId(next) : null);
    setIsDirty(false);
    setSaveStatus("idle");
    setCurrentStroke(null);
    undoStack.current = [];
    redoStack.current = [];
    setUndoDepth(0);
    setRedoDepth(0);
  }, []);

  const restoreFromDraft = useCallback((draft: MapDrawingDraft) => {
    setDrawing(cloneDrawing(draft.drawing));
    baselineFingerprint.current = draft.baselineFingerprint;
    undoStack.current = draft.undoOps.slice(-MAP_UNDO_MAX_DEPTH);
    redoStack.current = draft.redoOps.slice(-MAP_UNDO_MAX_DEPTH);
    setUndoDepth(undoStack.current.length);
    setRedoDepth(redoStack.current.length);
    setActiveLayerIdState(
      ensureActiveLayerId(
        draft.drawing,
        draft.activeLayerId ?? resolveDefaultActiveLayerId(draft.drawing),
      ),
    );
    setIsDirty(isDrawingDirtyAgainstBaseline(draft.drawing, draft.baselineFingerprint));
    setSaveStatus("idle");
    setCurrentStroke(null);
  }, []);

  const bootstrapSession = useCallback(
    (disk: MapDrawingV2 | null) => {
      if (!disk) {
        resetFromSource(null);
        return;
      }
      if (projectRoot && mapId) {
        const draft = getMapDrawingDraft(projectRoot, mapId, drawingRefKey);
        if (draft && validateMapDrawingDraft(draft, disk)) {
          restoreFromDraft(draft);
          return;
        }
      }
      resetFromSource(disk);
    },
    [drawingRefKey, mapId, projectRoot, resetFromSource, restoreFromDraft],
  );

  useEffect(() => {
    if (lastKey.current === sessionKey) return;
    lastKey.current = sessionKey;
    bootstrapSession(sourceDrawing);
  }, [bootstrapSession, sessionKey, sourceDrawing]);

  useEffect(() => {
    if (!sourceDrawing || drawing !== null) return;
    if (lastKey.current !== sessionKey) return;
    bootstrapSession(sourceDrawing);
  }, [bootstrapSession, drawing, sessionKey, sourceDrawing]);

  const syncFromServer = useCallback(
    (next: MapDrawingV2) => {
      resetFromSource(next);
    },
    [resetFromSource],
  );

  const exportDraftSnapshot = useCallback((): MapDrawingDraft | null => {
    const current = drawingRef.current;
    if (!current) {
      return null;
    }
    if (!isDrawingDirtyAgainstBaseline(current, baselineFingerprint.current)) {
      return null;
    }
    return {
      drawing: cloneDrawing(current),
      undoOps: undoStack.current.slice(-MAP_UNDO_MAX_DEPTH),
      redoOps: redoStack.current.slice(-MAP_UNDO_MAX_DEPTH),
      baselineFingerprint: baselineFingerprint.current,
      activeLayerId: activeLayerIdRef.current ?? undefined,
      updatedAt: Date.now(),
    };
  }, []);

  const setPreviewStroke = useCallback((stroke: MapStrokeV2 | null) => {
    setCurrentStroke(stroke);
  }, []);

  const mutateDrawing = useCallback(
    (
      mutator: (current: MapDrawingV2) => MapDrawingV2,
      options?: { nextActiveLayerId?: string | null },
    ) => {
      setDrawing((prev) => {
        if (!prev) return prev;
        const next = mutator(prev);
        if (options?.nextActiveLayerId !== undefined) {
          setActiveLayerIdState(options.nextActiveLayerId);
        } else {
          syncActiveLayerAfterDrawingChange(next);
        }
        applyDirtyFromDrawing(next);
        setSaveStatus("idle");
        return next;
      });
    },
    [applyDirtyFromDrawing, syncActiveLayerAfterDrawingChange],
  );

  const selectActiveLayer = useCallback(
    (layerId: string) => {
      if (!drawing) return;
      const layer = drawing.layers.find((item) => item.id === layerId);
      if (!layer) return;
      const previousLayerId = activeLayerIdRef.current;
      if (previousLayerId === layerId) return;
      setActiveLayerIdState(layerId);
      if (mapId) {
        trackAction("map", "layerSelect", {
          mapId,
          layerId,
          previousLayerId: previousLayerId ?? undefined,
        });
      }
    },
    [drawing, mapId],
  );

  const createLayer = useCallback(
    (name?: string) => {
      if (!drawing) return null;
      const result = addLayer(drawing, name);
      mutateDrawing(() => result.drawing, { nextActiveLayerId: result.layerId });
      if (mapId) {
        trackAction("map", "layerCreate", {
          mapId,
          layerId: result.layerId,
          index: result.drawing.layers.length - 1,
        });
        trackAction("map", "layerSelect", {
          mapId,
          layerId: result.layerId,
          previousLayerId: activeLayerIdRef.current ?? undefined,
        });
      }
      return result.layerId;
    },
    [drawing, mapId, mutateDrawing],
  );

  const deleteLayer = useCallback(
    (layerId: string) => {
      if (!drawing) return false;
      const strokeCount =
        drawing.layers.find((layer) => layer.id === layerId)?.strokes.length ?? 0;
      try {
        const next = removeLayer(drawing, layerId);
        const nextActiveLayerId = ensureActiveLayerId(next, activeLayerIdRef.current);
        mutateDrawing(() => next, { nextActiveLayerId });
        if (mapId) {
          trackAction("map", "layerDelete", { mapId, layerId, strokeCount });
        }
        return true;
      } catch {
        return false;
      }
    },
    [drawing, mapId, mutateDrawing],
  );

  const patchLayer = useCallback(
    (layerId: string, patch: MapLayerPatch, obsAction?: "layerVisible" | "layerOpacity" | "layerLock" | "layerRename") => {
      if (!drawing) return;
      try {
        const next = updateLayer(drawing, layerId, patch);
        mutateDrawing(() => next);
        if (mapId && obsAction) {
          if (obsAction === "layerVisible" && typeof patch.visible === "boolean") {
            trackAction("map", "layerVisible", { mapId, layerId, visible: patch.visible });
          } else if (obsAction === "layerOpacity" && typeof patch.opacity === "number") {
            trackAction("map", "layerOpacity", { mapId, layerId, opacity: patch.opacity });
          } else if (obsAction === "layerLock" && typeof patch.locked === "boolean") {
            trackAction("map", "layerLock", { mapId, layerId, locked: patch.locked });
          } else if (obsAction === "layerRename" && typeof patch.name === "string") {
            trackAction("map", "layerRename", {
              mapId,
              layerId,
              nameLength: patch.name.length,
            });
          }
        }
      } catch {
        // capa no encontrada — ignorar
      }
    },
    [drawing, mapId, mutateDrawing],
  );

  const moveLayerToIndex = useCallback(
    (layerId: string, toIndex: number) => {
      if (!drawing) return;
      const fromIndex = drawing.layers.findIndex((layer) => layer.id === layerId);
      if (fromIndex === -1 || fromIndex === toIndex) return;
      const next = reorderLayers(drawing, fromIndex, toIndex);
      mutateDrawing(() => next);
      if (mapId) {
        trackAction("map", "layerReorder", {
          mapId,
          layerId,
          fromIndex,
          toIndex,
        });
      }
    },
    [drawing, mapId, mutateDrawing],
  );

  const createGroup = useCallback(
    (name?: string) => {
      if (!drawing) return null;
      const result = addLayerGroup(drawing, name);
      mutateDrawing(() => result.drawing);
      const group = result.drawing.groups?.find((item) => item.id === result.groupId);
      if (!group) return null;
      return { groupId: group.id, name: group.name };
    },
    [drawing, mutateDrawing],
  );

  const deleteGroup = useCallback(
    (groupId: string) => {
      if (!drawing) return;
      mutateDrawing(() => removeLayerGroup(drawing, groupId));
    },
    [drawing, mutateDrawing],
  );

  const patchGroup = useCallback(
    (groupId: string, patch: LayerGroupPatch) => {
      if (!drawing) return;
      mutateDrawing(() => updateLayerGroup(drawing, groupId, patch));
    },
    [drawing, mutateDrawing],
  );

  const assignLayerGroup = useCallback(
    (layerId: string, groupId: string | null) => {
      if (!drawing) return;
      mutateDrawing(() => assignLayerToGroup(drawing, layerId, groupId));
    },
    [drawing, mutateDrawing],
  );

  const reorderPanelRow = useCallback(
    (fromDragId: string, toDragId: string) => {
      if (!drawing || fromDragId === toDragId) return;
      const rows = buildLayerPanelRows(drawing);
      const fromRow = rows.find((row) => panelRowDragId(row) === fromDragId);
      const toRow = rows.find((row) => panelRowDragId(row) === toDragId);
      if (!fromRow || !toRow) return;
      mutateDrawing(() => reorderPanelRows(drawing, fromRow, toRow));
    },
    [drawing, mutateDrawing],
  );

  const commitStroke = useCallback(
    (stroke: MapStrokeV2) => {
      setDrawing((prev) => {
        if (!prev) return prev;
        const layer = resolveActiveLayer(prev, activeLayerIdRef.current);
        if (!layer) return prev;
        const next = pushStrokeToLayer(prev, layer.id, stroke);
        undoStack.current = [
          ...undoStack.current.slice(-(MAP_UNDO_MAX_DEPTH - 1)),
          { kind: "addStroke", layerId: layer.id, stroke },
        ];
        redoStack.current = [];
        setUndoDepth(undoStack.current.length);
        setRedoDepth(0);
        applyDirtyFromDrawing(next);
        return next;
      });
      setCurrentStroke(null);
      setSaveStatus("idle");
      if (mapId) {
        const currentDrawing = drawingRef.current;
        const layer = currentDrawing
          ? resolveActiveLayer(currentDrawing, activeLayerIdRef.current)
          : null;
        trackAction("map", "drawStroke", {
          mapId,
          layerId: layer?.id,
          strokeId: stroke.id,
          tool: stroke.tool,
          brush: stroke.brush,
          pointCount: stroke.points.length,
          hadPressure: strokeHadPressure(stroke),
        });
      }
    },
    [applyDirtyFromDrawing, mapId],
  );

  const undo = useCallback((): boolean => {
    const op = undoStack.current.pop();
    if (!op || !drawing) return false;
    if (op.kind === "addStroke") {
      const { drawing: next, removed } = removeStrokeFromLayer(drawing, op.layerId, op.stroke.id);
      if (!removed) return false;
      setDrawing(next);
      redoStack.current.push(op);
      setUndoDepth(undoStack.current.length);
      setRedoDepth(redoStack.current.length);
      applyDirtyFromDrawing(next);
      setSaveStatus("idle");
      if (mapId) {
        trackAction("map", "undo", {
          mapId,
          depth: undoStack.current.length,
          layerId: op.layerId,
          strokeId: op.stroke.id,
        });
      }
      return true;
    }
    return false;
  }, [applyDirtyFromDrawing, drawing, mapId]);

  const redo = useCallback((): boolean => {
    const op = redoStack.current.pop();
    if (!op || !drawing) return false;
    if (op.kind === "addStroke") {
      const next = pushStrokeToLayer(drawing, op.layerId, op.stroke);
      setDrawing(next);
      undoStack.current.push(op);
      setUndoDepth(undoStack.current.length);
      setRedoDepth(redoStack.current.length);
      applyDirtyFromDrawing(next);
      setSaveStatus("idle");
      if (mapId) {
        trackAction("map", "redo", {
          mapId,
          depth: redoStack.current.length,
          layerId: op.layerId,
          strokeId: op.stroke.id,
        });
      }
      return true;
    }
    return false;
  }, [applyDirtyFromDrawing, drawing, mapId]);

  const markSaved = useCallback(() => {
    const current = drawingRef.current;
    if (current) {
      baselineFingerprint.current = fingerprintMapDrawing(current);
    }
    setIsDirty(false);
    setSaveStatus("saved");
  }, []);

  return {
    drawing,
    activeLayerId,
    isDirty,
    saveStatus,
    setSaveStatus,
    currentStroke,
    canUndo: undoDepth > 0,
    canRedo: redoDepth > 0,
    undoDepth,
    redoDepth,
    baselineFingerprint: baselineFingerprint.current,
    setPreviewStroke,
    commitStroke,
    undo,
    redo,
    markSaved,
    exportDraftSnapshot,
    syncFromServer,
    resetFromSource,
    selectActiveLayer,
    createLayer,
    deleteLayer,
    patchLayer,
    moveLayerToIndex,
    createGroup,
    deleteGroup,
    patchGroup,
    assignLayerGroup,
    reorderPanelRow,
  };
}
