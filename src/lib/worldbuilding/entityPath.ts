/** Rutas de fichas bajo Worldbuilding (alineado con Rust `path_rules`). */

export function isEntityPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  const lower = normalized.toLowerCase();
  return (
    lower.startsWith("worldbuilding/") &&
    lower.endsWith(".md") &&
    !lower.endsWith(".folder.md")
  );
}
