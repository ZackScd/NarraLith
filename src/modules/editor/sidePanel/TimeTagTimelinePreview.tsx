import { GripHorizontal, Minus, Plus, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { daysInMonth } from "@/lib/calendar/dateTags";
import { effectiveCalendarForYear } from "@/lib/calendar/effectiveCalendar";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { TimelineEvent } from "@/lib/types/timeline";
import { useTimeTagDialogStore } from "@/stores/useTimeTagDialogStore";

import {
  MINI_ZOOM_ORDER,
  miniZoomLabel,
  TimeTagMiniTimeline,
  type MiniZoomLevel,
} from "./TimeTagMiniTimeline";

const PREVIEW_WIDTH = 520;
const PREVIEW_MIN_HEIGHT = 260;
const VIEWPORT_MARGIN = 8;

function clampPosition(x: number, y: number): { x: number; y: number } {
  const w = typeof window !== "undefined" ? window.innerWidth : 1024;
  const h = typeof window !== "undefined" ? window.innerHeight : 720;
  const maxX = Math.max(VIEWPORT_MARGIN, w - PREVIEW_WIDTH - VIEWPORT_MARGIN);
  const maxY = Math.max(VIEWPORT_MARGIN, h - PREVIEW_MIN_HEIGHT - VIEWPORT_MARGIN);
  return {
    x: Math.min(Math.max(VIEWPORT_MARGIN, x), maxX),
    y: Math.min(Math.max(VIEWPORT_MARGIN, y), maxY),
  };
}

interface TimeTagTimelinePreviewProps {
  calendar: CalendarConfig;
  events: TimelineEvent[];
}

export function TimeTagTimelinePreview({
  calendar,
  events,
}: TimeTagTimelinePreviewProps) {
  const { t } = useTranslation("editor");
  const { t: tTimeline } = useTranslation("timeline");

  const isOpen = useTimeTagDialogStore((s) => s.isOpen);
  const previewOpen = useTimeTagDialogStore((s) => s.timelinePreviewOpen);
  const position = useTimeTagDialogStore((s) => s.timelinePreviewPosition);
  const draft = useTimeTagDialogStore((s) => s.draft);
  const filePath = useTimeTagDialogStore((s) => s.filePath);
  const blockIndex = useTimeTagDialogStore((s) => s.blockIndex);
  const closePreview = useTimeTagDialogStore((s) => s.closeTimelinePreview);
  const setPreviewPosition = useTimeTagDialogStore((s) => s.setTimelinePreviewPosition);

  const [zoomLevel, setZoomLevel] = useState<MiniZoomLevel>("years");

  const dragOriginRef = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );

  const yearCalendar = effectiveCalendarForYear(draft.year, calendar);
  const monthsLen = Math.max(1, yearCalendar.months.length);
  const safeMonth = Math.min(Math.max(1, draft.month), monthsLen);
  const monthLength = daysInMonth(safeMonth - 1, draft.year, calendar);
  const safeDay = Math.min(Math.max(1, draft.day), monthLength);

  const zoomIndex = MINI_ZOOM_ORDER.indexOf(zoomLevel);
  const canZoomIn = zoomIndex < MINI_ZOOM_ORDER.length - 1;
  const canZoomOut = zoomIndex > 0;

  const onPointerDownDrag = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragOriginRef.current = {
        x: e.clientX,
        y: e.clientY,
        px: position.x,
        py: position.y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [position.x, position.y],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const origin = dragOriginRef.current;
      if (!origin) return;
      setPreviewPosition(
        clampPosition(
          origin.px + (e.clientX - origin.x),
          origin.py + (e.clientY - origin.y),
        ),
      );
    },
    [setPreviewPosition],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (dragOriginRef.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      dragOriginRef.current = null;
    }
  }, []);

  if (!isOpen || !previewOpen || typeof window === "undefined") {
    return null;
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="false"
      aria-label={t("panel.timeMiniTitle")}
      className="fixed z-[60] flex w-[520px] flex-col rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl"
      style={{ left: position.x, top: position.y }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <header
        className="flex cursor-grab items-center gap-2 rounded-t-lg border-b border-border/60 bg-card/70 px-3 py-2 active:cursor-grabbing"
        onPointerDown={onPointerDownDrag}
      >
        <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-foreground">
          <GripHorizontal className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{t("panel.timeMiniTitle")}</span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-6"
            aria-label={tTimeline("controls.zoomOut")}
            title={tTimeline("controls.zoomOut")}
            disabled={!canZoomOut}
            onClick={() => setZoomLevel(MINI_ZOOM_ORDER[zoomIndex - 1]!)}
          >
            <Minus className="size-3.5" />
          </Button>
          <span
            className="min-w-[3.5rem] text-center text-[9px] text-muted-foreground"
            aria-live="polite"
          >
            {miniZoomLabel(zoomLevel, tTimeline)}
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-6"
            aria-label={tTimeline("controls.zoomIn")}
            title={tTimeline("controls.zoomIn")}
            disabled={!canZoomIn}
            onClick={() => setZoomLevel(MINI_ZOOM_ORDER[zoomIndex + 1]!)}
          >
            <Plus className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-6"
            onClick={closePreview}
            aria-label={t("panel.timeDialogClose")}
            title={t("panel.timeDialogClose")}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </header>

      <div className="px-3 py-3">
        <TimeTagMiniTimeline
          calendar={calendar}
          events={events}
          draft={draft}
          safeDay={safeDay}
          safeMonth={safeMonth}
          filePath={filePath}
          blockIndex={blockIndex}
          zoomLevel={zoomLevel}
        />
      </div>
    </div>,
    window.document.body,
  );
}
