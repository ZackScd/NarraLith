import { Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { parseTimeTag } from "@/lib/calendar/dateTags";
import { toAbsoluteDay } from "@/lib/calendar/engine";
import { formatMapDesdeDisplay } from "@/lib/maps/mapDesde";
import type { MapPreviewTSource } from "@/lib/maps/mapPreviewT";
import { computeMapTimelineRange } from "@/lib/maps/mapTimelineRange";
import {
  buildMapTimelineViewScale,
  dayToRaw,
  zoomMapTimelineAtPointer,
} from "@/lib/maps/mapTimelineScale";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { MapSecondarySummaryV1 } from "@/lib/types/maps";
import { buildTimelineTicks } from "@/modules/timeline/timelineTicks";
import { cn } from "@/lib/utils";

const TRACK_HEIGHT = 40;
const THUMB_SIZE = 14;
const SCRUB_THROTTLE_MS = 50;

interface MapTimelineBarProps {
  mapId: string;
  desde: string | null;
  previewT: string | null;
  secondaries: MapSecondarySummaryV1[];
  calendar: CalendarConfig;
  interactive: boolean;
  onPreviewTChange: (raw: string, source: MapPreviewTSource) => void;
  desdeField?: React.ReactNode;
}

export function MapTimelineBar({
  mapId,
  desde,
  previewT,
  secondaries,
  calendar,
  interactive,
  onPreviewTChange,
  desdeField,
}: MapTimelineBarProps) {
  const { t } = useTranslation("maps");
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(480);
  const [zoomScale, setZoomScale] = useState(1);
  const dragRef = useRef<{ pointerId: number; lastEmit: number } | null>(null);
  const lastScrubRawRef = useRef<string | null>(null);

  useEffect(() => {
    const node = trackRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setTrackWidth(Math.max(120, Math.round(entry.contentRect.width)));
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const previewDay = useMemo(() => {
    if (!previewT) return null;
    const parts = parseTimeTag(previewT);
    if (!parts) return null;
    return Number(toAbsoluteDay(parts, calendar));
  }, [calendar, previewT]);

  const range = useMemo(
    () => computeMapTimelineRange(desde, secondaries, previewT, calendar),
    [calendar, desde, previewT, secondaries],
  );

  const fullMin = Number(range.minDay);
  const fullMax = Number(range.maxDay);
  const viewCenter = previewDay;

  const scale = useMemo(
    () =>
      buildMapTimelineViewScale({
        fullMin,
        fullMax,
        zoomScale,
        viewCenter,
        width: trackWidth,
        margin: 16,
      }),
    [fullMax, fullMin, trackWidth, viewCenter, zoomScale],
  );

  const ticks = useMemo(
    () => buildTimelineTicks(scale.viewMin, scale.viewMax, calendar, false),
    [calendar, scale.viewMax, scale.viewMin],
  );

  const thumbX =
    previewDay !== null ? scale.timeToX(previewDay) : scale.lineLeft;

  const emitScrubAtX = useCallback(
    (clientX: number, source: MapPreviewTSource) => {
      if (!interactive || !trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const day = scale.xToTime(x);
      const raw = dayToRaw(day, calendar);
      if (source === "scrubber" && raw === lastScrubRawRef.current) return;
      lastScrubRawRef.current = raw;
      onPreviewTChange(raw, source);
    },
    [calendar, interactive, onPreviewTChange, scale],
  );

  const handleTrackPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    dragRef.current = { pointerId: event.pointerId, lastEmit: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
    emitScrubAtX(event.clientX, "scrubber");
  };

  const handleTrackPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const session = dragRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    const now = Date.now();
    if (now - session.lastEmit < SCRUB_THROTTLE_MS) return;
    session.lastEmit = now;
    emitScrubAtX(event.clientX, "scrubber");
  };

  const handleTrackPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const session = dragRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleMarkerClick = (day: bigint) => {
    if (!interactive) return;
    onPreviewTChange(dayToRaw(Number(day), calendar), "markerClick");
  };

  const handleZoom = (zoomIn: boolean) => {
    const next = zoomMapTimelineAtPointer(
      fullMin,
      fullMax,
      zoomScale,
      viewCenter,
      0.5,
      zoomIn,
    );
    setZoomScale(next.zoomScale);
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!interactive) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const next = zoomMapTimelineAtPointer(
      fullMin,
      fullMax,
      zoomScale,
      viewCenter,
      ratio,
      event.deltaY < 0,
    );
    setZoomScale(next.zoomScale);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!interactive || previewDay === null) return;
    const step = Math.max(1, Math.round((scale.viewMax - scale.viewMin) / 40));
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onPreviewTChange(dayToRaw(previewDay - step, calendar), "scrubber");
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      onPreviewTChange(dayToRaw(previewDay + step, calendar), "scrubber");
    }
  };

  const previewDisplay = formatMapDesdeDisplay(previewT, calendar);

  return (
    <div
      className="flex shrink-0 flex-col gap-1 border-t border-border/60 bg-muted/20 px-3 py-2"
      aria-label={t("timeline.barAria", { mapId })}
    >
      <div className="flex min-w-0 items-center gap-2">
        {desdeField ? (
          <div className="shrink-0 border-r border-border/50 pr-3">{desdeField}</div>
        ) : null}
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={!interactive}
            title={t("timeline.zoomOut")}
            onClick={() => handleZoom(false)}
          >
            <Minus className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={!interactive}
            title={t("timeline.zoomIn")}
            onClick={() => handleZoom(true)}
          >
            <Plus className="size-3.5" />
          </Button>
        </div>

        <div
          ref={trackRef}
          className={cn(
            "relative min-w-0 flex-1 select-none rounded-md border border-border/50 bg-background",
            interactive ? "cursor-pointer" : "cursor-default opacity-90",
          )}
          style={{ height: TRACK_HEIGHT }}
          onPointerDown={handleTrackPointerDown}
          onPointerMove={handleTrackPointerMove}
          onPointerUp={handleTrackPointerUp}
          onPointerCancel={handleTrackPointerUp}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
          role="slider"
          tabIndex={interactive ? 0 : -1}
          aria-valuemin={scale.viewMin}
          aria-valuemax={scale.viewMax}
          aria-valuenow={previewDay ?? scale.viewMin}
          aria-label={t("timeline.scrubberAria")}
          aria-disabled={!interactive}
        >
          <svg
            className="pointer-events-none absolute inset-0 size-full overflow-visible"
            aria-hidden
          >
            {scale.axisSegments.map((segment, index) => (
              <line
                key={`axis-${index}`}
                x1={segment.x1}
                y1={TRACK_HEIGHT / 2}
                x2={segment.x2}
                y2={TRACK_HEIGHT / 2}
                stroke="currentColor"
                strokeOpacity={0.25}
                strokeWidth={2}
              />
            ))}
            {ticks.map((tick) => {
              const x = scale.timeToX(Number(tick.sortKey));
              return (
                <g key={tick.sortKey.toString()}>
                  <line
                    x1={x}
                    y1={TRACK_HEIGHT / 2 - 4}
                    x2={x}
                    y2={TRACK_HEIGHT / 2 + 4}
                    stroke="currentColor"
                    strokeOpacity={0.35}
                  />
                  <text
                    x={x}
                    y={TRACK_HEIGHT - 4}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[9px]"
                  >
                    {tick.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {range.desdeDay !== null ? (
            <button
              type="button"
              className={cn(
                "absolute top-1 z-10 -translate-x-1/2 rounded px-1 py-0.5 text-[9px] font-medium",
                "bg-primary/15 text-primary",
                interactive && "hover:bg-primary/25",
              )}
              style={{ left: scale.timeToX(Number(range.desdeDay)) }}
              title={t("timeline.desdeMarker", {
                date: formatMapDesdeDisplay(desde, calendar) ?? "",
              })}
              disabled={!interactive}
              onClick={(event) => {
                event.stopPropagation();
                handleMarkerClick(range.desdeDay!);
              }}
            >
              {t("timeline.desdeShort")}
            </button>
          ) : null}

          {range.secondaryAnchors.map((anchor) => {
            const x = scale.timeToX(Number(anchor.inicioDay));
            return (
              <button
                key={anchor.id}
                type="button"
                className={cn(
                  "absolute bottom-1 z-10 size-2 -translate-x-1/2 rounded-sm bg-amber-500/80",
                  interactive && "hover:bg-amber-500",
                )}
                style={{ left: x }}
                title={anchor.name}
                disabled={!interactive}
                onClick={(event) => {
                  event.stopPropagation();
                  handleMarkerClick(anchor.inicioDay);
                }}
              />
            );
          })}

          {previewDay !== null ? (
            <div
              className="pointer-events-none absolute top-1/2 z-20 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary shadow-sm"
              style={{
                left: thumbX,
                width: THUMB_SIZE,
                height: THUMB_SIZE,
              }}
            />
          ) : null}
        </div>

        <div className="flex w-36 shrink-0 flex-col items-end text-right text-xs">
          <span className="font-medium text-muted-foreground">{t("timeline.currentT")}</span>
          <span className="truncate font-medium">
            {previewDisplay ?? t("previewT.unset")}
          </span>
          {!interactive ? (
            <span className="text-[10px] text-muted-foreground">{t("timeline.readonlyHint")}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
