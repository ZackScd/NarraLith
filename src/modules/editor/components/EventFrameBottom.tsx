import { useLayoutStore } from "@/stores/useLayoutStore";

interface EventFrameBottomProps {
  segmentId: string;
}

export function EventFrameBottom({ segmentId }: EventFrameBottomProps) {
  const visible = useLayoutStore((s) => s.inlineMetadataVisible);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="narra-event-frame-bottom flex min-h-0 w-full items-center gap-0 font-mono text-xs text-muted-foreground"
      data-event-segment-id={segmentId}
      data-event-chrome="bottom"
    >
      <span className="narra-event-corner shrink-0 select-none" aria-hidden>
        └
      </span>
      <div className="min-w-0 flex-1 border-b border-border/60" aria-hidden />
      <span className="narra-event-corner shrink-0 select-none" aria-hidden>
        ┘
      </span>
    </div>
  );
}
