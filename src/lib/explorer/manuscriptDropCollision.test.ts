import { describe, expect, it } from "vitest";

import { preferManuscriptFolderIntoIntent } from "./manuscriptDropCollision";

describe("preferManuscriptFolderIntoIntent", () => {
  it("prioriza carpeta sobre otras colisiones", () => {
    const intent = preferManuscriptFolderIntoIntent(
      [
        { id: "row:Manuscrito/a.md" },
        { id: "row:Manuscrito/Cap1" },
        { id: "end:Manuscrito" },
      ],
      (path) => path === "Manuscrito/Cap1",
    );
    expect(intent).toEqual({ kind: "into", folderPath: "Manuscrito/Cap1" });
  });

  it("elige la carpeta más profunda si hay varias", () => {
    const intent = preferManuscriptFolderIntoIntent(
      [{ id: "row:Manuscrito/Vol" }, { id: "row:Manuscrito/Vol/Cap1" }],
      (path) => path.startsWith("Manuscrito/Vol"),
    );
    expect(intent).toEqual({ kind: "into", folderPath: "Manuscrito/Vol/Cap1" });
  });

  it("devuelve null si no hay filas de carpeta", () => {
    expect(
      preferManuscriptFolderIntoIntent([{ id: "row:Manuscrito/a.md" }], () => false),
    ).toBeNull();
  });
});
