import type { Collision, CollisionDetection } from "@dnd-kit/core";

import type { ExplorerDropIntent } from "@/lib/explorer/explorerDropIntent";
import { parseRowDropId } from "@/lib/explorer/explorerDnD";

/** Prioriza fila de carpeta sobre end/archivo cuando el puntero está en varias zonas. */
export function preferManuscriptFolderIntoIntent(
  collisions: Collision[],
  isFolderPath: (path: string) => boolean,
): ExplorerDropIntent | null {
  let deepestFolder: string | null = null;

  for (const collision of collisions) {
    const rowPath = parseRowDropId(String(collision.id));
    if (!rowPath || !isFolderPath(rowPath)) {
      continue;
    }
    if (!deepestFolder || rowPath.length > deepestFolder.length) {
      deepestFolder = rowPath;
    }
  }

  if (!deepestFolder) {
    return null;
  }

  return { kind: "into", folderPath: deepestFolder };
}

export function manuscriptPointerCollision(
  isManuscript: boolean,
  isFolderPath: (path: string) => boolean,
  baseDetection: CollisionDetection,
): CollisionDetection {
  return (args) => {
    const collisions = baseDetection(args);
    if (!isManuscript || collisions.length <= 1) {
      return collisions;
    }

    const folderHits = collisions.filter((collision) => {
      const rowPath = parseRowDropId(String(collision.id));
      return rowPath !== null && isFolderPath(rowPath);
    });

    if (folderHits.length === 0) {
      return collisions;
    }

    const rest = collisions.filter(
      (collision) => !folderHits.some((hit) => hit.id === collision.id),
    );

    return [...folderHits, ...rest];
  };
}
