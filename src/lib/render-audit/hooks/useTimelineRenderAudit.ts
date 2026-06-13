import { useEffect, useRef } from "react";

import type { PlacedTimelineItem } from "@/modules/timeline/timelineModel";
import type { EventSpanLink } from "@/modules/timeline/timelineModel";
import type { WritingOrderNeighbors } from "@/modules/timeline/writingOrder";
import { renderAudit } from "@/lib/render-audit";
import { UI_EVENTS } from "@/lib/render-audit/events";

export interface TimelineRenderAuditInput {
  zoomLevel: string;
  rangeLabel: string | null;
  placed: PlacedTimelineItem[];
  eventLinks: EventSpanLink[];
  writingOrderHoverLinks: Array<{ fromItem: { id: string }; toItem: { id: string } }>;
  writingOrderNeighbors: Map<string, WritingOrderNeighbors>;
  hoveredTimelineMarkerId: string | null;
  manuscriptPathIndex: Map<string, number>;
  showEventConnectors: boolean;
  showWritingOrderHoverLink: boolean;
  filtersSnapshot: Record<string, unknown>;
}

function summarizePlaced(placed: PlacedTimelineItem[], max: number) {
  return placed.slice(0, max).map((item) => ({
    id: item.id,
    x: Math.round(item.x),
    y: Math.round(item.y),
    width: Math.round(item.width),
    lane: item.lane,
    path: item.path ?? null,
    sortKey: item.sortKey?.toString() ?? null,
  }));
}

function layoutHash(placed: PlacedTimelineItem[]): string {
  return placed
    .map((item) => `${item.id}:${Math.round(item.x)}:${Math.round(item.y)}`)
    .join("|");
}

export function useTimelineRenderAudit(input: TimelineRenderAuditInput): void {
  const prevHover = useRef<string | null>(null);
  const prevLayoutHash = useRef<string>("");
  const prevEventLinks = useRef<string>("");
  const prevWritingLinks = useRef<string>("");
  const prevFilters = useRef<string>("");

  useEffect(() => {
    if (!renderAudit.isStandardEnabled() && !renderAudit.isVerboseEnabled()) {
      return;
    }

    const hash = layoutHash(input.placed);
    if (hash === prevLayoutHash.current) {
      return;
    }
    prevLayoutHash.current = hash;

    const timer = window.setTimeout(() => {
      renderAudit.ui(
        UI_EVENTS.timeline.layout,
        {
          zoomLevel: input.zoomLevel,
          rangeLabel: input.rangeLabel,
          placedCount: input.placed.length,
          placedSummary: summarizePlaced(input.placed, 40),
        },
        { channel: "standard" },
      );

      if (renderAudit.isVerboseEnabled()) {
        renderAudit.ui(
          UI_EVENTS.timeline.layout,
          {
            zoomLevel: input.zoomLevel,
            rangeLabel: input.rangeLabel,
            placed: input.placed.map((item) => ({
              id: item.id,
              x: item.x,
              y: item.y,
              width: item.width,
              lane: item.lane,
              path: item.path ?? null,
              sortKey: item.sortKey?.toString() ?? null,
              segmentId: item.segmentId,
            })),
          },
          { channel: "verbose", level: "debug" },
        );
      }
    }, 150);

    return () => window.clearTimeout(timer);
  }, [input.placed, input.zoomLevel, input.rangeLabel]);

  useEffect(() => {
    if (!renderAudit.isStandardEnabled()) {
      return;
    }
    const key = JSON.stringify(input.eventLinks);
    if (key === prevEventLinks.current) {
      return;
    }
    prevEventLinks.current = key;
    renderAudit.ui(UI_EVENTS.timeline.linksEvent, {
      links: input.eventLinks.map((link) => ({
        fromId: link.fromId,
        toId: link.toId,
        segmentId: link.segmentId,
      })),
      showEventConnectors: input.showEventConnectors,
    });
  }, [input.eventLinks, input.showEventConnectors]);

  useEffect(() => {
    if (!renderAudit.isStandardEnabled()) {
      return;
    }
    const hovered = input.hoveredTimelineMarkerId;
    const neighbors = hovered
      ? input.writingOrderNeighbors.get(hovered)
      : undefined;
    const key = JSON.stringify({
      hovered,
      prevId: neighbors?.prevId ?? null,
      nextId: neighbors?.nextId ?? null,
      links: input.writingOrderHoverLinks.map((l) => [l.fromItem.id, l.toItem.id]),
    });
    if (key === prevWritingLinks.current) {
      return;
    }
    prevWritingLinks.current = key;

    renderAudit.ui(UI_EVENTS.timeline.linksWritingOrder, {
      hoveredId: hovered,
      prevId: neighbors?.prevId ?? null,
      nextId: neighbors?.nextId ?? null,
      linksDrawn: input.writingOrderHoverLinks.map((link) => ({
        fromId: link.fromItem.id,
        toId: link.toItem.id,
      })),
      showWritingOrderHoverLink: input.showWritingOrderHoverLink,
    });
  }, [
    input.hoveredTimelineMarkerId,
    input.writingOrderHoverLinks,
    input.writingOrderNeighbors,
    input.showWritingOrderHoverLink,
  ]);

  useEffect(() => {
    if (!renderAudit.isStandardEnabled()) {
      return;
    }
    let key = "";
    try {
      key = JSON.stringify(input.filtersSnapshot);
    } catch {
      key = String(Date.now());
    }
    if (key === prevFilters.current) {
      return;
    }
    prevFilters.current = key;
    renderAudit.ui(UI_EVENTS.timeline.filters, input.filtersSnapshot);
  }, [input.filtersSnapshot]);

  useEffect(() => {
    if (!renderAudit.isStandardEnabled()) {
      return;
    }
    const hovered = input.hoveredTimelineMarkerId;
    if (hovered === prevHover.current) {
      return;
    }
    if (prevHover.current) {
      renderAudit.ui(UI_EVENTS.timeline.hover, {
        id: prevHover.current,
        phase: "leave",
      });
    }
    if (hovered) {
      renderAudit.ui(UI_EVENTS.timeline.hover, { id: hovered, phase: "enter" });
    }
    prevHover.current = hovered;
  }, [input.hoveredTimelineMarkerId]);

  useEffect(() => {
    if (!renderAudit.isVerboseEnabled()) {
      return;
    }
    const pathIndexEntries = [...input.manuscriptPathIndex.entries()].slice(0, 120);
    renderAudit.ui(
      UI_EVENTS.timeline.writingOrderIndex,
      {
        size: input.manuscriptPathIndex.size,
        entries: pathIndexEntries.map(([path, index]) => ({ path, index })),
      },
      { channel: "verbose", level: "debug" },
    );

    const neighborEntries = [...input.writingOrderNeighbors.entries()].slice(0, 80);
    renderAudit.ui(
      UI_EVENTS.timeline.writingOrderNeighbors,
      {
        size: input.writingOrderNeighbors.size,
        entries: neighborEntries.map(([id, value]) => ({ id, ...value })),
      },
      { channel: "verbose", level: "debug" },
    );
  }, [input.manuscriptPathIndex, input.writingOrderNeighbors]);
}
