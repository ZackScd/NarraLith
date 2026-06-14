import { useEffect, useRef } from "react";

import { trackAction } from "@/lib/action-audit/trackAction";
import { useTimelineStore } from "@/stores/useTimelineStore";

export function useTimelineActionAudit(): void {
  const filters = useTimelineStore((s) => s.filters);
  const showEventConnectors = useTimelineStore((s) => s.showEventConnectors);
  const showWritingOrderHoverLink = useTimelineStore((s) => s.showWritingOrderHoverLink);
  const hoveredTimelineMarkerId = useTimelineStore((s) => s.hoveredTimelineMarkerId);
  const prevFilters = useRef(filters);
  const prevConnectors = useRef(showEventConnectors);
  const prevWritingOrder = useRef(showWritingOrderHoverLink);
  const prevHoverId = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevFilters.current;
    for (const key of Object.keys(filters) as (keyof typeof filters)[]) {
      if (filters[key] !== prev[key]) {
        trackAction("timeline", "filterToggle", { filter: key, enabled: filters[key] });
      }
    }
    prevFilters.current = filters;
  }, [filters]);

  useEffect(() => {
    if (prevConnectors.current === showEventConnectors) {
      return;
    }
    trackAction("timeline", "connectorToggle", {
      kind: "eventConnectors",
      enabled: showEventConnectors,
    });
    prevConnectors.current = showEventConnectors;
  }, [showEventConnectors]);

  useEffect(() => {
    if (prevWritingOrder.current === showWritingOrderHoverLink) {
      return;
    }
    trackAction("timeline", "connectorToggle", {
      kind: "writingOrderHover",
      enabled: showWritingOrderHoverLink,
    });
    prevWritingOrder.current = showWritingOrderHoverLink;
  }, [showWritingOrderHoverLink]);

  useEffect(() => {
    if (hoveredTimelineMarkerId === prevHoverId.current) {
      return;
    }
    trackAction(
      "timeline",
      "chipHover",
      {
        markerId: hoveredTimelineMarkerId,
        phase: hoveredTimelineMarkerId ? "enter" : "leave",
        previousId: prevHoverId.current,
      },
      { channel: "verbose", level: "debug" },
    );
    prevHoverId.current = hoveredTimelineMarkerId;
  }, [hoveredTimelineMarkerId]);
}
