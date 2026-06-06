/** Intención de soltado inferida por la posición del cursor sobre una fila. */

export type ExplorerDropIntent =
  | { kind: "before"; path: string }
  | { kind: "after"; path: string }
  | { kind: "end"; parentPath: string }
  | { kind: "into"; folderPath: string };

/** Fracción superior/inferior de la fila reservada para reordenar (línea de inserción). */
export const ROW_EDGE_FRACTION = 0.36;

export function resolveManuscriptRowDropIntent(args: {
  path: string;
  isDir: boolean;
  pointerY: number;
  rectTop: number;
  rectHeight: number;
}): ExplorerDropIntent {
  if (args.isDir) {
    return { kind: "into", folderPath: args.path };
  }

  const height = Math.max(args.rectHeight, 1);
  const rel = (args.pointerY - args.rectTop) / height;

  return rel < 0.5
    ? { kind: "before", path: args.path }
    : { kind: "after", path: args.path };
}

export function resolveRowDropIntent(args: {
  path: string;
  isDir: boolean;
  pointerY: number;
  rectTop: number;
  rectHeight: number;
}): ExplorerDropIntent {
  const height = Math.max(args.rectHeight, 1);
  const rel = (args.pointerY - args.rectTop) / height;

  if (rel < ROW_EDGE_FRACTION) {
    return { kind: "before", path: args.path };
  }
  if (rel > 1 - ROW_EDGE_FRACTION) {
    return { kind: "after", path: args.path };
  }
  if (args.isDir) {
    return { kind: "into", folderPath: args.path };
  }
  return rel < 0.5
    ? { kind: "before", path: args.path }
    : { kind: "after", path: args.path };
}
