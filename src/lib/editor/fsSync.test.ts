import { describe, expect, it } from "vitest";

import {
  entityPathsFromSegments,
  filterFsRemovePaths,
  isNarralithWriteTempPath,
  isPathUnderPrefix,
  markSelfSave,
  remapPathForRename,
  shouldIgnoreFsReload,
  tabPathsToCloseOnRemove,
  tabPathsToReloadOnFsChange,
} from "@/lib/editor/fsSync";

describe("fsSync", () => {
  it("marks entity paths from event segments", () => {
    expect(
      entityPathsFromSegments([
        { kind: "freeText", id: "a", segmentIndex: 0, body: "x" },
        {
          kind: "event",
          id: "b",
          segmentIndex: 1,
          name: "E1",
          description: "",
          entityPath: "Worldbuilding/Eventos/e1.md",
          body: "",
          closed: false,
        },
      ]),
    ).toEqual(["Worldbuilding/Eventos/e1.md"]);
  });

  it("detects narralith atomic write temp paths", () => {
    expect(isNarralithWriteTempPath("Worldbuilding/Eventos/.narralith-write-12345")).toBe(
      true,
    );
    expect(isNarralithWriteTempPath("Worldbuilding/Eventos/evento.md")).toBe(false);
  });

  it("ignores fs reload shortly after markSelfSave", () => {
    markSelfSave("Manuscrito/A.md");
    expect(shouldIgnoreFsReload("Manuscrito/A.md")).toBe(true);
    expect(shouldIgnoreFsReload("Manuscrito/B.md")).toBe(false);
  });

  it("filters spurious remove paths for recently saved tabs", () => {
    markSelfSave("Manuscrito/eventoTest.md");
    const filtered = filterFsRemovePaths(
      ["Manuscrito/eventoTest.md", "Manuscrito/meow.md"],
      ["Manuscrito/eventoTest.md", "Manuscrito/meow.md"],
    );
    expect(filtered).toEqual(["Manuscrito/meow.md"]);
  });

  it("filters narralith write temp from remove events", () => {
    const filtered = filterFsRemovePaths(
      ["Worldbuilding/Eventos/.narralith-write-999"],
      ["Worldbuilding/Eventos/evento.md"],
    );
    expect(filtered).toEqual([]);
  });

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
