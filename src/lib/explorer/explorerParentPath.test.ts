import { describe, expect, it } from "vitest";

import type { FileTreeNode } from "@/lib/types/fs";

import {
  resolveContextMenuParentPath,
  resolveLastOpenedParentPath,
} from "./explorerParentPath";

const tree: FileTreeNode[] = [
  {
    path: "Manuscrito",
    name: "Manuscrito",
    isDir: true,
    children: [
      {
        path: "Manuscrito/carpeta",
        name: "carpeta",
        isDir: true,
        children: [],
      },
      {
        path: "Manuscrito/zx.md",
        name: "zx.md",
        isDir: false,
      },
    ],
  },
];

describe("resolveContextMenuParentPath", () => {
  it("carpeta bajo cursor → su path", () => {
    const node: FileTreeNode = {
      path: "Manuscrito/carpeta",
      name: "carpeta",
      isDir: true,
    };
    expect(
      resolveContextMenuParentPath({
        node,
        cardPath: "",
        viewMode: "manuscript",
        useCardParent: false,
      }),
    ).toBe("Manuscrito/carpeta");
  });

  it("archivo bajo cursor → carpeta padre", () => {
    const node: FileTreeNode = {
      path: "Manuscrito/zx.md",
      name: "zx.md",
      isDir: false,
    };
    expect(
      resolveContextMenuParentPath({
        node,
        cardPath: "",
        viewMode: "manuscript",
        useCardParent: false,
      }),
    ).toBe("Manuscrito");
  });

  it("sin nodo en árbol → raíz de vista", () => {
    expect(
      resolveContextMenuParentPath({
        node: null,
        cardPath: "",
        viewMode: "manuscript",
        useCardParent: false,
      }),
    ).toBe("Manuscrito");
    expect(
      resolveContextMenuParentPath({
        node: null,
        cardPath: "",
        viewMode: "worldbuilding",
        useCardParent: false,
      }),
    ).toBe("Worldbuilding");
  });

  it("sin nodo en tarjetas WB → cardPath", () => {
    expect(
      resolveContextMenuParentPath({
        node: null,
        cardPath: "Worldbuilding/Personajes",
        viewMode: "worldbuilding",
        useCardParent: true,
      }),
    ).toBe("Worldbuilding/Personajes");
  });

  it("no usa selectedPath como fallback", () => {
    expect(
      resolveContextMenuParentPath({
        node: null,
        cardPath: "",
        viewMode: "manuscript",
        useCardParent: false,
      }),
    ).toBe("Manuscrito");
  });
});

describe("resolveLastOpenedParentPath", () => {
  it("selección carpeta → su path", () => {
    expect(
      resolveLastOpenedParentPath({
        tree,
        selectedPath: "Manuscrito/carpeta",
        activeFilePath: "Manuscrito/zx.md",
        activeTabKind: "manuscript",
        viewMode: "manuscript",
      }),
    ).toBe("Manuscrito/carpeta");
  });

  it("selección archivo → carpeta padre", () => {
    expect(
      resolveLastOpenedParentPath({
        tree,
        selectedPath: "Manuscrito/zx.md",
        activeFilePath: null,
        activeTabKind: null,
        viewMode: "manuscript",
      }),
    ).toBe("Manuscrito");
  });

  it("sin selección → padre del archivo activo en manuscrito", () => {
    expect(
      resolveLastOpenedParentPath({
        tree,
        selectedPath: null,
        activeFilePath: "Manuscrito/zx.md",
        activeTabKind: "manuscript",
        viewMode: "manuscript",
      }),
    ).toBe("Manuscrito");
  });

  it("sin selección ni archivo activo → raíz de vista", () => {
    expect(
      resolveLastOpenedParentPath({
        tree,
        selectedPath: null,
        activeFilePath: null,
        activeTabKind: null,
        viewMode: "worldbuilding",
      }),
    ).toBe("Worldbuilding");
  });
});
