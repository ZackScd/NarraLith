import { useCallback, useRef } from "react";

import { appendPointToStroke } from "@/lib/maps/mapDrawingSession";
import {
  createStudioStroke,
  shouldDrawPointer,
} from "@/lib/maps/mapDrawGesture";
import { samplePointerPoint } from "@/lib/maps/mapDrawCoords";
import type { MapViewportState } from "@/lib/maps/useMapViewport";
import type { MapStrokeV2 } from "@/lib/types/maps";
import type { MapBrushId } from "@/lib/maps/mapBrushes";
import type { MapStudioTool } from "@/stores/useMapStudioStore";
import type { MapViewMode } from "@/stores/useMapStore";

interface UseMapDrawGestureOptions {
  enabled: boolean;
  viewMode: MapViewMode;
  tool: MapStudioTool;
  brushId: MapBrushId;
  color: string;
  baseSize: number;
  baseOpacity: number;
  viewport: MapViewportState;
  canDraw: boolean;
  isSpacePressed: () => boolean;
  onPreviewStroke: (stroke: MapStrokeV2 | null) => void;
  onCommitStroke: (stroke: MapStrokeV2) => void;
}

export function useMapDrawGesture({
  enabled,
  viewMode,
  tool,
  brushId,
  color,
  baseSize,
  baseOpacity,
  viewport,
  canDraw,
  isSpacePressed,
  onPreviewStroke,
  onCommitStroke,
}: UseMapDrawGestureOptions) {
  const drawSession = useRef<{
    pointerId: number;
    stroke: MapStrokeV2;
  } | null>(null);

  const clearDrawSession = useCallback(() => {
    drawSession.current = null;
    onPreviewStroke(null);
  }, [onPreviewStroke]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): boolean => {
      if (!enabled) return false;
      if (
        !shouldDrawPointer(viewMode, tool, event.button, isSpacePressed(), canDraw)
      ) {
        return false;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const firstPoint = samplePointerPoint(event.nativeEvent, rect, viewport);
      const stroke = createStudioStroke({
        tool,
        brushId,
        color,
        baseSize,
        baseOpacity,
        firstPoint,
      });

      drawSession.current = { pointerId: event.pointerId, stroke };
      onPreviewStroke(stroke);
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
      return true;
    },
    [
      baseOpacity,
      baseSize,
      brushId,
      canDraw,
      color,
      enabled,
      isSpacePressed,
      onPreviewStroke,
      tool,
      viewMode,
      viewport,
    ],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): boolean => {
      const session = drawSession.current;
      if (!session || session.pointerId !== event.pointerId) return false;

      const rect = event.currentTarget.getBoundingClientRect();
      const point = samplePointerPoint(event.nativeEvent, rect, viewport);
      const nextStroke = appendPointToStroke(session.stroke, point);
      if (nextStroke === session.stroke) return true;

      session.stroke = nextStroke;
      onPreviewStroke(nextStroke);
      event.preventDefault();
      return true;
    },
    [onPreviewStroke, viewport],
  );

  const finishDraw = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const session = drawSession.current;
      if (!session || session.pointerId !== event.pointerId) return false;

      if (session.stroke.points.length > 0) {
        onCommitStroke(session.stroke);
      } else {
        onPreviewStroke(null);
      }

      drawSession.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      return true;
    },
    [onCommitStroke, onPreviewStroke],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): boolean => finishDraw(event),
    [finishDraw],
  );

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): boolean => {
      const session = drawSession.current;
      if (!session || session.pointerId !== event.pointerId) return false;
      clearDrawSession();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      return true;
    },
    [clearDrawSession],
  );

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    isDrawing: () => drawSession.current !== null,
  };
}
