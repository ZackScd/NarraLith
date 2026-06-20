import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";

import { MAP_LAYER_THUMB_HEIGHT } from "@/lib/maps/mapLayerThumbnail";
import { cn } from "@/lib/utils";

interface MapLayerVerticalOpacityProps {
  value: number;
  disabled?: boolean;
  onChange: (opacity: number) => void;
}

export function MapLayerVerticalOpacity({
  value,
  disabled = false,
  onChange,
}: MapLayerVerticalOpacityProps) {
  const { t } = useTranslation("maps");
  const trackRef = useRef<HTMLDivElement>(null);

  const emitAtClientY = useCallback(
    (clientY: number) => {
      const track = trackRef.current;
      if (!track || disabled) return;
      const rect = track.getBoundingClientRect();
      const ratio = 1 - (clientY - rect.top) / rect.height;
      const next = Math.min(1, Math.max(0, ratio));
      onChange(next);
    },
    [disabled, onChange],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    emitAtClientY(event.clientY);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    emitAtClientY(event.clientY);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const percent = Math.round(value * 100);

  return (
    <div
      className="flex shrink-0 flex-col items-center gap-0.5 px-0.5"
      title={t("studio.layers.layerOpacityTooltip")}
    >
      <div
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={t("studio.layers.opacityLabel")}
        aria-disabled={disabled}
        className={cn(
          "relative w-3 shrink-0 cursor-ns-resize overflow-hidden rounded-sm border border-border/80 bg-muted/40 shadow-inner",
          disabled && "cursor-not-allowed opacity-50",
        )}
        style={{ height: MAP_LAYER_THUMB_HEIGHT }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "ArrowUp") {
            event.preventDefault();
            onChange(Math.min(1, value + 0.05));
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            onChange(Math.max(0, value - 0.05));
          }
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="absolute inset-x-0 bottom-0 bg-primary/75"
          style={{ height: `${percent}%` }}
        />
      </div>
      <span className="w-4 text-center text-[9px] tabular-nums leading-none text-muted-foreground">
        {percent}
      </span>
    </div>
  );
}
