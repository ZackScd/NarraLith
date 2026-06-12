import { createPortal } from "react-dom";

import type { EventFrameRect } from "@/lib/editor/measureEventFrames";

interface EventFrameCornersProps {
  rect: EventFrameRect;
}

function EventFrameCorners({ rect }: EventFrameCornersProps) {
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
          <span
            className="narra-event-corner-glyph absolute bottom-0 left-0 -translate-x-px translate-y-px select-none"
            aria-hidden
          >
            └
          </span>
          <span
            className="narra-event-corner-glyph absolute bottom-0 right-0 translate-x-px translate-y-px select-none"
            aria-hidden
          >
            ┘
          </span>
        </>
      ) : null}
    </div>
  );
}

interface EventFrameOverlayLayerProps {
  frames: EventFrameRect[];
}

export function EventFrameOverlayLayer({ frames }: EventFrameOverlayLayerProps) {
  if (frames.length === 0 || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="narra-event-frame-overlay-root" aria-hidden>
      {frames.map((frame) => (
        <EventFrameCorners key={frame.segmentId} rect={frame} />
      ))}
    </div>,
    document.body,
  );
}
