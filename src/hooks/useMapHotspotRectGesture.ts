import { useCallback, useRef, useState } from "react";

import { normalizeHotspotBounds } from "@/lib/maps/mapHotspotBounds";
import { screenToDocument } from "@/lib/maps/mapDrawCoords";
import type { MapViewportState } from "@/lib/maps/useMapViewport";
import type { MapHotspotBoundsV1 } from "@/lib/types/maps";

interface UseMapHotspotRectGestureOptions {
  enabled: boolean;
  viewport: MapViewportState;
  canvasWidth: number;
  canvasHeight: number;
  onDraftChange?: (bounds: MapHotspotBoundsV1 | null) => void;
  onComplete: (bounds: MapHotspotBoundsV1) => void;
}

export function useMapHotspotRectGesture({
  enabled,
  viewport,
  canvasWidth,
  canvasHeight,
  onDraftChange,
  onComplete,
}: UseMapHotspotRectGestureOptions) {
  const session = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [draftBounds, setDraftBoundsState] = useState<MapHotspotBoundsV1 | null>(null);

  const setDraftBounds = useCallback(
    (bounds: MapHotspotBoundsV1 | null) => {
      setDraftBoundsState(bounds);
      onDraftChange?.(bounds);
    },
    [onDraftChange],
  );

  const clearDraft = useCallback(() => {
    session.current = null;
    setDraftBounds(null);
  }, [setDraftBounds]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): boolean => {
      if (!enabled || event.button !== 0) return false;
      const rect = event.currentTarget.getBoundingClientRect();
      const { x, y } = screenToDocument(event.clientX, event.clientY, rect, viewport);
      session.current = { pointerId: event.pointerId, startX: x, startY: y };
      setDraftBounds({ x, y, width: 0, height: 0 });
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
      return true;
    },
    [enabled, viewport],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): boolean => {
      const active = session.current;
      if (!active || active.pointerId !== event.pointerId) return false;
      const rect = event.currentTarget.getBoundingClientRect();
      const { x, y } = screenToDocument(event.clientX, event.clientY, rect, viewport);
      const normalized = normalizeHotspotBounds(
        active.startX,
        active.startY,
        x,
        y,
        canvasWidth,
        canvasHeight,
      );
      setDraftBounds(
        normalized ?? {
          x: Math.min(active.startX, x),
          y: Math.min(active.startY, y),
          width: Math.abs(x - active.startX),
          height: Math.abs(y - active.startY),
        },
      );
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
      const bounds = normalizeHotspotBounds(
        active.startX,
        active.startY,
        x,
        y,
        canvasWidth,
        canvasHeight,
      );
      session.current = null;
      setDraftBounds(null);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (bounds) {
        onComplete(bounds);
      }
      event.preventDefault();
      return true;
    },
    [canvasHeight, canvasWidth, onComplete, viewport],
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
    draftBounds,
    clearDraft,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  };
}
