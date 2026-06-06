import { useCallback, useRef } from "react";

interface ResizableLeftPanelProps {
  width: number;
  onWidthChange: (width: number) => void;
  children: React.ReactNode;
}

/** Panel izquierdo con borde derecho arrastrable. */
export function ResizableLeftPanel({
  width,
  onWidthChange,
  children,
}: ResizableLeftPanelProps) {
  const dragging = useRef(false);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      const startX = e.clientX;
      const startWidth = width;

      const onMove = (ev: PointerEvent) => {
        if (!dragging.current) return;
        const delta = ev.clientX - startX;
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
      className="relative flex shrink-0 flex-col overflow-hidden border-r border-border bg-card/50 px-2 py-3"
      style={{ width }}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        className="panel-resize-handle absolute bottom-0 right-0 top-0 z-10 w-1.5 border-0 bg-transparent p-0 hover:bg-primary/20"
        onPointerDown={onPointerDown}
      />
      {children}
    </aside>
  );
}
