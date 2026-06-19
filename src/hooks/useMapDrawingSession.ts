import { useCallback, useEffect, useRef, useState } from "react";

import {
  cloneDrawing,
  pushStrokeToLayer,
  removeStrokeFromLayer,
  resolveActiveLayer,
  type MapDrawingSaveStatus,
  type MapDrawingUndoOp,
} from "@/lib/maps/mapDrawingSession";
import { strokeHadPressure } from "@/lib/maps/mapDrawingStats";
import { trackAction } from "@/lib/action-audit/trackAction";
import type { MapDrawingV2, MapStrokeV2 } from "@/lib/types/maps";

const MAX_UNDO_DEPTH = 50;

interface UseMapDrawingSessionOptions {
  sessionKey: string;
  sourceDrawing: MapDrawingV2 | null;
  mapId?: string | null;
}

export function useMapDrawingSession({
  sessionKey,
  sourceDrawing,
  mapId = null,
}: UseMapDrawingSessionOptions) {
  const [drawing, setDrawing] = useState<MapDrawingV2 | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<MapDrawingSaveStatus>("idle");
  const [currentStroke, setCurrentStroke] = useState<MapStrokeV2 | null>(null);
  const undoStack = useRef<MapDrawingUndoOp[]>([]);
  const redoStack = useRef<MapDrawingUndoOp[]>([]);
  const lastKey = useRef<string | null>(null);
  const [undoDepth, setUndoDepth] = useState(0);
  const [redoDepth, setRedoDepth] = useState(0);

  const resetFromSource = useCallback((next: MapDrawingV2 | null) => {
    setDrawing(next ? cloneDrawing(next) : null);
    setIsDirty(false);
    setSaveStatus("idle");
    setCurrentStroke(null);
    undoStack.current = [];
    redoStack.current = [];
    setUndoDepth(0);
    setRedoDepth(0);
  }, []);

  useEffect(() => {
    if (lastKey.current === sessionKey) return;
    lastKey.current = sessionKey;
    resetFromSource(sourceDrawing);
  }, [resetFromSource, sessionKey, sourceDrawing]);

  useEffect(() => {
    if (!sourceDrawing || isDirty) return;
    resetFromSource(sourceDrawing);
  }, [isDirty, resetFromSource, sourceDrawing]);

  const syncFromServer = useCallback((next: MapDrawingV2) => {
    resetFromSource(next);
  }, [resetFromSource]);

  const setPreviewStroke = useCallback((stroke: MapStrokeV2 | null) => {
    setCurrentStroke(stroke);
  }, []);

  const commitStroke = useCallback((stroke: MapStrokeV2) => {
    setDrawing((prev) => {
      if (!prev) return prev;
      const layer = resolveActiveLayer(prev);
      if (!layer) return prev;
      const next = pushStrokeToLayer(prev, layer.id, stroke);
      undoStack.current = [
        ...undoStack.current.slice(-(MAX_UNDO_DEPTH - 1)),
        { kind: "addStroke", layerId: layer.id, stroke },
      ];
      redoStack.current = [];
      setUndoDepth(undoStack.current.length);
      setRedoDepth(0);
      return next;
    });
    setCurrentStroke(null);
    setIsDirty(true);
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
  }, [mapId]);

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
      setIsDirty(true);
      setSaveStatus("idle");
      if (mapId) {
        trackAction("map", "undo", { mapId, depth: undoStack.current.length });
      }
      return true;
    }
    return false;
  }, [drawing, mapId]);

  const redo = useCallback((): boolean => {
    const op = redoStack.current.pop();
    if (!op || !drawing) return false;
    if (op.kind === "addStroke") {
      setDrawing(pushStrokeToLayer(drawing, op.layerId, op.stroke));
      undoStack.current.push(op);
      setUndoDepth(undoStack.current.length);
      setRedoDepth(redoStack.current.length);
      setIsDirty(true);
      setSaveStatus("idle");
      if (mapId) {
        trackAction("map", "redo", { mapId, depth: redoStack.current.length });
      }
      return true;
    }
    return false;
  }, [drawing, mapId]);

  const markSaved = useCallback(() => {
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
    setPreviewStroke,
    commitStroke,
    undo,
    redo,
    markSaved,
    syncFromServer,
    resetFromSource,
  };
}
