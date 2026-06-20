import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import {
  MAP_LAYER_THUMB_HEIGHT,
  MAP_LAYER_THUMB_WIDTH,
  renderLayerThumbnail,
} from "@/lib/maps/mapLayerThumbnail";
import { computeLayerContentBBox } from "@/lib/maps/mapLayerBBox";
import type { MapDrawingLayerV2 } from "@/lib/types/maps";
import { cn } from "@/lib/utils";

interface MapLayerThumbnailProps {
  layer: MapDrawingLayerV2;
  className?: string;
}

export function MapLayerThumbnail({ layer, className }: MapLayerThumbnailProps) {
  const { t } = useTranslation("maps");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasContent = computeLayerContentBBox(layer) !== null;
  const strokeSignature = layer.strokes.map((stroke) => stroke.points.length).join(",");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderLayerThumbnail(ctx, layer);
  }, [layer, strokeSignature]);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded border border-border/50 bg-muted/30",
        className,
      )}
      style={{ width: MAP_LAYER_THUMB_WIDTH, height: MAP_LAYER_THUMB_HEIGHT }}
    >
      <canvas
        ref={canvasRef}
        width={MAP_LAYER_THUMB_WIDTH}
        height={MAP_LAYER_THUMB_HEIGHT}
        className="block size-full"
        aria-hidden
      />
      {!hasContent ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground/70">
          {t("studio.layers.emptyThumbnail")}
        </span>
      ) : null}
    </div>
  );
}
