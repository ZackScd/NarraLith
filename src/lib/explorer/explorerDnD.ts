/** IDs de zonas de soltado del explorador. */

export const EXPLORER_DND = {
  row: (path: string) => `row:${path}`,
  end: (parentPath: string) => `end:${parentPath}`,
} as const;

export function parseEndDropId(
  overId: string,
): { kind: "end"; parentPath: string } | null {
  if (overId.startsWith("end:")) {
    return { kind: "end", parentPath: overId.slice("end:".length) };
  }
  return null;
}

export function parseRowDropId(overId: string): string | null {
  if (overId.startsWith("row:")) {
    return overId.slice("row:".length);
  }
  return null;
}
