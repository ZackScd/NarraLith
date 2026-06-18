import { useEffect, useRef } from "react";

import { renderAudit } from "@/lib/render-audit";
import { UI_EVENTS } from "@/lib/render-audit/events";
import { useMapStore } from "@/stores/useMapStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

/** Stub MAP-004+: viewport con mapId real; compositor sigue stub hasta canvas. */
export function useMapsRenderAuditStub(): void {
  const mainView = useWorkspaceStore((s) => s.mainView);
  const activeMapId = useMapStore((s) => s.activeMapId);
  const lastViewportMapId = useRef<string | null>(null);

  useEffect(() => {
    if (!renderAudit.isStandardEnabled()) {
      return;
    }
    if (mainView !== "map" || !activeMapId) {
      if (mainView !== "map") {
        lastViewportMapId.current = null;
      }
      return;
    }
    if (lastViewportMapId.current === activeMapId) {
      return;
    }
    lastViewportMapId.current = activeMapId;
    renderAudit.ui(UI_EVENTS.maps.viewport, {
      stub: false,
      mapId: activeMapId,
      zoom: null,
      pan: null,
    });
    renderAudit.ui(UI_EVENTS.maps.compositor, {
      stub: true,
      mapId: activeMapId,
      timeT: null,
      visibleLayers: [],
    });
  }, [activeMapId, mainView]);
}
