import { useEffect, useRef } from "react";

import { renderAudit } from "@/lib/render-audit";
import { UI_EVENTS } from "@/lib/render-audit/events";
import { useMapStore } from "@/stores/useMapStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

/** Stub MAP-004+: emite eventos mientras el compositor no esté instrumentado. */
export function useMapsRenderAuditStub(): void {
  const mainView = useWorkspaceStore((s) => s.mainView);
  const activeMapId = useMapStore((s) => s.activeMapId);
  const logged = useRef(false);

  useEffect(() => {
    if (!renderAudit.isStandardEnabled()) {
      return;
    }
    if (mainView !== "map" || logged.current) {
      return;
    }
    logged.current = true;
    renderAudit.ui(UI_EVENTS.maps.viewport, {
      stub: true,
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
