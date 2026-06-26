import { useCallback, useRef, useState } from "react";

import { documentDistance, screenToDocument } from "@/lib/maps/mapDrawCoords";
import {
  circleShapeFromDraft,
  normalizeHotspotCircle,
  type MapHotspotCircleDraft,
} from "@/lib/maps/mapHotspotCircle";
import type { MapViewportState } from "@/lib/maps/useMapViewport";

interface UseMapHotspotCircleGestureOptions {
  enabled: boolean;
  viewport: MapViewportState;
  canvasWidth: number;
  canvasHeight: number;
  onDraftChange?: (draft: MapHotspotCircleDraft | null) => void;
  onComplete: (draft: MapHotspotCircleDraft) => void;
}

export function useMapHotspotCircleGesture({
  enabled,
  viewport,
  canvasWidth,
  canvasHeight,
  onDraftChange,
  onComplete,
}: UseMapHotspotCircleGestureOptions) {
  const session = useRef<{
    pointerId: number;
    cx: number;
    cy: number;
  } | null>(null);
  const [draftCircle, setDraftCircleState] = useState<MapHotspotCircleDraft | null>(null);

  const setDraftCircle = useCallback(
    (draft: MapHotspotCircleDraft | null) => {
      setDraftCircleState(draft);
      onDraftChange?.(draft);
    },
    [onDraftChange],
  );

  const clearDraft = useCallback(() => {
    session.current = null;
    setDraftCircle(null);
  }, [setDraftCircle]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): boolean => {
      if (!enabled || event.button !== 0) return false;
      const rect = event.currentTarget.getBoundingClientRect();
      const { x, y } = screenToDocument(event.clientX, event.clientY, rect, viewport);
      session.current = { pointerId: event.pointerId, cx: x, cy: y };
      setDraftCircle({ cx: x, cy: y, radius: 0 });
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
      return true;
    },
    [enabled, setDraftCircle, viewport],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): boolean => {
      const active = session.current;
      if (!active || active.pointerId !== event.pointerId) return false;
      const rect = event.currentTarget.getBoundingClientRect();
      const { x, y } = screenToDocument(event.clientX, event.clientY, rect, viewport);
      const normalized = normalizeHotspotCircle(
        active.cx,
        active.cy,
        x,
        y,
        canvasWidth,
        canvasHeight,
      );
      setDraftCircle(
        normalized ?? {
          cx: active.cx,
          cy: active.cy,
          radius: Math.max(0, documentDistance({ x: active.cx, y: active.cy }, { x, y })),
        },
      );
      event.preventDefault();
      return true;
    },
    [canvasHeight, canvasWidth, setDraftCircle, viewport],
  );

  const finish = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const active = session.current;
      if (!active || active.pointerId !== event.pointerId) return false;
      const rect = event.currentTarget.getBoundingClientRect();
      const { x, y } = screenToDocument(event.clientX, event.clientY, rect, viewport);
      const draft = normalizeHotspotCircle(
        active.cx,
        active.cy,
        x,
        y,
        canvasWidth,
        canvasHeight,
      );
      session.current = null;
      setDraftCircle(null);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (draft) {
        onComplete(draft);
      }
      event.preventDefault();
      return true;
    },
    [canvasHeight, canvasWidth, onComplete, setDraftCircle, viewport],
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
    draftCircle,
    draftShape: draftCircle ? circleShapeFromDraft(draftCircle) : null,
    clearDraft,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  };
}
