/** Metadatos de carpeta (`.folder.md` oculto). */
export interface FolderMeta {
  description: string;
  imagePath?: string | null;
  title?: string | null;
}

export interface FolderCardData {
  path: string;
  name: string;
  color?: string;
  meta: FolderMeta;
  entityCount: number;
}
