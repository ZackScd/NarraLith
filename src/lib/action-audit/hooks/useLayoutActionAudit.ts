import { useEffect, useRef } from "react";

import { trackAction } from "@/lib/action-audit/trackAction";
import { useLayoutStore } from "@/stores/useLayoutStore";

const RESIZE_THRESHOLD_PX = 8;
const RESIZE_DEBOUNCE_MS = 300;

function useDebouncedPanelResize(
  width: number,
  action: "explorer.resize" | "panel.resize",
): void {
  const lastLogged = useRef(width);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const delta = Math.abs(width - lastLogged.current);
    if (delta <= RESIZE_THRESHOLD_PX) {
      return;
    }

    if (timer.current) {
      clearTimeout(timer.current);
    }

    const from = lastLogged.current;
    timer.current = setTimeout(() => {
      trackAction(
        "layout",
        action,
        { from, to: width, delta: Math.abs(width - from) },
        { channel: "verbose", level: "debug" },
      );
      lastLogged.current = width;
      timer.current = null;
    }, RESIZE_DEBOUNCE_MS);

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [width, action]);
}

/** Resize de paneles izquierdo/derecho (>8px, debounced) — canal verbose. */
export function useLayoutActionAudit(): void {
  const explorerWidth = useLayoutStore((s) => s.explorerWidth);
  const rightPanelWidth = useLayoutStore((s) => s.rightPanelWidth);

  useDebouncedPanelResize(explorerWidth, "explorer.resize");
  useDebouncedPanelResize(rightPanelWidth, "panel.resize");
}
