/** Evento emitido por Rust tras reconciliar cambios en el FS del proyecto. */
export interface FsChangeEvent {
  kind: "create" | "modify" | "remove" | "rename" | "restore" | string;
  paths: string[];
  fromPath?: string;
}

/** Nodo del árbol del explorador (IPC `list_dir_tree`). */
export interface FileTreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileTreeNode[];
  color?: string;
}

export type ExplorerViewMode = "manuscript" | "worldbuilding" | "all";

export type ExplorerLayout = "tree" | "cards";
