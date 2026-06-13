import { useEffect, useRef } from "react";

import { renderAudit } from "@/lib/render-audit";
import { UI_EVENTS } from "@/lib/render-audit/events";
import { useLayoutStore } from "@/stores/useLayoutStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

function panelForMainView(mainView: string): string {
  if (mainView === "timeline") {
    return "timeline";
  }
  if (mainView === "calendar") {
    return "calendar";
  }
  if (mainView === "map") {
    return "map";
  }
  return "editor";
}

export function useSidePanelRenderAudit(): void {
  const mainView = useWorkspaceStore((s) => s.mainView);
  const rightPanelWidth = useLayoutStore((s) => s.rightPanelWidth);
  const rightPanelCollapsed = useLayoutStore((s) => s.rightPanelCollapsed);
  const inlineMetadataVisible = useLayoutStore((s) => s.inlineMetadataVisible);
  const prevPanel = useRef(panelForMainView(mainView));
  const prevInline = useRef(inlineMetadataVisible);

  useEffect(() => {
    if (!renderAudit.isStandardEnabled()) {
      return;
    }
    const panel = panelForMainView(mainView);
    if (panel !== prevPanel.current) {
      renderAudit.ui(UI_EVENTS.sidePanel.tab, {
        panel,
        tab: panel === "editor" ? "time" : "filters",
        from: prevPanel.current,
      });
      prevPanel.current = panel;
    }
  }, [mainView]);

  useEffect(() => {
    if (!renderAudit.isStandardEnabled() || mainView !== "editor") {
      return;
    }
    if (inlineMetadataVisible === prevInline.current) {
      return;
    }
    renderAudit.ui(UI_EVENTS.sidePanel.tab, {
      panel: "editor",
      tab: inlineMetadataVisible ? "inlineTagsOn" : "inlineTagsOff",
      from: prevInline.current ? "inlineTagsOn" : "inlineTagsOff",
    });
    prevInline.current = inlineMetadataVisible;
  }, [inlineMetadataVisible, mainView]);

  useEffect(() => {
    if (!renderAudit.isStandardEnabled()) {
      return;
    }
    const timer = window.setTimeout(() => {
      renderAudit.ui(UI_EVENTS.sidePanel.dimensions, {
        panel: panelForMainView(mainView),
        width: rightPanelWidth,
        collapsed: rightPanelCollapsed,
        viewportHeight: window.innerHeight,
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [mainView, rightPanelWidth, rightPanelCollapsed]);
}
