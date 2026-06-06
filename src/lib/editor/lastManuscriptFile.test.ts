import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearManuscriptTabsSession,
  getManuscriptTabsSession,
  isPersistableManuscriptPath,
  LAST_MANUSCRIPT_FILE_STORAGE_KEY,
  setManuscriptTabsSession,
} from "./lastManuscriptFile";

const PROJECT = "C:/Books/MyNovel";
const OTHER_PROJECT = "D:/Other";

const storage = new Map<string, string>();

describe("lastManuscriptFile", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when nothing stored", () => {
    expect(getManuscriptTabsSession(PROJECT)).toBeNull();
  });

  it("stores and retrieves multiple manuscript tabs per project", () => {
    setManuscriptTabsSession(PROJECT, {
      tabOrder: ["Manuscrito/Cap1/a.md", "Manuscrito/Cap1/b.md"],
      activeFilePath: "Manuscrito/Cap1/a.md",
    });
    expect(getManuscriptTabsSession(PROJECT)).toEqual({
      tabOrder: ["Manuscrito/Cap1/a.md", "Manuscrito/Cap1/b.md"],
      activeFilePath: "Manuscrito/Cap1/a.md",
    });
    expect(getManuscriptTabsSession(OTHER_PROJECT)).toBeNull();
  });

  it("normalizes path separators", () => {
    setManuscriptTabsSession(PROJECT, {
      tabOrder: ["Manuscrito\\Cap1\\foo.md"],
      activeFilePath: "Manuscrito\\Cap1\\foo.md",
    });
    expect(getManuscriptTabsSession(PROJECT)).toEqual({
      tabOrder: ["Manuscrito/Cap1/foo.md"],
      activeFilePath: "Manuscrito/Cap1/foo.md",
    });
  });

  it("migrates legacy single-path string format", () => {
    storage.set(
      LAST_MANUSCRIPT_FILE_STORAGE_KEY,
      JSON.stringify({ [PROJECT]: "Manuscrito/Cap1/foo.md" }),
    );
    expect(getManuscriptTabsSession(PROJECT)).toEqual({
      tabOrder: ["Manuscrito/Cap1/foo.md"],
      activeFilePath: "Manuscrito/Cap1/foo.md",
    });
  });

  it("rejects worldbuilding entity paths in tabOrder", () => {
    setManuscriptTabsSession(PROJECT, {
      tabOrder: ["Manuscrito/a.md", "Worldbuilding/Personajes/hero.md"],
      activeFilePath: "Worldbuilding/Personajes/hero.md",
    });
    expect(getManuscriptTabsSession(PROJECT)).toEqual({
      tabOrder: ["Manuscrito/a.md"],
      activeFilePath: "Manuscrito/a.md",
    });
  });

  it("rejects non-md paths", () => {
    setManuscriptTabsSession(PROJECT, {
      tabOrder: ["Manuscrito/notes.txt"],
      activeFilePath: "Manuscrito/notes.txt",
    });
    expect(getManuscriptTabsSession(PROJECT)).toBeNull();
  });

  it("deduplicates tabOrder entries", () => {
    setManuscriptTabsSession(PROJECT, {
      tabOrder: ["Manuscrito/a.md", "Manuscrito/a.md", "Manuscrito/b.md"],
      activeFilePath: "Manuscrito/b.md",
    });
    expect(getManuscriptTabsSession(PROJECT)).toEqual({
      tabOrder: ["Manuscrito/a.md", "Manuscrito/b.md"],
      activeFilePath: "Manuscrito/b.md",
    });
  });

  it("clear removes entry for project", () => {
    setManuscriptTabsSession(PROJECT, {
      tabOrder: ["Manuscrito/a.md"],
      activeFilePath: "Manuscrito/a.md",
    });
    setManuscriptTabsSession(OTHER_PROJECT, {
      tabOrder: ["Manuscrito/b.md"],
      activeFilePath: "Manuscrito/b.md",
    });
    clearManuscriptTabsSession(PROJECT);
    expect(getManuscriptTabsSession(PROJECT)).toBeNull();
    expect(getManuscriptTabsSession(OTHER_PROJECT)).toEqual({
      tabOrder: ["Manuscrito/b.md"],
      activeFilePath: "Manuscrito/b.md",
    });
  });

  it("isPersistableManuscriptPath identifies manuscript md only", () => {
    expect(isPersistableManuscriptPath("Manuscrito/a.md")).toBe(true);
    expect(isPersistableManuscriptPath("Worldbuilding/Personajes/a.md")).toBe(false);
    expect(isPersistableManuscriptPath("Manuscrito/a.txt")).toBe(false);
  });
});
