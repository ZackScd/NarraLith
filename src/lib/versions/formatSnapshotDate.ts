/** Formato legible de marca temporal Unix (ms) para historial de versiones. */
export function formatSnapshotDate(timestampMs: number, locale: string): string {
  return new Date(timestampMs).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
