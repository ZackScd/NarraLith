import { useEffect, useRef } from "react";

import { trackAction } from "@/lib/action-audit/trackAction";
import { useLayoutStore } from "@/stores/useLayoutStore";

export function useWorkspaceActionAudit(): void {
  const explorerOpen = useLayoutStore((s) => s.explorerOpen);
  const rightPanelCollapsed = useLayoutStore((s) => s.rightPanelCollapsed);
  const prevExplorer = useRef(explorerOpen);
  const prevCollapsed = useRef(rightPanelCollapsed);

  useEffect(() => {
    if (prevExplorer.current === explorerOpen) {
      return;
    }
    trackAction("workspace", "explorerToggle", {
      open: explorerOpen,
      from: prevExplorer.current,
    });
    prevExplorer.current = explorerOpen;
  }, [explorerOpen]);

  useEffect(() => {
    if (prevCollapsed.current === rightPanelCollapsed) {
      return;
    }
    trackAction("workspace", "rightPanelToggle", {
      collapsed: rightPanelCollapsed,
      from: prevCollapsed.current,
    });
    prevCollapsed.current = rightPanelCollapsed;
  }, [rightPanelCollapsed]);
}
