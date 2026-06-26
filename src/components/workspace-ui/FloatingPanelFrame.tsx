import { GripHorizontal, X } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { useFloatingPanelDrag } from "@/hooks/useFloatingPanelDrag";
import type { FloatingPosition } from "@/lib/ui/clampFloatingPosition";
import { cn } from "@/lib/utils";

export interface FloatingPanelFrameHandle {
  reclampPosition: () => void;
}

export interface FloatingPanelFrameProps {
  position: FloatingPosition;
  onPositionChange: (position: FloatingPosition) => void;
  title?: ReactNode;
  /** Sustituye el título simple; el arrastre sigue en la zona del grip + este contenido. */
  headerContent?: ReactNode;
  ariaLabel: string;
  onClose?: () => void;
  closeAriaLabel?: string;
  minWidth?: number;
  minHeight?: number;
  width?: number;
  className?: string;
  bodyClassName?: string;
  panelRef?: React.Ref<HTMLDivElement>;
  children: ReactNode;
  footer?: ReactNode;
}

export const FloatingPanelFrame = forwardRef<
  FloatingPanelFrameHandle,
  FloatingPanelFrameProps
>(function FloatingPanelFrame(
  {
    position,
    onPositionChange,
    title,
    headerContent,
    ariaLabel,
    onClose,
    closeAriaLabel,
    minWidth = 240,
    minHeight = 360,
    width,
    className,
    bodyClassName,
    panelRef,
    children,
    footer,
  },
  ref,
) {
  const internalRef = useRef<HTMLDivElement>(null);

  const setPanelRef = useCallback(
    (node: HTMLDivElement | null) => {
      internalRef.current = node;
      if (typeof panelRef === "function") {
        panelRef(node);
      } else if (panelRef && "current" in panelRef) {
        (panelRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    },
    [panelRef],
  );

  const getPanelSize = useCallback(
    () => ({
      width: internalRef.current?.offsetWidth ?? width ?? minWidth,
      height: internalRef.current?.offsetHeight ?? minHeight,
    }),
    [minHeight, minWidth, width],
  );

  const { onPointerDownDrag, onPointerMove, onPointerUp, reclampPosition } =
    useFloatingPanelDrag({
      position,
      onPositionChange,
      getPanelSize,
      clampOptions: { minWidth, minHeight },
    });

  useImperativeHandle(ref, () => ({ reclampPosition }), [reclampPosition]);

  const style: CSSProperties = {
    left: position.x,
    top: position.y,
    ...(width !== undefined ? { width } : { minWidth }),
  };

  return (
    <div
      ref={setPanelRef}
      role="dialog"
      aria-modal="false"
      aria-label={ariaLabel}
      className={cn(
        "fixed z-50 flex w-fit flex-col rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl",
        className,
      )}
      style={style}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <header className="flex items-center justify-between gap-2 rounded-t-lg border-b border-border/60 bg-card/70 px-3 py-2">
        {headerContent ? (
          <>
            <div
              className="flex shrink-0 cursor-grab items-center active:cursor-grabbing"
              onPointerDown={onPointerDownDrag}
            >
              <GripHorizontal className="size-3.5 text-muted-foreground" />
            </div>
            <div className="flex min-w-0 flex-1 items-center text-xs font-medium text-foreground">
              {headerContent}
            </div>
          </>
        ) : (
          <div
            className="flex min-w-0 flex-1 cursor-grab items-center gap-2 text-xs font-medium text-foreground active:cursor-grabbing"
            onPointerDown={onPointerDownDrag}
          >
            <GripHorizontal className="size-3.5 shrink-0 text-muted-foreground" />
            {title ? <span className="truncate">{title}</span> : null}
          </div>
        )}
        {onClose ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-6 shrink-0"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            aria-label={closeAriaLabel}
            title={closeAriaLabel}
          >
            <X className="size-3.5" />
          </Button>
        ) : null}
      </header>

      <div className={cn("relative flex flex-col", bodyClassName)}>{children}</div>

      {footer}
    </div>
  );
});
