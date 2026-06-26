import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";

import {
  clampFloatingPosition,
  type FloatingPanelSize,
  type FloatingPosition,
} from "@/lib/ui/clampFloatingPosition";

interface UseFloatingPanelDragOptions {
  position: FloatingPosition;
  onPositionChange: (position: FloatingPosition) => void;
  getPanelSize: () => FloatingPanelSize;
  clampOptions?: {
    viewportMargin?: number;
    minWidth?: number;
    minHeight?: number;
  };
}

interface DragOrigin {
  pointerX: number;
  pointerY: number;
  positionX: number;
  positionY: number;
}

export function useFloatingPanelDrag({
  position,
  onPositionChange,
  getPanelSize,
  clampOptions,
}: UseFloatingPanelDragOptions) {
  const dragOriginRef = useRef<DragOrigin | null>(null);

  const reclampPosition = useCallback(() => {
    onPositionChange(
      clampFloatingPosition(position.x, position.y, getPanelSize(), clampOptions),
    );
  }, [clampOptions, getPanelSize, onPositionChange, position.x, position.y]);

  const onPointerDownDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      event.preventDefault();
      dragOriginRef.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        positionX: position.x,
        positionY: position.y,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [position.x, position.y],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const origin = dragOriginRef.current;
      if (!origin) return;
      onPositionChange(
        clampFloatingPosition(
          origin.positionX + (event.clientX - origin.pointerX),
          origin.positionY + (event.clientY - origin.pointerY),
          getPanelSize(),
          clampOptions,
        ),
      );
    },
    [clampOptions, getPanelSize, onPositionChange],
  );

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!dragOriginRef.current) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
    dragOriginRef.current = null;
  }, []);

  return {
    onPointerDownDrag,
    onPointerMove,
    onPointerUp,
    reclampPosition,
  };
}
