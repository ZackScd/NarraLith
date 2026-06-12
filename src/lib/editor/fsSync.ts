import type { FsChangeEvent } from "@/lib/types/fs";
import type { ManuscriptSegment } from "@/lib/types/manuscript";

import { audit } from "@/lib/audit";

const SELF_SAVE_GUARD_MS = 2_500;
const recentSelfSaves = new Map<string, number>();
let saveBatchDepth = 0;

/** Archivo temporal de escritura atómica WB (`.narralith-write-{pid}`). */
export function isNarralithWriteTempPath(path: string): boolean {
  const base = path.split("/").pop() ?? path.split("\\").pop() ?? path;
  return base.startsWith(".narralith-write-");
}

/** Marca un guardado iniciado por la app para ignorar el `fs-changed` resultante. */
export function markSelfSave(filePath: string): void {
  recentSelfSaves.set(filePath, Date.now());
  audit.debug("fs", "obs.fs.self_save.mark", { path: filePath });
}

/** Marca varias rutas antes de un batch de guardado (p. ej. «Guardar todo»). */
export function markSelfSavePaths(filePaths: string[]): void {
  for (const filePath of filePaths) {
    markSelfSave(filePath);
  }
}

export function beginSaveBatch(): void {
  saveBatchDepth += 1;
}

export function endSaveBatch(): void {
  saveBatchDepth = Math.max(0, saveBatchDepth - 1);
}

export function isSaveBatchInProgress(): boolean {
  return saveBatchDepth > 0;
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
  audit.debug("fs", "obs.fs.self_save.hit", { path: filePath });
  return true;
}

/** Rutas de fichas WB referenciadas por segmentos de evento en un guardado. */
export function entityPathsFromSegments(segments: ManuscriptSegment[]): string[] {
  const paths: string[] = [];
  for (const segment of segments) {
    if (segment.kind !== "event") {
      continue;
    }
    const path = segment.entityPath.trim();
    if (path && !paths.includes(path)) {
      paths.push(path);
    }
  }
  return paths;
}

/**
 * Filtra rutas `remove` espurias (temp atómico WB o pestañas recién guardadas).
 * Devuelve solo las rutas que deben cerrar pestañas.
 */
export function filterFsRemovePaths(
  removedPaths: string[],
  openTabPaths: string[],
): string[] {
  if (isSaveBatchInProgress()) {
    audit.debug("fs", "obs.fs.remove.skip_batch", { removedPaths });
    return [];
  }

  return removedPaths.filter((removed) => {
    if (isNarralithWriteTempPath(removed)) {
      audit.debug("fs", "obs.fs.remove.skip_temp", { path: removed });
      return false;
    }

    const affectedTabs = tabPathsToCloseOnRemove([removed], openTabPaths);
    if (affectedTabs.length === 0) {
      return true;
    }

    const spurious = affectedTabs.some((tab) => shouldIgnoreFsReload(tab));
    if (spurious) {
      audit.debug("fs", "obs.fs.remove.skip_self_save", {
        removed,
        affectedTabs,
      });
    }
    return !spurious;
  });
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
