import { describe, expect, it } from "vitest";

import { chipHeight, linkEdgeAnchors } from "@/modules/timeline/timelineGraphics";
import type { PositionedItem } from "@/modules/timeline/timelineLayoutHelpers";

function chip(
  overrides: Partial<PositionedItem> & Pick<PositionedItem, "x" | "lane">,
): PositionedItem {
  return {
    id: "id",
    kind: "file",
    label: "label",
    fileLabel: "label",
    eventLabel: null,
    segmentId: null,
    sortKey: 0n,
    timeStatus: "valid",
    rawTime: "",
    y: 10,
    width: 80,
    day: 1,
    month: 1,
    year: 100,
    ...overrides,
  };
}

describe("linkEdgeAnchors", () => {
  it("conecta borde derecho → izquierdo cuando destino está a la derecha", () => {
    const from = chip({ x: 100, lane: "manuscript", y: 20, width: 60 });
    const to = chip({ x: 200, lane: "manuscript", y: 20, width: 60 });
    const h = chipHeight(from);

    expect(linkEdgeAnchors(from, to)).toEqual({
      from: { x: 130, y: 20 + h / 2 },
      to: { x: 170, y: 20 + h / 2 },
    });
  });

  it("conecta borde izquierdo → derecho en flashback", () => {
    const from = chip({ x: 200, lane: "manuscript", y: 20, width: 60 });
    const to = chip({ x: 100, lane: "manuscript", y: 20, width: 60 });
    const h = chipHeight(from);

    expect(linkEdgeAnchors(from, to)).toEqual({
      from: { x: 170, y: 20 + h / 2 },
      to: { x: 130, y: 20 + h / 2 },
    });
  });

  it("usa fallback vertical en manuscrito cuando comparten X", () => {
    const from = chip({ x: 150, lane: "manuscript", y: 30, width: 60 });
    const to = chip({ x: 152, lane: "manuscript", y: 10, width: 60 });
    const fromH = chipHeight(from);

    expect(linkEdgeAnchors(from, to)).toEqual({
      from: { x: 150, y: 30 + fromH },
      to: { x: 152, y: 10 },
    });
  });

  it("usa fallback vertical invertido en below lane", () => {
    const from = chip({ x: 150, lane: "below", y: 120, width: 60 });
    const to = chip({ x: 151, lane: "below", y: 180, width: 60 });
    const toH = chipHeight(to);

    expect(linkEdgeAnchors(from, to)).toEqual({
      from: { x: 150, y: 120 },
      to: { x: 151, y: 180 + toH },
    });
  });
});
