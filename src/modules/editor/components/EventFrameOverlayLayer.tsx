import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import type { EventFrameRect } from "@/lib/editor/measureEventFrames";
import { cn } from "@/lib/utils";

interface EventFrameCornersProps {
  rect: EventFrameRect;
  endDeletePending: boolean;
  onBottomCornerClick: (segmentId: string) => void;
}

function EventFrameCorners({
  rect,
  endDeletePending,
  onBottomCornerClick,
}: EventFrameCornersProps) {
  const { t } = useTranslation("editor");
  const bottomLabel = endDeletePending
    ? t("eventFrame.removeEndConfirm")
    : t("eventFrame.removeEndPending");
  const bottomCornerClass = cn(
    "narra-event-corner-glyph absolute bottom-0 select-none border-0 bg-transparent p-0 font-mono text-sm leading-none text-foreground/55",
    endDeletePending
      ? "pointer-events-auto text-destructive"
      : "pointer-events-auto hover:text-foreground",
  );

  return (
    <div
      className="narra-event-frame-corners pointer-events-none fixed z-[45] font-mono text-sm leading-none text-foreground/55"
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }}
      data-event-segment-id={rect.segmentId}
    >
      <span
        className="narra-event-corner-glyph absolute left-0 top-0 -translate-x-px -translate-y-px select-none"
        aria-hidden
      >
        ┌
      </span>
      <span
        className="narra-event-corner-glyph absolute right-0 top-0 translate-x-px -translate-y-px select-none"
        aria-hidden
      >
        ┐
      </span>
      {rect.closed ? (
        <>
          <button
            type="button"
            className={cn(bottomCornerClass, "left-0 -translate-x-px translate-y-px")}
            aria-label={bottomLabel}
            title={bottomLabel}
            data-event-pending-target="end"
            onClick={() => onBottomCornerClick(rect.segmentId)}
          >
            └
          </button>
          <button
            type="button"
            className={cn(bottomCornerClass, "right-0 translate-x-px translate-y-px")}
            aria-label={bottomLabel}
            title={bottomLabel}
            data-event-pending-target="end"
            onClick={() => onBottomCornerClick(rect.segmentId)}
          >
            ┘
          </button>
        </>
      ) : null}
    </div>
  );
}

interface EventFrameOverlayLayerProps {
  frames: EventFrameRect[];
  pendingEndDelete: string | null;
  onBottomCornerClick: (segmentId: string) => void;
}

export function EventFrameOverlayLayer({
  frames,
  pendingEndDelete,
  onBottomCornerClick,
}: EventFrameOverlayLayerProps) {
  if (frames.length === 0 || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="narra-event-frame-overlay-root" aria-hidden>
      {frames.map((frame) => (
        <EventFrameCorners
          key={frame.segmentId}
          rect={frame}
          endDeletePending={pendingEndDelete === frame.segmentId}
          onBottomCornerClick={onBottomCornerClick}
        />
      ))}
    </div>,
    document.body,
  );
}
