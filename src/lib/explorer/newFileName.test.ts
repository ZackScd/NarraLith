import { describe, expect, it } from "vitest";

import {
  hasFileExtension,
  isInlineCreateParent,
  renameInlineInitialName,
  resolveNewFileName,
  resolveRenameDiskName,
  trimCreateName,
} from "./newFileName";

describe("hasFileExtension", () => {
  it("detects explicit extensions", () => {
    expect(hasFileExtension("notas.txt")).toBe(true);
    expect(hasFileExtension("Escena.md")).toBe(true);
    expect(hasFileExtension("readme.md.bak")).toBe(true);
  });

  it("rejects hidden-only and trailing dot", () => {
    expect(hasFileExtension(".gitignore")).toBe(false);
    expect(hasFileExtension("foo.")).toBe(false);
  });

  it("rejects plain stems", () => {
    expect(hasFileExtension("Escena")).toBe(false);
    expect(hasFileExtension("Escena_1")).toBe(false);
  });
});

describe("resolveNewFileName", () => {
  it("adds .md when no extension", () => {
    expect(resolveNewFileName("Prueba")).toBe("Prueba.md");
    expect(resolveNewFileName("Escena_1")).toBe("Escena_1.md");
    expect(resolveNewFileName("foo.")).toBe("foo.md");
  });

  it("preserves explicit extensions", () => {
    expect(resolveNewFileName("notas.txt")).toBe("notas.txt");
    expect(resolveNewFileName("Escena.md")).toBe("Escena.md");
  });

  it("returns null for empty input", () => {
    expect(resolveNewFileName("")).toBeNull();
    expect(resolveNewFileName("   ")).toBeNull();
  });
});

describe("trimCreateName", () => {
  it("trims whitespace", () => {
    expect(trimCreateName("  Capítulo 2  ")).toBe("Capítulo 2");
  });
});

describe("isInlineCreateParent", () => {
  it("matches parent path", () => {
    expect(
      isInlineCreateParent({ parentPath: "Manuscrito" }, "Manuscrito"),
    ).toBe(true);
    expect(
      isInlineCreateParent({ parentPath: "Manuscrito" }, "Manuscrito/Cap"),
    ).toBe(false);
    expect(isInlineCreateParent(null, "Manuscrito")).toBe(false);
  });
});

describe("renameInlineInitialName", () => {
  it("shows stem for .md files", () => {
    expect(renameInlineInitialName("Escena.md", false)).toBe("Escena");
  });

  it("keeps folder and non-md names", () => {
    expect(renameInlineInitialName("Mi Carpeta", true)).toBe("Mi Carpeta");
    expect(renameInlineInitialName("notas.txt", false)).toBe("notas.txt");
  });
});

describe("resolveRenameDiskName", () => {
  it("adds .md for files without extension", () => {
    expect(resolveRenameDiskName("Capitulo", false)).toBe("Capitulo.md");
    expect(resolveRenameDiskName("foo.", false)).toBe("foo.md");
  });

  it("preserves explicit file extensions", () => {
    expect(resolveRenameDiskName("apuntes.txt", false)).toBe("apuntes.txt");
  });

  it("trims folder names without .md suffix", () => {
    expect(resolveRenameDiskName("  Nueva  ", true)).toBe("Nueva");
  });

  it("returns null for empty input", () => {
    expect(resolveRenameDiskName("", false)).toBeNull();
    expect(resolveRenameDiskName("   ", true)).toBeNull();
  });
});
