/** Ruta relativa del proyecto con separadores `/`. */
export function normalizeProjectPath(path: string): string {
  return path.replace(/\\/g, "/");
}

/** Comparación de rutas de proyecto (insensible a `\` vs `/`). */
export function projectPathsEqual(a: string | null | undefined, b: string): boolean {
  if (!a) {
    return false;
  }
  return normalizeProjectPath(a) === normalizeProjectPath(b);
}

/** Nombre de archivo a partir de una ruta relativa del proyecto. */
export function basename(path: string): string {
  const normalized = normalizeProjectPath(path);
  const parts = normalized.split("/");
  return parts[parts.length - 1] || path;
}

/** Etiqueta visible de archivo (sin extensión .md). */
export function displayName(pathOrName: string): string {
  const base = basename(pathOrName);
  return base.replace(/\.md$/i, "");
}

/** Stem de entidad `.md` (sin extensión). */
export function entityStemFromPath(path: string | null): string | null {
  if (!path || !path.toLowerCase().endsWith(".md")) {
    return null;
  }
  const base = basename(path);
  return base.replace(/\.md$/i, "") || null;
}
