import { useEffect, useRef } from "react";

import { renderAudit } from "@/lib/render-audit";
import { UI_EVENTS } from "@/lib/render-audit/events";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

/** Stub MAP-004+: emite no-op documentado mientras mapas no estén instrumentados. */
export function useMapsRenderAuditStub(): void {
  const mainView = useWorkspaceStore((s) => s.mainView);
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
      mapId: null,
      zoom: null,
      pan: null,
    });
    renderAudit.ui(UI_EVENTS.maps.compositor, {
      stub: true,
      timeT: null,
      visibleLayers: [],
    });
  }, [mainView]);
}
