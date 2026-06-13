import { create } from "zustand";

import { invokeCommand, parseAppError } from "@/lib/ipc";
import { audit } from "@/lib/audit";
import {
  appendToParentOrderInMap,
  applyCustomOrder,
  listParentForView,
  movePathInOrderMap,
  removePathFromOrderMap,
  renameInOrderMap,
  reorderSiblingInMap,
  reorderSiblingToEndInMap,
  type ExplorerOrderMap,
} from "@/lib/explorer/treeOrder";
import { listSiblingPaths } from "@/lib/explorer/treeNav";
import type { ExplorerLayout, ExplorerViewMode, FileTreeNode } from "@/lib/types/fs";
import type { ExplorerDialogState } from "@/modules/explorer/ExplorerDialogs";
import { resolveNewFileName, resolveRenameDiskName, trimCreateName } from "@/lib/explorer/newFileName";

const LAYOUT_STORAGE_KEY = "narralith-explorer-layout";

function countTreeNodes(nodes: FileTreeNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count += 1;
    if (node.children?.length) {
      count += countTreeNodes(node.children);
    }
  }
  return count;
}

function loadExplorerLayout(): ExplorerLayout {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (raw === "cards" || raw === "tree") {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return "tree";
}

function parentDir(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.slice(0, idx);
}

export type InlineCreateKind = "file" | "folder";

export type InlineCreateState =
  | { kind: InlineCreateKind; parentPath: string }
  | null;

function expandPathAndAncestors(path: string): Record<string, boolean> {
  if (!path) {
    return {};
  }
  const expanded: Record<string, boolean> = {};
  const parts = path.split("/").filter(Boolean);
  let acc = "";
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part;
    expanded[acc] = true;
  }
  return expanded;
}

export type InlineRenameState =
  | { path: string; isDir: boolean; fileName: string }
  | null;

interface FileTreeState {
  tree: FileTreeNode[];
  explorerOrder: ExplorerOrderMap;
  viewMode: ExplorerViewMode;
  explorerLayout: ExplorerLayout;
  cardPath: string;
  selectedPath: string | null;
  expandedPaths: Record<string, boolean>;
  isLoading: boolean;
  lastErrorKey: string | null;
  revision: number;
  lastFsEvent: string | null;
  searchQuery: string;
  searchOpen: boolean;
  explorerDialog: ExplorerDialogState;
  inlineCreate: InlineCreateState;
  inlineRename: InlineRenameState;

  setViewMode: (mode: ExplorerViewMode) => void;
  setExplorerLayout: (layout: ExplorerLayout) => void;
  setCardPath: (path: string) => void;
  loadTree: () => Promise<void>;
  refreshFromBackend: () => void;
  notifyFsChange: (summary: string) => void;
  selectNode: (path: string | null) => void;
  toggleExpanded: (path: string) => void;
  expandPath: (path: string) => void;
  collapseAll: () => void;
  expandAll: () => void;
  /** Smart toggle: si hay alguna carpeta expandida, colapsa todo; si no, expande todo. */
  toggleExpandAll: () => void;
  /** Indica si actualmente hay alguna carpeta expandida (incluye defaults). */
  hasAnyExpandedFolder: () => boolean;
  setSearchQuery: (query: string) => void;
  setSearchOpen: (open: boolean) => void;
  toggleSearch: () => void;
  closeSearch: () => void;
  openExplorerDialog: (dialog: ExplorerDialogState) => void;
  closeExplorerDialog: () => void;
  startInlineCreate: (kind: InlineCreateKind, parentPath: string) => void;
  cancelInlineCreate: () => void;
  commitInlineCreate: (rawName: string) => Promise<void>;
  startInlineRename: (path: string, isDir: boolean, fileName: string) => void;
  cancelInlineRename: () => void;
  commitInlineRename: (rawName: string) => Promise<void>;
  reorderExplorerSibling: (
    parentPath: string,
    sourcePath: string,
    targetPath: string,
    siblingPaths: string[],
    position?: "before" | "after",
  ) => Promise<void>;
  reorderExplorerToEnd: (
    parentPath: string,
    sourcePath: string,
    siblingPaths: string[],
  ) => Promise<void>;
  createFolder: (parentPath: string, name: string) => Promise<boolean>;
  createFile: (parentPath: string, name: string) => Promise<boolean>;
  renamePath: (path: string, newName: string) => Promise<boolean>;
  movePath: (sourcePath: string, destParentPath: string) => Promise<boolean>;
  deletePath: (path: string, force: boolean) => Promise<boolean>;
  reset: () => void;
}

const initialState = {
  tree: [] as FileTreeNode[],
  explorerOrder: {} as ExplorerOrderMap,
  viewMode: "manuscript" as ExplorerViewMode,
  explorerLayout: loadExplorerLayout(),
  cardPath: "",
  selectedPath: null as string | null,
  expandedPaths: {} as Record<string, boolean>,
  isLoading: false,
  lastErrorKey: null as string | null,
  revision: 0,
  lastFsEvent: null as string | null,
  searchQuery: "",
  searchOpen: false,
  explorerDialog: { type: "none" } as ExplorerDialogState,
  inlineCreate: null as InlineCreateState,
  inlineRename: null as InlineRenameState,
};

async function persistExplorerOrder(order: ExplorerOrderMap) {
  await invokeCommand("save_explorer_order", { order });
}

function orderedTree(
  tree: FileTreeNode[],
  order: ExplorerOrderMap,
  viewMode: ExplorerViewMode,
) {
  return applyCustomOrder(order, tree, listParentForView(viewMode));
}

export const useFileTreeStore = create<FileTreeState>((set, get) => ({
  ...initialState,

  setViewMode: (mode) => {
    set({ viewMode: mode, cardPath: "", searchQuery: "", searchOpen: false });
    void get().loadTree();
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchOpen: (open) =>
    set((s) => ({ searchOpen: open, searchQuery: open ? s.searchQuery : "" })),
  toggleSearch: () =>
    set((s) =>
      s.searchOpen || s.searchQuery.length > 0
        ? { searchOpen: false, searchQuery: "" }
        : { searchOpen: true },
    ),
  closeSearch: () => set({ searchOpen: false, searchQuery: "" }),
  openExplorerDialog: (dialog) =>
    set({
      explorerDialog: dialog,
      ...(dialog.type === "createEntity" ? { lastErrorKey: null } : {}),
    }),
  closeExplorerDialog: () => set({ explorerDialog: { type: "none" } }),

  startInlineCreate: (kind, parentPath) => {
    const state = get();
    if (state.explorerLayout === "cards") {
      state.setExplorerLayout("tree");
    }
    state.closeSearch();
    const ancestorExpansions = expandPathAndAncestors(parentPath);
    set({
      inlineCreate: { kind, parentPath },
      inlineRename: null,
      lastErrorKey: null,
      expandedPaths: { ...state.expandedPaths, ...ancestorExpansions },
    });
    audit.info("explorer", "obs.explorer.inline_create.start", { kind, parentPath });
  },

  cancelInlineCreate: () => {
    const { inlineCreate } = get();
    if (inlineCreate) {
      audit.info("explorer", "obs.explorer.inline_create.cancel", {
        kind: inlineCreate.kind,
        parentPath: inlineCreate.parentPath,
      });
    }
    set({ inlineCreate: null });
  },

  commitInlineCreate: async (rawName) => {
    const { inlineCreate } = get();
    if (!inlineCreate) {
      return;
    }

    const trimmed = trimCreateName(rawName);
    if (!trimmed) {
      get().cancelInlineCreate();
      return;
    }

    const diskName =
      inlineCreate.kind === "file" ? resolveNewFileName(trimmed) : trimmed;
    if (!diskName) {
      get().cancelInlineCreate();
      return;
    }

    audit.info("explorer", "obs.explorer.inline_create.commit", {
      kind: inlineCreate.kind,
      parentPath: inlineCreate.parentPath,
      diskName,
    });

    const ok =
      inlineCreate.kind === "file"
        ? await get().createFile(inlineCreate.parentPath, diskName)
        : await get().createFolder(inlineCreate.parentPath, diskName);

    audit.info("explorer", "obs.explorer.create.end", {
      kind: inlineCreate.kind,
      parentPath: inlineCreate.parentPath,
      diskName,
      ok,
      ...(ok ? {} : { errorKey: get().lastErrorKey }),
    });

    if (ok) {
      set({ inlineCreate: null });
    }
  },

  startInlineRename: (path, isDir, fileName) => {
    const state = get();
    if (state.explorerLayout === "cards") {
      state.setExplorerLayout("tree");
    }
    state.closeSearch();
    const ancestorExpansions = expandPathAndAncestors(path);
    set({
      inlineRename: { path, isDir, fileName },
      inlineCreate: null,
      lastErrorKey: null,
      selectedPath: path,
      expandedPaths: { ...state.expandedPaths, ...ancestorExpansions },
    });
    audit.info("explorer", "obs.explorer.inline_rename.start", { path, isDir });
  },

  cancelInlineRename: () => {
    const { inlineRename } = get();
    if (inlineRename) {
      audit.info("explorer", "obs.explorer.inline_rename.cancel", {
        path: inlineRename.path,
      });
    }
    set({ inlineRename: null });
  },

  commitInlineRename: async (rawName) => {
    const { inlineRename } = get();
    if (!inlineRename) {
      return;
    }

    const diskName = resolveRenameDiskName(rawName, inlineRename.isDir);
    if (!diskName || diskName === inlineRename.fileName) {
      get().cancelInlineRename();
      return;
    }

    audit.info("explorer", "obs.explorer.inline_rename.commit", {
      path: inlineRename.path,
      diskName,
    });

    const ok = await get().renamePath(inlineRename.path, diskName);

    audit.info("explorer", "obs.explorer.rename.end", {
      path: inlineRename.path,
      diskName,
      ok,
      ...(ok ? {} : { errorKey: get().lastErrorKey }),
    });

    if (ok) {
      set({ inlineRename: null });
    }
  },

  setExplorerLayout: (layout) => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, layout);
    const state = get();
    if (layout === "cards" && state.selectedPath) {
      const node = findNodeInTree(state.tree, state.selectedPath);
      const nextCard =
        node?.isDir === true ? state.selectedPath : parentDir(state.selectedPath);
      set({ explorerLayout: layout, cardPath: nextCard });
    } else {
      set({ explorerLayout: layout });
    }
  },

  setCardPath: (path) => set({ cardPath: path }),

  loadTree: async () => {
    set({ isLoading: true, lastErrorKey: null });
    try {
      const { viewMode } = get();
      const [tree, explorerOrder] = await Promise.all([
        invokeCommand<FileTreeNode[]>("list_dir_tree", { filterMode: viewMode }),
        invokeCommand<ExplorerOrderMap>("read_explorer_order", {}),
      ]);
      set({
        tree: orderedTree(tree, explorerOrder, viewMode),
        explorerOrder,
      });
      audit.debug("explorer", "obs.explorer.tree.load", {
        viewMode,
        nodeCount: countTreeNodes(tree),
      });
    } catch (err) {
      set({
        tree: [],
        lastErrorKey: parseAppError(err)?.key ?? "error.unknown",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshFromBackend: () => {
    set((s) => ({ revision: s.revision + 1 }));
    void get().loadTree();
  },

  notifyFsChange: (summary) => {
    audit.debug("explorer", "obs.explorer.fs.notify", { summary });
    set((s) => ({
      revision: s.revision + 1,
      lastFsEvent: summary,
    }));
    void get().loadTree();
  },

  selectNode: (path) => set({ selectedPath: path }),

  toggleExpanded: (path) =>
    set((s) => ({
      expandedPaths: {
        ...s.expandedPaths,
        [path]: !s.expandedPaths[path],
      },
    })),

  expandPath: (path) =>
    set((s) => ({
      expandedPaths: { ...s.expandedPaths, [path]: true },
    })),

  collapseAll: () => {
    const collapsed: Record<string, boolean> = {};
    const walk = (nodes: FileTreeNode[]) => {
      for (const node of nodes) {
        if (node.isDir) {
          collapsed[node.path] = false;
          if (node.children) {
            walk(node.children);
          }
        }
      }
    };
    walk(get().tree);
    set({ expandedPaths: collapsed });
  },

  expandAll: () => {
    const expanded: Record<string, boolean> = {};
    const walk = (nodes: FileTreeNode[]) => {
      for (const node of nodes) {
        if (node.isDir) {
          expanded[node.path] = true;
          if (node.children) {
            walk(node.children);
          }
        }
      }
    };
    walk(get().tree);
    set({ expandedPaths: expanded });
  },

  hasAnyExpandedFolder: () => {
    const { tree, expandedPaths } = get();
    let found = false;
    const walk = (nodes: FileTreeNode[], depth: number) => {
      for (const node of nodes) {
        if (found) {
          return;
        }
        if (node.isDir) {
          const isExpanded = expandedPaths[node.path] ?? depth < 2;
          if (isExpanded && (node.children?.length ?? 0) > 0) {
            found = true;
            return;
          }
          if (node.children) {
            walk(node.children, depth + 1);
          }
        }
      }
    };
    walk(tree, 0);
    return found;
  },

  toggleExpandAll: () => {
    if (get().hasAnyExpandedFolder()) {
      get().collapseAll();
    } else {
      get().expandAll();
    }
  },

  reorderExplorerSibling: async (
    parentPath,
    sourcePath,
    targetPath,
    siblingPaths,
    position = "before",
  ) => {
    const nextOrder = reorderSiblingInMap(
      get().explorerOrder,
      parentPath,
      sourcePath,
      targetPath,
      siblingPaths,
      position,
    );
    set((s) => ({
      explorerOrder: nextOrder,
      tree: orderedTree(s.tree, nextOrder, s.viewMode),
    }));
    try {
      await persistExplorerOrder(nextOrder);
    } catch (err) {
      set({ lastErrorKey: parseAppError(err)?.key ?? "error.unknown" });
    }
  },

  reorderExplorerToEnd: async (parentPath, sourcePath, siblingPaths) => {
    const nextOrder = reorderSiblingToEndInMap(
      get().explorerOrder,
      parentPath,
      sourcePath,
      siblingPaths,
    );
    set((s) => ({
      explorerOrder: nextOrder,
      tree: orderedTree(s.tree, nextOrder, s.viewMode),
    }));
    try {
      await persistExplorerOrder(nextOrder);
    } catch (err) {
      set({ lastErrorKey: parseAppError(err)?.key ?? "error.unknown" });
    }
  },

  createFolder: async (parentPath, name) => {
    set({ lastErrorKey: null });
    try {
      const newPath = await invokeCommand<string>("create_folder", {
        parentPath,
        name,
      });
      const { tree, viewMode, explorerOrder } = get();
      const siblings = listSiblingPaths(tree, parentPath, listParentForView(viewMode));
      const nextOrder = appendToParentOrderInMap(
        explorerOrder,
        parentPath,
        newPath,
        siblings,
      );
      await persistExplorerOrder(nextOrder);
      set({ explorerOrder: nextOrder });
      get().expandPath(parentPath);
      if (newPath.includes("/")) {
        const parent = newPath.split("/").slice(0, -1).join("/");
        get().expandPath(parent);
      }
      await get().loadTree();
      get().selectNode(newPath);
      return true;
    } catch (err) {
      set({ lastErrorKey: parseAppError(err)?.key ?? "error.unknown" });
      return false;
    }
  },

  createFile: async (parentPath, name) => {
    set({ lastErrorKey: null });
    try {
      const newPath = await invokeCommand<string>("create_file", {
        parentPath,
        name,
      });
      const { tree, viewMode, explorerOrder } = get();
      const siblings = listSiblingPaths(tree, parentPath, listParentForView(viewMode));
      const nextOrder = appendToParentOrderInMap(
        explorerOrder,
        parentPath,
        newPath,
        siblings,
      );
      await persistExplorerOrder(nextOrder);
      set({ explorerOrder: nextOrder });
      get().expandPath(parentPath);
      await get().loadTree();
      get().selectNode(newPath);
      return true;
    } catch (err) {
      set({ lastErrorKey: parseAppError(err)?.key ?? "error.unknown" });
      return false;
    }
  },

  renamePath: async (path, newName) => {
    set({ lastErrorKey: null });
    try {
      const newPath = await invokeCommand<string>("rename_path", {
        path,
        newName,
      });
      const nextOrder = renameInOrderMap(get().explorerOrder, path, newPath);
      await persistExplorerOrder(nextOrder);
      set({ explorerOrder: nextOrder });
      await get().loadTree();
      get().selectNode(newPath);
      return true;
    } catch (err) {
      set({ lastErrorKey: parseAppError(err)?.key ?? "error.unknown" });
      return false;
    }
  },

  movePath: async (sourcePath, destParentPath) => {
    set({ lastErrorKey: null });
    try {
      const newPath = await invokeCommand<string>("move_path", {
        sourcePath,
        destParentPath,
      });
      const nextOrder = movePathInOrderMap(get().explorerOrder, sourcePath, newPath);
      await persistExplorerOrder(nextOrder);
      set({ explorerOrder: nextOrder });
      get().expandPath(destParentPath);
      await get().loadTree();
      get().selectNode(newPath);
      return true;
    } catch (err) {
      set({ lastErrorKey: parseAppError(err)?.key ?? "error.unknown" });
      return false;
    }
  },

  deletePath: async (path, force) => {
    set({ lastErrorKey: null });
    try {
      await invokeCommand("delete_path", { path, force });
      const nextOrder = removePathFromOrderMap(get().explorerOrder, path);
      await persistExplorerOrder(nextOrder);
      set({ explorerOrder: nextOrder });
      await get().loadTree();
      if (get().selectedPath === path) {
        set({ selectedPath: null });
      }
      return true;
    } catch (err) {
      set({ lastErrorKey: parseAppError(err)?.key ?? "error.unknown" });
      return false;
    }
  },

  reset: () =>
    set({
      ...initialState,
      explorerLayout: loadExplorerLayout(),
      expandedPaths: {},
      inlineCreate: null,
      inlineRename: null,
    }),
}));

function findNodeInTree(nodes: FileTreeNode[], path: string): FileTreeNode | undefined {
  for (const n of nodes) {
    if (n.path === path) {
      return n;
    }
    if (n.children) {
      const found = findNodeInTree(n.children, path);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}
