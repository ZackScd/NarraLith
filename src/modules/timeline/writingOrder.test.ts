import { describe, expect, it } from "vitest";

import type { FileTreeNode } from "@/lib/types/fs";
import type { PlacedTimelineItem } from "@/modules/timeline/timelineModel";

import {
  buildManuscriptPathWritingIndex,
  buildManuscriptPathWritingIndexFromTreeOnly,
  buildWritingOrderNeighbors,
  compareWritingOrder,
  compareWritingOrderWithinFile,
  parseSegmentIndex,
  writingOrderKeyForItem,
} from "./writingOrder";

function dir(path: string, name: string, children: FileTreeNode[] = []): FileTreeNode {
  return { name, path, isDir: true, children };
}

function file(path: string, name: string): FileTreeNode {
  return { name, path, isDir: false };
}

function placed(
  item: Omit<PlacedTimelineItem, "x" | "y" | "width"> & Partial<Pick<PlacedTimelineItem, "x" | "y" | "width">>,
): PlacedTimelineItem {
  return {
    x: 0,
    y: 0,
    width: 80,
    blockIndex: 0,
    ...item,
  };
}

describe("parseSegmentIndex", () => {
  it("extrae el índice del segmentId", () => {
    expect(parseSegmentIndex("Manuscrito/a.md::seg::2")).toBe(2);
    expect(parseSegmentIndex(null)).toBe(-1);
  });
});

describe("buildManuscriptPathWritingIndex", () => {
  const tree: FileTreeNode[] = [
    dir("Manuscrito", "Manuscrito", [
      file("Manuscrito/a.md", "a.md"),
      file("Manuscrito/b.md", "b.md"),
    ]),
  ];

  it("recorre subcarpetas en pre-order", () => {
    const nestedTree: FileTreeNode[] = [
      dir("Manuscrito", "Manuscrito", [
        dir("Manuscrito/Cap1", "Cap1", [
          file("Manuscrito/Cap1/scene.md", "scene.md"),
        ]),
        file("Manuscrito/intro.md", "intro.md"),
      ]),
    ];
    const index = buildManuscriptPathWritingIndex(nestedTree, {});
    expect(index.get("Manuscrito/Cap1/scene.md")).toBe(0);
    expect(index.get("Manuscrito/intro.md")).toBe(1);
  });

  it("indexa archivos cuando el árbol viene filtrado sin nodo Manuscrito raíz", () => {
    const eventoTest = "Manuscrito/Volumen 1/Capitulo 1/eventoTest.md";
    const timelineTest = "Manuscrito/carpeta en raíz/timeline test.md";
    const archivoD = "Manuscrito/linetest/archivo D.md";
    const filteredTree: FileTreeNode[] = [
      dir("Manuscrito/Volumen 1", "Volumen 1", [
        dir("Manuscrito/Volumen 1/Capitulo 1", "Capitulo 1", [
          file(eventoTest, "eventoTest.md"),
        ]),
      ]),
      dir("Manuscrito/carpeta en raíz", "carpeta en raíz", [
        file(timelineTest, "timeline test.md"),
      ]),
      dir("Manuscrito/linetest", "linetest", [
        file(archivoD, "archivo D.md"),
      ]),
    ];
    const explorerOrder = {
      Manuscrito: [
        "Manuscrito/Volumen 1",
        "Manuscrito/carpeta en raíz",
        "Manuscrito/linetest",
      ],
    };

    const index = buildManuscriptPathWritingIndex(filteredTree, explorerOrder, []);

    expect(index.get(eventoTest)).toBeLessThan(index.get(timelineTest)!);
    expect(index.get(timelineTest)).toBeLessThan(index.get(archivoD)!);
    expect(index.size).toBe(3);
  });

  it("respeta explorerOrder al inyectar rutas del timeline ausentes del árbol", () => {
    const eventoTest = "Manuscrito/Volumen 1/Capitulo 1/eventoTest.md";
    const timelineTest = "Manuscrito/carpeta en raíz/timeline test.md";
    const archivoD = "Manuscrito/linetest/archivo D.md";
    const partialTree: FileTreeNode[] = [
      dir("Manuscrito", "Manuscrito", [
        dir("Manuscrito/linetest", "linetest", [
          file(archivoD, "archivo D.md"),
        ]),
      ]),
    ];
    const explorerOrder = {
      Manuscrito: [
        "Manuscrito/Volumen 1",
        "Manuscrito/carpeta en raíz",
        "Manuscrito/linetest",
      ],
    };

    const index = buildManuscriptPathWritingIndex(partialTree, explorerOrder, [
      eventoTest,
      timelineTest,
      archivoD,
    ]);

    expect(index.get(eventoTest)).toBeLessThan(index.get(timelineTest)!);
    expect(index.get(timelineTest)).toBeLessThan(index.get(archivoD)!);
  });
});

describe("buildWritingOrderNeighbors", () => {
  const path = "Manuscrito/scene.md";
  const segment = `${path}::seg::0`;
  const pathIndex = new Map([[path, 0]]);

  it("encadena prosa d10 → evento d15 → inline d20 en el mismo archivo", () => {
    const prosa = placed({
      id: "d10",
      kind: "file",
      label: "scene",
      fileLabel: "scene",
      eventLabel: null,
      segmentId: null,
      sortKey: 10n,
      path,
      blockIndex: 0,
      lane: "manuscript",
      tagKind: "bar",
    });
    const eventBar = placed({
      id: "d15",
      kind: "file",
      label: "evento (scene)",
      fileLabel: "scene",
      eventLabel: "evento",
      segmentId: segment,
      sortKey: 15n,
      path,
      blockIndex: 1,
      lane: "manuscript",
      tagKind: "bar",
    });
    const eventInline = placed({
      id: "d20",
      kind: "file",
      label: "evento (scene)",
      fileLabel: "scene",
      eventLabel: "evento",
      segmentId: segment,
      sortKey: 20n,
      path,
      blockIndex: 1,
      lane: "manuscript",
      tagKind: "inline",
      charOffset: 5,
    });

    const neighbors = buildWritingOrderNeighbors(
      [eventInline, prosa, eventBar],
      pathIndex,
    );

    expect(neighbors.get("d10")).toEqual({ prevId: null, nextId: "d15" });
    expect(neighbors.get("d15")).toEqual({ prevId: "d10", nextId: "d20" });
    expect(neighbors.get("d20")).toEqual({ prevId: "d15", nextId: null });
  });

  it("enlaza bar → inline aunque el inline sea cronológicamente anterior (flashback)", () => {
    const bar = placed({
      id: "bar",
      kind: "file",
      label: "evento (scene)",
      fileLabel: "scene",
      eventLabel: "evento",
      segmentId: segment,
      sortKey: 200n,
      path,
      blockIndex: 1,
      lane: "manuscript",
      tagKind: "bar",
    });
    const inline = placed({
      id: "inline",
      kind: "file",
      label: "evento (scene)",
      fileLabel: "scene",
      eventLabel: "evento",
      segmentId: segment,
      sortKey: 100n,
      path,
      blockIndex: 1,
      lane: "manuscript",
      tagKind: "inline",
      charOffset: 42,
    });

    const neighbors = buildWritingOrderNeighbors([bar, inline], pathIndex);
    expect(neighbors.get("bar")).toEqual({ prevId: null, nextId: "inline" });
    expect(neighbors.get("inline")).toEqual({ prevId: "bar", nextId: null });
  });

  it("ordena inline por charOffset dentro del segmento", () => {
    const first = placed({
      id: "a",
      kind: "file",
      label: "e (s)",
      fileLabel: "s",
      eventLabel: "e",
      segmentId: segment,
      sortKey: 1n,
      path,
      blockIndex: 1,
      lane: "manuscript",
      tagKind: "inline",
      charOffset: 10,
    });
    const second = placed({
      id: "b",
      kind: "file",
      label: "e (s)",
      fileLabel: "s",
      eventLabel: "e",
      segmentId: segment,
      sortKey: 1n,
      path,
      blockIndex: 1,
      lane: "manuscript",
      tagKind: "inline",
      charOffset: 20,
    });

    const neighbors = buildWritingOrderNeighbors([second, first], pathIndex);
    expect(neighbors.get("a")).toEqual({ prevId: null, nextId: "b" });
    expect(neighbors.get("b")).toEqual({ prevId: "a", nextId: null });
  });

  it("no mezcla lanes distintos", () => {
    const manuscript = placed({
      id: "m",
      kind: "file",
      label: "e (s)",
      fileLabel: "s",
      eventLabel: "e",
      segmentId: segment,
      sortKey: 1n,
      path,
      blockIndex: 1,
      lane: "manuscript",
      tagKind: "bar",
    });
    const below = placed({
      id: "b",
      kind: "file",
      label: "e (s)",
      fileLabel: "s",
      eventLabel: "e",
      segmentId: segment,
      sortKey: 2n,
      path: "Worldbuilding/x.md",
      blockIndex: 1,
      lane: "below",
      tagKind: "bar",
    });

    const neighbors = buildWritingOrderNeighbors([manuscript, below], pathIndex);
    expect(neighbors.get("m")).toEqual({ prevId: null, nextId: null });
    expect(neighbors.get("b")).toEqual({ prevId: null, nextId: null });
  });

  it("encadena archivos consecutivos en el árbol del manuscrito", () => {
    const a = placed({
      id: "a",
      kind: "file",
      label: "a",
      fileLabel: "a",
      eventLabel: null,
      segmentId: null,
      sortKey: 1n,
      path: "Manuscrito/a.md",
      blockIndex: 0,
      lane: "manuscript",
      tagKind: "bar",
    });
    const b = placed({
      id: "b",
      kind: "file",
      label: "b",
      fileLabel: "b",
      eventLabel: null,
      segmentId: null,
      sortKey: 2n,
      path: "Manuscrito/b.md",
      blockIndex: 0,
      lane: "manuscript",
      tagKind: "bar",
    });

    const index = new Map([
      ["Manuscrito/a.md", 0],
      ["Manuscrito/b.md", 1],
    ]);
    const neighbors = buildWritingOrderNeighbors([a, b], index);
    expect(neighbors.get("a")).toEqual({ prevId: null, nextId: "b" });
    expect(neighbors.get("b")).toEqual({ prevId: "a", nextId: null });
  });

  it("no intercala blockIndex entre archivos distintos", () => {
    const fileA = "Manuscrito/a.md";
    const fileB = "Manuscrito/b.md";
    const pathIndex = new Map([
      [fileA, 0],
      [fileB, 1],
    ]);

    const markA = placed({
      id: "a",
      kind: "file",
      label: "a",
      fileLabel: "a",
      eventLabel: null,
      segmentId: null,
      sortKey: 1n,
      path: fileA,
      blockIndex: 9,
      lane: "manuscript",
      tagKind: "bar",
    });
    const markB = placed({
      id: "b",
      kind: "file",
      label: "b",
      fileLabel: "b",
      eventLabel: null,
      segmentId: null,
      sortKey: 2n,
      path: fileB,
      blockIndex: 0,
      lane: "manuscript",
      tagKind: "bar",
    });

    const neighbors = buildWritingOrderNeighbors([markB, markA], pathIndex);
    expect(neighbors.get("a")).toEqual({ prevId: null, nextId: "b" });
    expect(neighbors.get("b")).toEqual({ prevId: "a", nextId: null });
  });

  it("conecta la última marca de timeline test con archivo A y luego B", () => {
    const timelineTest = "Manuscrito/carpeta en raíz/timeline test.md";
    const archivoA = "Manuscrito/linetest/archivo A.md";
    const archivoB = "Manuscrito/linetest/archivo B.md";
    const segment = `${timelineTest}::seg::0`;
    const pathIndex = new Map([
      [timelineTest, 0],
      [archivoA, 1],
      [archivoB, 2],
    ]);

    const ttBar = placed({
      id: "tt-bar",
      kind: "file",
      label: "timelineTest (timeline test)",
      fileLabel: "timeline test",
      eventLabel: "timelineTest",
      segmentId: segment,
      sortKey: 1n,
      path: timelineTest,
      blockIndex: 1,
      lane: "manuscript",
      tagKind: "bar",
    });
    const ttInline = placed({
      id: "tt-inline",
      kind: "file",
      label: "timelineTest (timeline test)",
      fileLabel: "timeline test",
      eventLabel: "timelineTest",
      segmentId: segment,
      sortKey: 4n,
      path: timelineTest,
      blockIndex: 1,
      lane: "manuscript",
      tagKind: "inline",
      charOffset: 10,
    });
    const markA = placed({
      id: "mark-a",
      kind: "file",
      label: "archivo A",
      fileLabel: "archivo A",
      eventLabel: null,
      segmentId: null,
      sortKey: 22n,
      path: archivoA,
      blockIndex: 0,
      lane: "manuscript",
      tagKind: "bar",
    });
    const markB = placed({
      id: "mark-b",
      kind: "file",
      label: "archivo B",
      fileLabel: "archivo B",
      eventLabel: null,
      segmentId: null,
      sortKey: 25n,
      path: archivoB,
      blockIndex: 0,
      lane: "manuscript",
      tagKind: "bar",
    });

    const neighbors = buildWritingOrderNeighbors(
      [markB, markA, ttInline, ttBar],
      pathIndex,
    );

    expect(neighbors.get("tt-inline")).toEqual({ prevId: "tt-bar", nextId: "mark-a" });
    expect(neighbors.get("mark-a")).toEqual({ prevId: "tt-inline", nextId: "mark-b" });
    expect(neighbors.get("mark-b")).toEqual({ prevId: "mark-a", nextId: null });
  });

  it("archivo D no enlaza hacia adelante con eventoTest si va después en el árbol", () => {
    const eventoTest = "Manuscrito/Volumen 1/Capitulo 1/eventoTest.md";
    const timelineTest = "Manuscrito/carpeta en raíz/timeline test.md";
    const archivoD = "Manuscrito/linetest/archivo D.md";
    const segment = `${eventoTest}::seg::0`;

    const filteredTree: FileTreeNode[] = [
      dir("Manuscrito/linetest", "linetest", [
        file(archivoD, "archivo D.md"),
      ]),
    ];
    const explorerOrder = {
      Manuscrito: [
        "Manuscrito/Volumen 1",
        "Manuscrito/carpeta en raíz",
        "Manuscrito/linetest",
      ],
    };

    const pathIndex = buildManuscriptPathWritingIndex(
      filteredTree,
      explorerOrder,
      [eventoTest, timelineTest, archivoD],
    );

    const eventoBar = placed({
      id: "ev-bar",
      kind: "file",
      label: "evento1",
      fileLabel: "eventoTest",
      eventLabel: "evento1",
      segmentId: segment,
      sortKey: 15n,
      path: eventoTest,
      blockIndex: 1,
      lane: "manuscript",
      tagKind: "bar",
    });
    const markD = placed({
      id: "mark-d",
      kind: "file",
      label: "archivo D",
      fileLabel: "archivo D",
      eventLabel: null,
      segmentId: null,
      sortKey: 27n,
      path: archivoD,
      blockIndex: 0,
      lane: "manuscript",
      tagKind: "bar",
    });

    const neighbors = buildWritingOrderNeighbors([eventoBar, markD], pathIndex);
    expect(neighbors.get("mark-d")).toEqual({ prevId: "ev-bar", nextId: null });
  });
});

describe("compareWritingOrder", () => {
  it("prioriza pathIndex sobre sortKey cronológico", () => {
    const pathIndex = new Map([
      ["Manuscrito/a.md", 0],
      ["Manuscrito/b.md", 1],
    ]);
    const a = writingOrderKeyForItem(
      placed({
        id: "a",
        kind: "file",
        label: "x",
        fileLabel: "x",
        eventLabel: "e",
        segmentId: "Manuscrito/a.md::seg::0",
        sortKey: 999n,
        path: "Manuscrito/a.md",
        blockIndex: 1,
        lane: "manuscript",
        tagKind: "bar",
      }),
      pathIndex,
    );
    const b = writingOrderKeyForItem(
      placed({
        id: "b",
        kind: "file",
        label: "y",
        fileLabel: "y",
        eventLabel: "e",
        segmentId: "Manuscrito/b.md::seg::0",
        sortKey: 1n,
        path: "Manuscrito/b.md",
        blockIndex: 1,
        lane: "manuscript",
        tagKind: "bar",
      }),
      pathIndex,
    );
    expect(compareWritingOrder(a, b)).toBeLessThan(0);
  });

  it("ordena cabecera de archivo antes del primer evento", () => {
    const pathIndex = new Map([["Manuscrito/scene.md", 0]]);
    const header = writingOrderKeyForItem(
      placed({
        id: "h",
        kind: "file",
        label: "scene",
        fileLabel: "scene",
        eventLabel: null,
        segmentId: null,
        sortKey: 10n,
        path: "Manuscrito/scene.md",
        blockIndex: 0,
        lane: "manuscript",
        tagKind: "bar",
      }),
      pathIndex,
    );
    const event = writingOrderKeyForItem(
      placed({
        id: "e",
        kind: "file",
        label: "ev (scene)",
        fileLabel: "scene",
        eventLabel: "ev",
        segmentId: "Manuscrito/scene.md::seg::0",
        sortKey: 5n,
        path: "Manuscrito/scene.md",
        blockIndex: 1,
        lane: "manuscript",
        tagKind: "bar",
      }),
      pathIndex,
    );
    expect(compareWritingOrderWithinFile(header, event)).toBeLessThan(0);
  });
});
