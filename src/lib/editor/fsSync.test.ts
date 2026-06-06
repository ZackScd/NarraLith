import { describe, expect, it } from "vitest";

import {
  isPathUnderPrefix,
  remapPathForRename,
  tabPathsToCloseOnRemove,
  tabPathsToReloadOnFsChange,
} from "@/lib/editor/fsSync";

describe("fsSync", () => {
  it("detects paths under a removed folder prefix", () => {
    expect(isPathUnderPrefix("Manuscrito/Cap/Escena.md", "Manuscrito/Cap")).toBe(true);
    expect(isPathUnderPrefix("Manuscrito/Otro.md", "Manuscrito/Cap")).toBe(false);
  });

  it("remaps tab paths on folder rename", () => {
    expect(
      remapPathForRename(
        "Manuscrito/Cap/Escena.md",
        "Manuscrito/Cap",
        "Manuscrito/Capitulo",
      ),
    ).toBe("Manuscrito/Capitulo/Escena.md");
    expect(
      remapPathForRename("Manuscrito/Otro.md", "Manuscrito/Cap", "Manuscrito/X"),
    ).toBeNull();
  });

  it("closes tabs under removed paths", () => {
    const closed = tabPathsToCloseOnRemove(
      ["Manuscrito/Cap"],
      ["Manuscrito/Cap/Escena.md", "Manuscrito/Otro.md"],
    );
    expect(closed).toEqual(["Manuscrito/Cap/Escena.md"]);
  });

  it("reloads all tabs on restore", () => {
    const tabs = ["Manuscrito/A.md", "Manuscrito/B.md"];
    expect(tabPathsToReloadOnFsChange({ kind: "restore", paths: [] }, tabs)).toEqual(
      tabs,
    );
  });

  it("reloads remapped and refactored paths on rename", () => {
    const reloaded = tabPathsToReloadOnFsChange(
      {
        kind: "rename",
        fromPath: "Manuscrito/Escena.md",
        paths: ["Manuscrito/Renamed.md", "Manuscrito/Otro.md"],
      },
      ["Manuscrito/Escena.md", "Manuscrito/Otro.md"],
    );
    expect(reloaded).toContain("Manuscrito/Renamed.md");
    expect(reloaded).toContain("Manuscrito/Otro.md");
  });
});
