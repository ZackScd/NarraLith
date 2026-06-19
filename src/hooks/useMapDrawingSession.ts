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
  cloneDrawing,
  MAP_UNDO_MAX_DEPTH,
  pushStrokeToLayer,
  removeStrokeFromLayer,
  resolveActiveLayer,
  type MapDrawingSaveStatus,
  type MapDrawingUndoOp,
} from "@/lib/maps/mapDrawingSession";
import { strokeHadPressure } from "@/lib/maps/mapDrawingStats";
import { trackAction } from "@/lib/action-audit/trackAction";
import type { MapDrawingV2, MapStrokeV2 } from "@/lib/types/maps";

export { MAP_UNDO_MAX_DEPTH };

interface UseMapDrawingSessionOptions {
  sessionKey: string;
  sourceDrawing: MapDrawingV2 | null;
  mapId?: string | null;
  projectRoot?: string;
}

export function useMapDrawingSession({
  sessionKey,
  sourceDrawing,
  mapId = null,
  projectRoot = "",
}: UseMapDrawingSessionOptions) {
  const [drawing, setDrawing] = useState<MapDrawingV2 | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<MapDrawingSaveStatus>("idle");
  const [currentStroke, setCurrentStroke] = useState<MapStrokeV2 | null>(null);
  const undoStack = useRef<MapDrawingUndoOp[]>([]);
  const redoStack = useRef<MapDrawingUndoOp[]>([]);
  const lastKey = useRef<string | null>(null);
  const baselineFingerprint = useRef("");
  const drawingRef = useRef<MapDrawingV2 | null>(null);
  const [undoDepth, setUndoDepth] = useState(0);
  const [redoDepth, setRedoDepth] = useState(0);

  drawingRef.current = drawing;

  const applyDirtyFromDrawing = useCallback((next: MapDrawingV2 | null) => {
    if (!next) {
      setIsDirty(false);
      return;
    }
    setIsDirty(isDrawingDirtyAgainstBaseline(next, baselineFingerprint.current));
  }, []);

  const resetFromSource = useCallback((next: MapDrawingV2 | null) => {
    setDrawing(next ? cloneDrawing(next) : null);
    baselineFingerprint.current = next ? fingerprintMapDrawing(next) : "";
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
        const draft = getMapDrawingDraft(projectRoot, mapId);
        if (draft && validateMapDrawingDraft(draft, disk)) {
          restoreFromDraft(draft);
          return;
        }
      }
      resetFromSource(disk);
    },
    [mapId, projectRoot, resetFromSource, restoreFromDraft],
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
      updatedAt: Date.now(),
    };
  }, []);

  const setPreviewStroke = useCallback((stroke: MapStrokeV2 | null) => {
    setCurrentStroke(stroke);
  }, []);

  const commitStroke = useCallback(
    (stroke: MapStrokeV2) => {
      setDrawing((prev) => {
        if (!prev) return prev;
        const layer = resolveActiveLayer(prev);
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
        trackAction("map", "drawStroke", {
          mapId,
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
        trackAction("map", "undo", { mapId, depth: undoStack.current.length });
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
        trackAction("map", "redo", { mapId, depth: redoStack.current.length });
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
  };
}
