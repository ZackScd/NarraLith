/** Resumen de un punto de control del proyecto (IPC `list_snapshots` / `create_snapshot`). */
export interface SnapshotSummary {
  id: string;
  message: string;
  createdAt: number;
  kind: "manual" | "auto" | "init";
}

export type DiffChunkKind = "equal" | "add" | "remove";

export interface DiffChunk {
  kind: DiffChunkKind;
  text: string;
}

export interface FileDiffResult {
  relativePath: string;
  snapshotIdA: string | null;
  snapshotIdB: string | null;
  wordCountOld: number;
  wordCountNew: number;
  chunks: DiffChunk[];
}

export interface VersioningConfig {
  autoRetention: number;
  autoIntervalMinutes: number;
}
