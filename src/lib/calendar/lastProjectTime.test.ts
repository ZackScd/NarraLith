import { describe, expect, it } from "vitest";

import {
  findLastAddedTimeInProject,
  resolveGlobalLastAddedTime,
} from "@/lib/calendar/lastProjectTime";
import type { LastAddedTimeMarker, TimelineEvent } from "@/lib/types/timeline";

function event(
  path: string,
  blockIndex: number,
  rawTime: string,
  persistedAt = 0,
): TimelineEvent {
  return {
    path,
    blockIndex,
    rawTime,
    isParallel: false,
    characters: [],
    persistedAt,
  };
}

describe("findLastAddedTimeInProject", () => {
  it("prefiere persistedAt mayor aunque la ruta sea lexicográficamente menor", () => {
    const events = [
      event("Manuscrito/carpeta/escena 1.md", 0, "9.3.2050", 100),
      event("Manuscrito/carpeta/a.md", 0, "10.3.2056", 200),
    ];

    expect(findLastAddedTimeInProject(events)).toEqual({
      day: 10,
      month: 3,
      year: 2056,
    });
  });

  it("desempata por blockIndex y path cuando persistedAt coincide", () => {
    const events = [
      event("Manuscrito/scene.md", 0, "1.1.2000", 500),
      event("Manuscrito/scene.md", 2, "5.5.2000", 500),
      event("Manuscrito/scene.md", 1, "3.3.2000", 500),
    ];

    expect(findLastAddedTimeInProject(events)).toEqual({
      day: 5,
      month: 5,
      year: 2000,
    });
  });

  it("usa fallback lexicográfico legacy si no hay persistedAt", () => {
    const events = [
      event("Manuscrito/a.md", 0, "1.1.1999", 0),
      event("Manuscrito/z.md", 1, "2.2.2000", 0),
    ];

    expect(findLastAddedTimeInProject(events)).toEqual({
      day: 2,
      month: 2,
      year: 2000,
    });
  });
});

describe("resolveGlobalLastAddedTime", () => {
  it("prioriza lastAdded del IPC sobre la lista de eventos", () => {
    const lastAdded: LastAddedTimeMarker = {
      path: "Manuscrito/b.md",
      blockIndex: 0,
      rawTime: "12.3.1999",
      persistedAt: 999,
    };
    const events = [event("Manuscrito/escena 1.md", 0, "9.3.2050", 100)];

    expect(resolveGlobalLastAddedTime(lastAdded, events)).toEqual({
      day: 12,
      month: 3,
      year: 1999,
    });
  });
});
