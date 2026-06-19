import { useTranslation } from "react-i18next";

import type { MapDocumentV1, MapDrawingV2 } from "@/lib/types/maps";
import { useMapViewport } from "@/lib/maps/useMapViewport";
import type { MapViewMode } from "@/stores/useMapStore";
import { cn } from "@/lib/utils";

interface MapViewportProps {
  mapId: string;
  document: MapDocumentV1;
  drawing: MapDrawingV2;
  viewMode: MapViewMode;
}

export function MapViewport({ mapId, document, drawing, viewMode }: MapViewportProps) {
  const { t } = useTranslation("maps");
  const {
    containerRef,
    canvasRef,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useMapViewport({ mapId, document, drawing, viewMode });

  return (
    <div
      ref={containerRef}
      className="relative min-h-0 flex-1 overflow-hidden bg-muted/20"
      aria-label={t("viewport.ariaLabel", { name: document.name })}
    >
      <canvas
        ref={canvasRef}
        className={cn(
          "block h-full w-full touch-none",
          viewMode === "edit" ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing",
        )}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
}
