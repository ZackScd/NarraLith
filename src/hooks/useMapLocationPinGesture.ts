import { useCallback, useRef, useState } from "react";

import { documentDistance, screenToDocument } from "@/lib/maps/mapDrawCoords";
import type { MapViewportState } from "@/lib/maps/useMapViewport";

const CLICK_MOVE_THRESHOLD = 5;

function clampToCanvas(x: number, y: number, width: number, height: number) {
  return {
    x: Math.min(Math.max(0, x), width),
    y: Math.min(Math.max(0, y), height),
  };
}

interface UseMapLocationPinGestureOptions {
  placementMode: boolean;
  moveMode: boolean;
  viewport: MapViewportState;
  canvasWidth: number;
  canvasHeight: number;
  onDraftChange?: (point: { x: number; y: number } | null) => void;
  onPlace: (x: number, y: number) => void;
  onMove: (x: number, y: number) => void;
}

export function useMapLocationPinGesture({
  placementMode,
  moveMode,
  viewport,
  canvasWidth,
  canvasHeight,
  onDraftChange,
  onPlace,
  onMove,
}: UseMapLocationPinGestureOptions) {
  const enabled = placementMode || moveMode;
  const session = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    mode: "place" | "move";
  } | null>(null);
  const [draftPoint, setDraftPointState] = useState<{ x: number; y: number } | null>(null);

  const setDraftPoint = useCallback(
    (point: { x: number; y: number } | null) => {
      setDraftPointState(point);
      onDraftChange?.(point);
    },
    [onDraftChange],
  );

  const clearDraft = useCallback(() => {
    session.current = null;
    setDraftPoint(null);
  }, [setDraftPoint]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): boolean => {
      if (!enabled || event.button !== 0) return false;
      const rect = event.currentTarget.getBoundingClientRect();
      const { x, y } = screenToDocument(event.clientX, event.clientY, rect, viewport);
      const clamped = clampToCanvas(x, y, canvasWidth, canvasHeight);
      session.current = {
        pointerId: event.pointerId,
        startX: clamped.x,
        startY: clamped.y,
        mode: moveMode ? "move" : "place",
      };
      setDraftPoint(clamped);
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
      return true;
    },
    [canvasHeight, canvasWidth, enabled, moveMode, viewport],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): boolean => {
      const active = session.current;
      if (!active || active.pointerId !== event.pointerId) return false;
      const rect = event.currentTarget.getBoundingClientRect();
      const { x, y } = screenToDocument(event.clientX, event.clientY, rect, viewport);
      setDraftPoint(clampToCanvas(x, y, canvasWidth, canvasHeight));
      event.preventDefault();
      return true;
    },
    [canvasHeight, canvasWidth, viewport],
  );

  const finish = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const active = session.current;
      if (!active || active.pointerId !== event.pointerId) return false;
      const rect = event.currentTarget.getBoundingClientRect();
      const { x, y } = screenToDocument(event.clientX, event.clientY, rect, viewport);
      const clamped = clampToCanvas(x, y, canvasWidth, canvasHeight);
      const moved = documentDistance(
        { x: active.startX, y: active.startY },
        clamped,
      ) > CLICK_MOVE_THRESHOLD;
      session.current = null;
      setDraftPoint(null);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (active.mode === "place" && !moved) {
        onPlace(clamped.x, clamped.y);
      } else if (active.mode === "move") {
        onMove(clamped.x, clamped.y);
      }
      event.preventDefault();
      return true;
    },
    [canvasHeight, canvasWidth, onMove, onPlace, viewport],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => finish(event),
    [finish],
  );

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const active = session.current;
      if (!active || active.pointerId !== event.pointerId) return false;
      clearDraft();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      return true;
    },
    [clearDraft],
  );

  return {
    draftPoint,
    clearDraft,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  };
}
