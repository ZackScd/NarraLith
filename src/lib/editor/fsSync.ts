import type { FsChangeEvent } from "@/lib/types/fs";

const SELF_SAVE_GUARD_MS = 2_500;
const recentSelfSaves = new Map<string, number>();

/** Marca un guardado iniciado por la app para ignorar el `fs-changed` resultante. */
export function markSelfSave(filePath: string): void {
  recentSelfSaves.set(filePath, Date.now());
}

/** Evita recargar el editor justo después de un guardado propio (mantiene scroll). */
export function shouldIgnoreFsReload(filePath: string): boolean {
  const savedAt = recentSelfSaves.get(filePath);
  if (savedAt == null) {
    return false;
  }
  if (Date.now() - savedAt > SELF_SAVE_GUARD_MS) {
    recentSelfSaves.delete(filePath);
    return false;
  }
  return true;
}

/** Ruta de pestaña bajo un prefijo (igual o hijo directo/indirecto). */
export function isPathUnderPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Nueva ruta tras renombrar/mover `fromPath` → `toPath` (o `null` si no aplica). */
export function remapPathForRename(
  tabPath: string,
  fromPath: string,
  toPath: string,
): string | null {
  if (tabPath === fromPath) {
    return toPath;
  }
  if (tabPath.startsWith(`${fromPath}/`)) {
    return `${toPath}${tabPath.slice(fromPath.length)}`;
  }
  return null;
}

/** Pestañas abiertas que deben cerrarse tras un `remove` (archivo o carpeta). */
export function tabPathsToCloseOnRemove(
  removedPaths: string[],
  tabPaths: string[],
): string[] {
  return tabPaths.filter((tab) =>
    removedPaths.some((removed) => isPathUnderPrefix(tab, removed)),
  );
}

/** Pestañas abiertas cuyo contenido puede haber cambiado en disco. */
export function tabPathsToReloadOnFsChange(
  event: Pick<FsChangeEvent, "kind" | "paths" | "fromPath">,
  tabPaths: string[],
): string[] {
  const { kind, paths, fromPath } = event;

  if (kind === "restore") {
    return [...tabPaths];
  }

  if (kind === "remove") {
    return [];
  }

  if (kind === "rename" && fromPath && paths.length > 0) {
    const toPath = paths[0];
    const remapped = tabPaths
      .map((tab) => remapPathForRename(tab, fromPath, toPath))
      .filter((p): p is string => p !== null);
    const directHits = tabPaths.filter((tab) => paths.includes(tab));
    return [...new Set([...remapped, ...directHits])];
  }

  return tabPaths.filter((tab) => paths.includes(tab));
}
