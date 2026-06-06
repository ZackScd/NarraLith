/** Fila IPC `get_backlinks`. */
export interface BacklinkRow {
  id: string;
  sourcePath: string;
  blockIndex: number;
  snippet: string | null;
}

/** Fila IPC `find_unlinked_mentions`. */
export interface UnlinkedMentionRow {
  sourcePath: string;
  blockIndex: number;
  start: number;
  end: number;
  snippet: string;
}
