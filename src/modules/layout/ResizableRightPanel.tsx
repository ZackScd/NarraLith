import { useCallback, useRef } from "react";

interface ResizableRightPanelProps {
  width: number;
  onWidthChange: (width: number) => void;
  collapsed?: boolean;
  collapsedWidth?: number;
  children: React.ReactNode;
}

/** Borde izquierdo arrastrable para redimensionar el panel derecho. */
export function ResizableRightPanel({
  width,
  onWidthChange,
  collapsed = false,
  collapsedWidth = 48,
  children,
}: ResizableRightPanelProps) {
  const dragging = useRef(false);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      const startX = e.clientX;
      const startWidth = width;

      const onMove = (ev: PointerEvent) => {
        if (!dragging.current) return;
        const delta = startX - ev.clientX;
        onWidthChange(startWidth + delta);
      };

      const onUp = () => {
        dragging.current = false;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [onWidthChange, width],
  );

  return (
    <aside
      className="relative flex shrink-0 flex-col overflow-hidden"
      style={{ width: collapsed ? collapsedWidth : width }}
    >
      {!collapsed ? (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          className="panel-resize-handle absolute bottom-0 left-0 top-0 z-10 w-1 border-0 bg-transparent p-0 hover:bg-primary/30"
          onPointerDown={onPointerDown}
        />
      ) : null}
      {children}
    </aside>
  );
}
