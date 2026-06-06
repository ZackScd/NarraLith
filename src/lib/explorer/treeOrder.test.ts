import { describe, expect, it } from "vitest";

import type { FileTreeNode } from "@/lib/types/fs";

import {
  applyCustomOrder,
  appendToParentOrderInMap,
  listParentForView,
  reorderSiblingInMap,
} from "./treeOrder";

function dir(path: string, name: string, children: FileTreeNode[] = []): FileTreeNode {
  return { name, path, isDir: true, children };
}

describe("applyCustomOrder — vista Worldbuilding", () => {
  const trunk: FileTreeNode[] = [
    dir("Worldbuilding/Facciones", "Facciones"),
    dir("Worldbuilding/Personajes", "Personajes"),
    dir("Worldbuilding/Ubicaciones", "Ubicaciones"),
  ];

  const order = {
    Worldbuilding: [
      "Worldbuilding/Personajes",
      "Worldbuilding/Ubicaciones",
      "Worldbuilding/Facciones",
    ],
  };

  it("ordena la raíz del árbol filtrado con la clave Worldbuilding", () => {
    const sorted = applyCustomOrder(order, trunk, listParentForView("worldbuilding"));
    expect(sorted.map((n) => n.path)).toEqual([
      "Worldbuilding/Personajes",
      "Worldbuilding/Ubicaciones",
      "Worldbuilding/Facciones",
    ]);
  });

  it("sin padre virtual usa __root__ y no aplica el orden de troncos", () => {
    const sorted = applyCustomOrder(order, trunk, "");
    expect(sorted.map((n) => n.path)).toEqual([
      "Worldbuilding/Facciones",
      "Worldbuilding/Personajes",
      "Worldbuilding/Ubicaciones",
    ]);
  });
});

describe("reorderSiblingInMap — hermanos bajo Worldbuilding", () => {
  const siblings = [
    "Worldbuilding/Facciones",
    "Worldbuilding/Personajes",
    "Worldbuilding/Ubicaciones",
  ];

  it("reordena Personajes al inicio de los troncos", () => {
    const next = reorderSiblingInMap(
      {},
      "Worldbuilding",
      "Worldbuilding/Personajes",
      "Worldbuilding/Facciones",
      siblings,
      "before",
    );
    expect(next.Worldbuilding).toEqual([
      "Worldbuilding/Personajes",
      "Worldbuilding/Facciones",
      "Worldbuilding/Ubicaciones",
    ]);
  });
});

describe("appendToParentOrderInMap", () => {
  const parent = "Manuscrito/2";
  const siblings = [
    "Manuscrito/2/dd",
    "Manuscrito/2/dsadasd",
    "Manuscrito/2/dsadasdasdasdasd",
    "Manuscrito/2/escena 1",
  ];

  it("sin orden previo, añade al final respetando hermanos actuales", () => {
    const next = appendToParentOrderInMap(
      {},
      parent,
      "Manuscrito/2/nuevo.md",
      siblings,
    );
    expect(next[parent]).toEqual([...siblings, "Manuscrito/2/nuevo.md"]);
  });

  it("con orden previo, añade al final sin reordenar alfabéticamente", () => {
    const existing = { [parent]: [...siblings] };
    const next = appendToParentOrderInMap(
      existing,
      parent,
      "Manuscrito/2/aaa.md",
      siblings,
    );
    expect(next[parent]).toEqual([...siblings, "Manuscrito/2/aaa.md"]);
  });

  it("es idempotente si newPath ya está presente", () => {
    const existing = { [parent]: [...siblings, "Manuscrito/2/nuevo.md"] };
    const next = appendToParentOrderInMap(
      existing,
      parent,
      "Manuscrito/2/nuevo.md",
      siblings,
    );
    expect(next).toBe(existing);
  });
});
