import { useEffect, useRef } from "react";

import { trackAction } from "@/lib/action-audit/trackAction";
import { useLayoutStore } from "@/stores/useLayoutStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

export function useWorkspaceActionAudit(): void {
  const explorerOpen = useLayoutStore((s) => s.explorerOpen);
  const rightPanelCollapsed = useLayoutStore((s) => s.rightPanelCollapsed);
  const mainView = useWorkspaceStore((s) => s.mainView);
  const prevExplorer = useRef(explorerOpen);
  const prevCollapsed = useRef(rightPanelCollapsed);
  const mapLogged = useRef(false);

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

  useEffect(() => {
    if (mainView !== "map") {
      mapLogged.current = false;
      return;
    }
    if (mapLogged.current) {
      return;
    }
    mapLogged.current = true;
    trackAction("map", "open", { stub: true });
  }, [mainView]);
}
