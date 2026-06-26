import { useCallback, useEffect, useRef, useState } from "react";

import { screenToDocument } from "@/lib/maps/mapDrawCoords";
import {
  canCloseHotspotPolygon,
  clampHotspotPoint,
  isNearHotspotPoint,
  normalizeHotspotPolygon,
} from "@/lib/maps/mapHotspotPolygon";
import type { MapViewportState } from "@/lib/maps/useMapViewport";
import type { MapHotspotPointV2 } from "@/lib/types/maps";

export type HotspotDrawPhase = "idle" | "originPlaced" | "drawing";

export interface HotspotDrawDraft {
  phase: HotspotDrawPhase;
  vertices: MapHotspotPointV2[];
  cursor: MapHotspotPointV2;
}

interface UseHotspotDrawGestureOptions {
  enabled: boolean;
  viewport: MapViewportState;
  canvasWidth: number;
  canvasHeight: number;
  onDraftChange?: (draft: HotspotDrawDraft | null) => void;
  onComplete: (points: MapHotspotPointV2[]) => void;
}

export function useHotspotDrawGesture({
  enabled,
  viewport,
  canvasWidth,
  canvasHeight,
  onDraftChange,
  onComplete,
}: UseHotspotDrawGestureOptions) {
  const pointerIdRef = useRef<number | null>(null);
  const [draft, setDraftState] = useState<HotspotDrawDraft | null>(null);

  const setDraft = useCallback(
    (next: HotspotDrawDraft | null) => {
      setDraftState(next);
      onDraftChange?.(next);
    },
    [onDraftChange],
  );

  const clearDraft = useCallback(() => {
    pointerIdRef.current = null;
    setDraft(null);
  }, [setDraft]);

  const docPoint = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const raw = screenToDocument(event.clientX, event.clientY, rect, viewport);
      return clampHotspotPoint(raw, canvasWidth, canvasHeight);
    },
    [canvasHeight, canvasWidth, viewport],
  );

  const completePolygon = useCallback(
    (vertices: MapHotspotPointV2[]) => {
      const normalized = normalizeHotspotPolygon(vertices, canvasWidth, canvasHeight);
      clearDraft();
      if (normalized) {
        onComplete(normalized);
      }
    },
    [canvasHeight, canvasWidth, clearDraft, onComplete],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): boolean => {
      if (!enabled || event.button !== 0) return false;
      const point = docPoint(event);

      if (!draft || draft.phase === "idle") {
        pointerIdRef.current = event.pointerId;
        setDraft({ phase: "originPlaced", vertices: [point], cursor: point });
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
        return true;
      }

      if (
        canCloseHotspotPolygon(draft.vertices) &&
        isNearHotspotPoint(point, draft.vertices[0]!)
      ) {
        completePolygon(draft.vertices);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        event.preventDefault();
        return true;
      }

      setDraft({
        phase: "drawing",
        vertices: [...draft.vertices, point],
        cursor: point,
      });
      event.preventDefault();
      return true;
    },
    [completePolygon, docPoint, draft, enabled, setDraft],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): boolean => {
      if (!enabled || !draft || draft.phase === "idle") return false;
      const point = docPoint(event);
      setDraft({ ...draft, cursor: point });
      event.preventDefault();
      return true;
    },
    [docPoint, draft, enabled, setDraft],
  );

  const handlePointerUp = useCallback(
    (_event: React.PointerEvent<HTMLCanvasElement>): boolean => false,
    [],
  );

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (pointerIdRef.current !== event.pointerId) return false;
      clearDraft();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      return true;
    },
    [clearDraft],
  );

  useEffect(() => {
    if (!enabled) {
      clearDraft();
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearDraft();
      }
      if (event.key === "Enter" && draft && canCloseHotspotPolygon(draft.vertices)) {
        completePolygon(draft.vertices);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clearDraft, completePolygon, draft, enabled]);

  useEffect(() => {
    if (!enabled) clearDraft();
  }, [clearDraft, enabled]);

  return {
    draft,
    clearDraft,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  };
}
