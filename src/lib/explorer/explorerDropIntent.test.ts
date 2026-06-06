import { describe, expect, it } from "vitest";

import {
  resolveManuscriptRowDropIntent,
  resolveRowDropIntent,
} from "./explorerDropIntent";

describe("resolveRowDropIntent", () => {
  const base = {
    path: "Worldbuilding/Personajes",
    isDir: true,
    rectTop: 100,
    rectHeight: 40,
  };

  it("zona superior → before", () => {
    expect(resolveRowDropIntent({ ...base, pointerY: 108 })).toEqual({
      kind: "before",
      path: "Worldbuilding/Personajes",
    });
  });

  it("zona inferior → after", () => {
    expect(resolveRowDropIntent({ ...base, pointerY: 132 })).toEqual({
      kind: "after",
      path: "Worldbuilding/Personajes",
    });
  });

  it("centro de carpeta → into", () => {
    expect(resolveRowDropIntent({ ...base, pointerY: 120 })).toEqual({
      kind: "into",
      folderPath: "Worldbuilding/Personajes",
    });
  });

  it("centro de archivo → before/after según mitad", () => {
    expect(
      resolveRowDropIntent({
        ...base,
        isDir: false,
        pointerY: 115,
      }),
    ).toEqual({ kind: "before", path: "Worldbuilding/Personajes" });
    expect(
      resolveRowDropIntent({
        ...base,
        isDir: false,
        pointerY: 125,
      }),
    ).toEqual({ kind: "after", path: "Worldbuilding/Personajes" });
  });
});

describe("resolveManuscriptRowDropIntent", () => {
  const base = {
    path: "Manuscrito/Volumen 1",
    isDir: true,
    rectTop: 100,
    rectHeight: 40,
  };

  it("carpeta: cualquier posición Y → into", () => {
    expect(resolveManuscriptRowDropIntent({ ...base, pointerY: 102 })).toEqual({
      kind: "into",
      folderPath: "Manuscrito/Volumen 1",
    });
    expect(resolveManuscriptRowDropIntent({ ...base, pointerY: 105 })).toEqual({
      kind: "into",
      folderPath: "Manuscrito/Volumen 1",
    });
    expect(resolveManuscriptRowDropIntent({ ...base, pointerY: 138 })).toEqual({
      kind: "into",
      folderPath: "Manuscrito/Volumen 1",
    });
    expect(resolveManuscriptRowDropIntent({ ...base, pointerY: 120 })).toEqual({
      kind: "into",
      folderPath: "Manuscrito/Volumen 1",
    });
  });

  it("archivo: mitad superior → before", () => {
    expect(
      resolveManuscriptRowDropIntent({
        ...base,
        isDir: false,
        pointerY: 115,
      }),
    ).toEqual({ kind: "before", path: "Manuscrito/Volumen 1" });
  });

  it("archivo: mitad inferior → after", () => {
    expect(
      resolveManuscriptRowDropIntent({
        ...base,
        isDir: false,
        pointerY: 125,
      }),
    ).toEqual({ kind: "after", path: "Manuscrito/Volumen 1" });
  });
});
