import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { useMapDrawGesture } from "@/hooks/useMapDrawGesture";
import { resolveActiveLayer } from "@/lib/maps/mapDrawingSession";
import type { MapDocumentV1, MapDrawingV2, MapStrokeV2 } from "@/lib/types/maps";
import { useMapViewport } from "@/lib/maps/useMapViewport";
import type { MapViewMode } from "@/stores/useMapStore";
import {
  useMapStudioStore,
  type MapStudioTool,
} from "@/stores/useMapStudioStore";
import { cn } from "@/lib/utils";

interface MapViewportProps {
  mapId: string;
  document: MapDocumentV1;
  drawing: MapDrawingV2;
  viewMode: MapViewMode;
  previewStroke?: MapStrokeV2 | null;
  onPreviewStroke: (stroke: MapStrokeV2 | null) => void;
  onCommitStroke: (stroke: MapStrokeV2) => void;
}

function viewportCursor(viewMode: MapViewMode, tool: MapStudioTool): string {
  if (viewMode !== "edit") {
    return "cursor-grab active:cursor-grabbing";
  }
  if (tool === "pan") {
    return "cursor-grab active:cursor-grabbing";
  }
  return "cursor-crosshair";
}

export function MapViewport({
  mapId,
  document,
  drawing,
  viewMode,
  previewStroke = null,
  onPreviewStroke,
  onCommitStroke,
}: MapViewportProps) {
  const { t } = useTranslation("maps");
  const tool = useMapStudioStore((s) => s.tool);
  const brushId = useMapStudioStore((s) => s.brushId);
  const color = useMapStudioStore((s) => s.color);
  const baseSize = useMapStudioStore((s) => s.baseSize);
  const baseOpacity = useMapStudioStore((s) => s.baseOpacity);

  const canDraw = Boolean(resolveActiveLayer(drawing));

  const {
    containerRef,
    canvasRef,
    viewport,
    handleWheel,
    handlePointerDown: handlePanDown,
    handlePointerMove: handlePanMove,
    handlePointerUp: handlePanUp,
    isSpacePressed,
  } = useMapViewport({
    mapId,
    document,
    drawing,
    viewMode,
    previewStroke,
    studioTool: tool,
  });

  const {
    handlePointerDown: handleDrawDown,
    handlePointerMove: handleDrawMove,
    handlePointerUp: handleDrawUp,
    handlePointerCancel: handleDrawCancel,
  } = useMapDrawGesture({
    enabled: viewMode === "edit",
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
  });

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (handleDrawDown(event)) return;
      handlePanDown(event);
    },
    [handleDrawDown, handlePanDown],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (handleDrawMove(event)) return;
      handlePanMove(event);
    },
    [handleDrawMove, handlePanMove],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (handleDrawUp(event)) return;
      handlePanUp(event);
    },
    [handleDrawUp, handlePanUp],
  );

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (handleDrawCancel(event)) return;
      handlePanUp(event);
    },
    [handleDrawCancel, handlePanUp],
  );

  return (
    <div
      ref={containerRef}
      className="relative min-h-0 flex-1 overflow-hidden bg-muted/20"
      aria-label={t("viewport.ariaLabel", { name: document.name })}
    >
      <canvas
        ref={canvasRef}
        className={cn("block h-full w-full touch-none", viewportCursor(viewMode, tool))}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      />
    </div>
  );
}
