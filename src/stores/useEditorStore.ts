import { create } from "zustand";

import {
  applyExtractedManuscript,
  bodyFingerprintFromExtractedManuscript,
  bodyFingerprintFromManuscript,
  type ActiveEventContext,
  type ExtractedManuscriptPayload,
} from "@/lib/editor/documentSync";
import { beginEditorSession } from "@/lib/editor/editorSyncGuard";
import {
  clearManuscriptTabsSession,
  isPersistableManuscriptPath,
} from "@/lib/editor/lastManuscriptFile";
import { remapPathForRename, tabPathsToCloseOnRemove } from "@/lib/editor/fsSync";
import { markSelfSave } from "@/lib/editor/fsSync";
import { manuscriptToParsedDocument } from "@/lib/editor/manuscriptBlocks";
import { audit } from "@/lib/audit";
import { invokeCommand, parseAppError } from "@/lib/ipc";
import type { EntityDocument, EntityTabState } from "@/lib/types/entity";
import type { EntityTemplate } from "@/lib/types/entityTemplate";
import type { ParsedDocument } from "@/lib/types/editor";
import type { BarTag, ParsedManuscript } from "@/lib/types/manuscript";
import { entityFingerprint } from "@/lib/worldbuilding/entityFingerprint";
import { isEntityPath } from "@/lib/worldbuilding/entityPath";
import { useProjectStore } from "@/stores/useProjectStore";

export type SaveStatus = "idle" | "saving" | "saved" | "error";
export type MetadataSaveStatus = "idle" | "saving" | "saved" | "error";
export type TabKind = "manuscript" | "entity";

const emptyEventContext: ActiveEventContext = {
  segmentId: null,
  segmentIndex: null,
  inEvent: false,
  eventClosed: false,
  canExpandMargin: false,
};

export interface EditorTab {
  filePath: string;
  kind: TabKind;
  manuscript?: ParsedManuscript;
  /** Adaptador legacy para paneles no migrados (§4.2). */
  document?: ParsedDocument;
  entity?: EntityTabState;
  savedBodyFingerprint: string;
  isDirty: boolean;
  saveStatus: SaveStatus;
  activeBlockIndex: number;
  activeEventContext: ActiveEventContext;
  documentSyncKey: number;
  metadataSaveStatus: MetadataSaveStatus;
}

type ExtractManuscriptFn = () => ExtractedManuscriptPayload | null;
type InsertInlineTagFn = (tagType: string, value: string) => boolean;
type CloseEventFn = () => boolean;
type ExpandEventFn = () => boolean;
type CommitEventFn = (params: {
  name: string;
  description: string;
  entityPath: string;
  barTags: BarTag[];
}) => boolean;
type UpdateEventFn = (params: {
  name: string;
  description: string;
  barTags: BarTag[] | null;
}) => boolean;
type AppendBarTimeFn = (timeTag: string, hour?: number | null) => boolean;
type RemoveEventFn = (segmentId: string) => boolean;
type RemoveEventEndFn = (segmentId: string) => boolean;

type UnsavedAction = "open" | "close";

interface EditorState {
  tabs: Record<string, EditorTab>;
  tabOrder: string[];
  activeFilePath: string | null;
  activeTabKind: TabKind | null;
  manuscript: ParsedManuscript | null;
  document: ParsedDocument | null;
  entity: EntityTabState | null;
  documentSyncKey: number;
  activeBlockIndex: number;
  activeEventContext: ActiveEventContext;
  savedBodyFingerprint: string | null;
  isLoading: boolean;
  isDirty: boolean;
  saveStatus: SaveStatus;
  metadataSaveStatus: MetadataSaveStatus;
  lastErrorKey: string | null;
  lastErrorDetails: string | null;
  showUnsavedDialog: boolean;
  unsavedAction: UnsavedAction;
  pendingFilePath: string | null;
  showExternalReloadDialog: boolean;

  setExtractManuscriptFn: (fn: ExtractManuscriptFn | null) => void;
  setInsertInlineTagFn: (fn: InsertInlineTagFn | null) => void;
  setCloseEventFn: (fn: CloseEventFn | null) => void;
  setExpandEventFn: (fn: ExpandEventFn | null) => void;
  setCommitEventFn: (fn: CommitEventFn | null) => void;
  setUpdateEventFn: (fn: UpdateEventFn | null) => void;
  setAppendBarTimeFn: (fn: AppendBarTimeFn | null) => void;
  setRemoveEventFn: (fn: RemoveEventFn | null) => void;
  setRemoveEventEndFn: (fn: RemoveEventEndFn | null) => void;
  /** Sincroniza `manuscript` desde Lexical sin escribir a disco. */
  reconcileManuscriptFromEditor: () => boolean;
  setActiveEventContext: (
    context: ActiveEventContext,
    legacyBlockIndex: number,
  ) => void;
  setActiveBlockIndex: (index: number) => void;
  insertInlineTagAtCursor: (tagType: string, value: string) => boolean;
  closeEventAtCursor: () => boolean;
  expandEventAtCursor: () => boolean;
  commitEventAtCursor: (params: {
    name: string;
    description: string;
    entityPath: string;
    barTags: BarTag[];
  }) => boolean;
  updateEventAtCursor: (params: {
    name: string;
    description: string;
    barTags: BarTag[] | null;
  }) => boolean;
  appendBarTimeToActiveEvent: (timeTag: string, hour?: number | null) => boolean;
  removeEventFromEditor: (segmentId: string) => boolean;
  removeEventEndFromEditor: (segmentId: string) => boolean;
  labelCommitDepth: number;
  autosaveSuppressUntil: number;
  beginLabelCommit: () => void;
  endLabelCommit: () => void;
  markDirty: () => void;
  /** Alinea baseline de “guardado” con el contenido actual del editor (p. ej. tras hidratar). */
  commitSavedBaseline: (fingerprint: string) => void;
  requestOpenDocument: (filePath: string) => Promise<void>;
  /** Navegación por wiki-link / backlink: cambia de pestaña sin diálogo de guardado. */
  navigateToDocument: (filePath: string) => Promise<void>;
  switchTab: (filePath: string) => Promise<void>;
  confirmDiscardUnsaved: () => Promise<void>;
  cancelPendingUnsaved: () => void;
  openDocument: (filePath: string) => Promise<boolean>;
  saveDocument: () => Promise<boolean>;
  saveEntity: () => Promise<boolean>;
  patchEntityField: (key: string, value: unknown) => void;
  setEntityBody: (body: string) => void;
  reloadDocumentFromDisk: () => Promise<boolean>;
  requestExternalReload: () => void;
  confirmExternalReload: () => Promise<void>;
  dismissExternalReload: () => void;
  /** Tras renombrar/mover en explorador: mueve pestañas bajo la ruta (`fs-changed` rename). */
  remapTabPath: (fromPath: string, toPath: string) => void;
  /** Cierra pestañas cuyo archivo ya no existe en disco (sin diálogo). */
  closeTabsRemovedFromDisk: (removedPaths: string[]) => void;
  /** Recarga una pestaña manuscrito desde disco (activa o en segundo plano). */
  reloadTabFromDisk: (filePath: string) => Promise<boolean>;
  /** Recarga todas las pestañas manuscrito abiertas (p. ej. `kind: restore`). */
  reloadAllTabsFromDisk: () => Promise<void>;
  /** Reordena pestañas abiertas (índices en `tabOrder`). */
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  closeDocument: () => void;
  reset: () => void;
}

let extractManuscriptFn: ExtractManuscriptFn | null = null;
let insertInlineTagFn: InsertInlineTagFn | null = null;
let closeEventFn: CloseEventFn | null = null;
let expandEventFn: ExpandEventFn | null = null;
let commitEventFn: CommitEventFn | null = null;
let updateEventFn: UpdateEventFn | null = null;
let appendBarTimeFn: AppendBarTimeFn | null = null;
let removeEventFn: RemoveEventFn | null = null;
let removeEventEndFn: RemoveEventEndFn | null = null;

function manuscriptTabFields(manuscript: ParsedManuscript) {
  return {
    manuscript,
    document: manuscriptToParsedDocument(manuscript),
    savedBodyFingerprint: bodyFingerprintFromManuscript(manuscript),
  };
}

const emptyEditorView = {
  activeFilePath: null as string | null,
  activeTabKind: null as TabKind | null,
  manuscript: null as ParsedManuscript | null,
  document: null as ParsedDocument | null,
  entity: null as EntityTabState | null,
  documentSyncKey: 0,
  activeBlockIndex: 0,
  activeEventContext: emptyEventContext,
  savedBodyFingerprint: null as string | null,
  isDirty: false,
  saveStatus: "idle" as SaveStatus,
  metadataSaveStatus: "idle" as MetadataSaveStatus,
};

const initialState = {
  tabs: {} as Record<string, EditorTab>,
  tabOrder: [] as string[],
  ...emptyEditorView,
  isLoading: false,
  lastErrorKey: null as string | null,
  lastErrorDetails: null as string | null,
  labelCommitDepth: 0,
  autosaveSuppressUntil: 0,
  showUnsavedDialog: false,
  unsavedAction: "open" as UnsavedAction,
  pendingFilePath: null as string | null,
  showExternalReloadDialog: false,
};

function syncTabInMap(
  tabs: Record<string, EditorTab>,
  filePath: string,
  patch: Partial<EditorTab>,
): Record<string, EditorTab> {
  const tab = tabs[filePath];
  if (!tab) {
    return tabs;
  }
  return { ...tabs, [filePath]: { ...tab, ...patch } };
}

function flushActiveTabToCache(state: EditorState): {
  tabs: Record<string, EditorTab>;
  manuscript: ParsedManuscript | null;
  document: ParsedDocument | null;
  entity: EntityTabState | null;
} {
  const path = state.activeFilePath;
  if (!path) {
    return {
      tabs: state.tabs,
      manuscript: state.manuscript,
      document: state.document,
      entity: state.entity,
    };
  }

  if (state.activeTabKind === "entity" && state.entity) {
    const tabs = syncTabInMap(state.tabs, path, {
      entity: state.entity,
      isDirty: state.isDirty,
      saveStatus: state.saveStatus,
      documentSyncKey: state.documentSyncKey,
    });
    return {
      tabs,
      manuscript: state.manuscript,
      document: state.document,
      entity: state.entity,
    };
  }

  if (!state.manuscript) {
    return {
      tabs: state.tabs,
      manuscript: state.manuscript,
      document: state.document,
      entity: state.entity,
    };
  }

  const extracted = extractManuscriptFn?.();
  let manuscript = state.manuscript;
  if (extracted) {
    manuscript = applyExtractedManuscript(state.manuscript, extracted);
  }
  const document = manuscriptToParsedDocument(manuscript);

  const tabs = syncTabInMap(state.tabs, path, {
    manuscript,
    document,
    isDirty: state.isDirty,
    saveStatus: state.saveStatus,
    activeBlockIndex: state.activeBlockIndex,
    activeEventContext: state.activeEventContext,
    documentSyncKey: state.documentSyncKey,
    metadataSaveStatus: state.metadataSaveStatus,
  });

  return { tabs, manuscript, document, entity: state.entity };
}

function activeViewFromTab(tab: EditorTab) {
  const manuscript = tab.kind === "manuscript" ? (tab.manuscript ?? null) : null;
  const document =
    manuscript != null
      ? manuscriptToParsedDocument(manuscript)
      : (tab.document ?? null);
  return {
    activeFilePath: tab.filePath,
    activeTabKind: tab.kind,
    manuscript,
    document,
    entity: tab.kind === "entity" ? (tab.entity ?? null) : null,
    documentSyncKey: tab.documentSyncKey,
    activeBlockIndex: tab.activeBlockIndex,
    activeEventContext: tab.activeEventContext ?? emptyEventContext,
    savedBodyFingerprint: tab.savedBodyFingerprint,
    isDirty: tab.isDirty,
    saveStatus: tab.saveStatus,
    metadataSaveStatus: tab.metadataSaveStatus,
  };
}

function activateTabView(tab: EditorTab) {
  return activeViewFromTab(tab);
}

function syncManuscriptTabsClear(tabOrder: string[]): void {
  if (tabOrder.some(isPersistableManuscriptPath)) {
    return;
  }
  const root = useProjectStore.getState().activeProject?.rootPath;
  if (root) {
    clearManuscriptTabsSession(root);
  }
}

function entityTabFromDocument(
  doc: EntityDocument,
  template: EntityTemplate,
): EntityTabState {
  const frontmatter = { ...doc.frontmatter };
  const body = doc.body;
  return {
    templateId: doc.templateId,
    template,
    frontmatter,
    body,
    savedFingerprint: entityFingerprint(frontmatter, body),
  };
}

function markEntityDirty(
  state: EditorState,
  path: string,
  entity: EntityTabState,
): Partial<EditorState> {
  const fingerprint = entityFingerprint(entity.frontmatter, entity.body);
  const isDirty = fingerprint !== entity.savedFingerprint;
  return {
    entity,
    isDirty,
    saveStatus: isDirty ? "idle" : state.saveStatus,
    tabs: syncTabInMap(state.tabs, path, {
      entity,
      isDirty,
      saveStatus: isDirty ? "idle" : state.saveStatus,
    }),
  };
}

function patchSavedBaseline(
  state: EditorState,
  filePath: string,
  fingerprint: string,
): Partial<EditorState> {
  return {
    savedBodyFingerprint: fingerprint,
    isDirty: false,
    saveStatus: "saved",
    tabs: syncTabInMap(state.tabs, filePath, {
      savedBodyFingerprint: fingerprint,
      isDirty: false,
      saveStatus: "saved",
    }),
  };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  ...initialState,

  setExtractManuscriptFn: (fn) => {
    extractManuscriptFn = fn;
  },

  setInsertInlineTagFn: (fn) => {
    insertInlineTagFn = fn;
  },

  setCloseEventFn: (fn) => {
    closeEventFn = fn;
  },

  setExpandEventFn: (fn) => {
    expandEventFn = fn;
  },

  setCommitEventFn: (fn) => {
    commitEventFn = fn;
  },

  setUpdateEventFn: (fn) => {
    updateEventFn = fn;
  },

  setAppendBarTimeFn: (fn) => {
    appendBarTimeFn = fn;
  },

  setRemoveEventFn: (fn) => {
    removeEventFn = fn;
  },

  setRemoveEventEndFn: (fn) => {
    removeEventEndFn = fn;
  },

  reconcileManuscriptFromEditor: () => {
    const { activeFilePath, activeTabKind, manuscript } = get();
    if (!activeFilePath || activeTabKind === "entity" || !manuscript) {
      return false;
    }

    const extracted = extractManuscriptFn?.();
    if (!extracted) {
      return false;
    }

    const updated = applyExtractedManuscript(manuscript, extracted);
    const document = manuscriptToParsedDocument(updated);
    set((state) => ({
      manuscript: updated,
      document,
      isDirty: true,
      saveStatus: "idle",
      tabs: syncTabInMap(state.tabs, activeFilePath, {
        manuscript: updated,
        document,
        isDirty: true,
        saveStatus: "idle",
      }),
    }));
    return true;
  },

  setActiveEventContext: (context, legacyBlockIndex) => {
    const path = get().activeFilePath;
    set((state) => ({
      activeEventContext: context,
      activeBlockIndex: legacyBlockIndex,
      tabs: path
        ? syncTabInMap(state.tabs, path, {
            activeEventContext: context,
            activeBlockIndex: legacyBlockIndex,
          })
        : state.tabs,
    }));
  },

  insertInlineTagAtCursor: (tagType, value) =>
    insertInlineTagFn?.(tagType, value) ?? false,

  closeEventAtCursor: () => closeEventFn?.() ?? false,

  expandEventAtCursor: () => expandEventFn?.() ?? false,

  commitEventAtCursor: (params) => commitEventFn?.(params) ?? false,

  updateEventAtCursor: (params) => updateEventFn?.(params) ?? false,

  appendBarTimeToActiveEvent: (timeTag, hour) =>
    appendBarTimeFn?.(timeTag, hour) ?? false,

  removeEventFromEditor: (segmentId) => removeEventFn?.(segmentId) ?? false,

  removeEventEndFromEditor: (segmentId) => removeEventEndFn?.(segmentId) ?? false,

  setActiveBlockIndex: (index) => {
    const path = get().activeFilePath;
    set((state) => ({
      activeBlockIndex: index,
      tabs: path
        ? syncTabInMap(state.tabs, path, { activeBlockIndex: index })
        : state.tabs,
    }));
  },

  beginLabelCommit: () => {
    const depth = get().labelCommitDepth + 1;
    set({
      labelCommitDepth: depth,
      autosaveSuppressUntil: Date.now() + 120_000,
    });
  },

  endLabelCommit: () => {
    set((state) => ({
      labelCommitDepth: Math.max(0, state.labelCommitDepth - 1),
    }));
  },

  markDirty: () => {
    const { isDirty, saveStatus, activeFilePath, savedBodyFingerprint } = get();
    if (extractManuscriptFn && savedBodyFingerprint) {
      const extracted = extractManuscriptFn();
      if (
        extracted &&
        bodyFingerprintFromExtractedManuscript(
          extracted.fileHeader.body,
          extracted.segments,
        ) === savedBodyFingerprint
      ) {
        return;
      }
    }
    if (!isDirty || saveStatus === "saved") {
      set((state) => ({
        isDirty: true,
        saveStatus: "idle",
        tabs: activeFilePath
          ? syncTabInMap(state.tabs, activeFilePath, {
              isDirty: true,
              saveStatus: "idle",
            })
          : state.tabs,
      }));
    }
  },

  commitSavedBaseline: (fingerprint) => {
    const path = get().activeFilePath;
    if (!path) {
      return;
    }
    set((state) => patchSavedBaseline(state, path, fingerprint));
  },

  requestOpenDocument: async (filePath) => {
    const { tabs } = get();
    if (tabs[filePath]) {
      await get().switchTab(filePath);
      return;
    }
    await get().openDocument(filePath);
  },

  navigateToDocument: async (filePath) => {
    const state = get();
    if (state.activeFilePath === filePath) {
      return;
    }

    const { tabs } = flushActiveTabToCache(state);
    const target = tabs[filePath];

    if (target) {
      extractManuscriptFn = null;
      beginEditorSession();
      set({
        tabs,
        ...activateTabView(target),
      });
      return;
    }

    set({ tabs });
    await get().openDocument(filePath);
  },

  switchTab: async (filePath) => {
    const state = get();
    if (state.activeFilePath === filePath) {
      return;
    }
    const fromPath = state.activeFilePath;
    if (state.tabs[filePath]) {
      const flushed = flushActiveTabToCache(state);
      const tab = flushed.tabs[filePath];
      if (!tab) {
        return;
      }

      extractManuscriptFn = null;
      beginEditorSession();
      set({
        tabs: flushed.tabs,
        ...activateTabView(tab),
      });
      audit.info("editor", "obs.editor.tab.switch", { from: fromPath, to: filePath });
      return;
    }
    await get().openDocument(filePath);
  },

  confirmDiscardUnsaved: async () => {
    const { unsavedAction, pendingFilePath, activeFilePath, tabs, tabOrder, isDirty } =
      get();
    set({ showUnsavedDialog: false });

    if (unsavedAction === "open" && pendingFilePath) {
      let nextTabs = tabs;
      if (activeFilePath && isDirty) {
        const tab = tabs[activeFilePath];
        try {
          if (tab?.kind === "entity") {
            const entityDoc = await invokeCommand<EntityDocument>("read_entity", {
              filePath: activeFilePath,
            });
            const template = await invokeCommand<EntityTemplate>(
              "get_entity_template",
              {
                templateId: entityDoc.templateId,
              },
            );
            const entityState = entityTabFromDocument(entityDoc, template);
            nextTabs = syncTabInMap(tabs, activeFilePath, {
              entity: entityState,
              savedBodyFingerprint: entityState.savedFingerprint,
              isDirty: false,
              saveStatus: "saved",
            });
          } else {
            const manuscript = await invokeCommand<ParsedManuscript>(
              "read_manuscript",
              { filePath: activeFilePath },
            );
            nextTabs = syncTabInMap(tabs, activeFilePath, {
              ...manuscriptTabFields(manuscript),
              isDirty: false,
              saveStatus: "saved",
            });
          }
        } catch {
          nextTabs = syncTabInMap(tabs, activeFilePath, {
            isDirty: false,
            saveStatus: "saved",
          });
        }
      }
      set({ tabs: nextTabs, pendingFilePath: null, isDirty: false });
      extractManuscriptFn = null;
      if (nextTabs[pendingFilePath]) {
        const tab = nextTabs[pendingFilePath];
        beginEditorSession();
        set({ ...activateTabView(tab) });
      } else {
        await get().openDocument(pendingFilePath);
      }
      return;
    }

    if (unsavedAction === "close" && pendingFilePath) {
      const path = pendingFilePath;
      const nextTabs = { ...tabs };
      delete nextTabs[path];
      const nextOrder = tabOrder.filter((p) => p !== path);
      const wasActive = activeFilePath === path;

      if (!wasActive) {
        set({ tabs: nextTabs, tabOrder: nextOrder, pendingFilePath: null });
        syncManuscriptTabsClear(nextOrder);
        return;
      }

      const nextActive = nextOrder[nextOrder.length - 1] ?? null;
      extractManuscriptFn = null;
      if (!nextActive) {
        set({
          tabs: nextTabs,
          tabOrder: nextOrder,
          pendingFilePath: null,
          ...emptyEditorView,
        });
        syncManuscriptTabsClear(nextOrder);
        return;
      }

      const tab = nextTabs[nextActive];
      beginEditorSession();
      set({
        tabs: nextTabs,
        tabOrder: nextOrder,
        pendingFilePath: null,
        ...activateTabView(tab),
      });
      syncManuscriptTabsClear(nextOrder);
    }
  },

  cancelPendingUnsaved: () =>
    set({ showUnsavedDialog: false, pendingFilePath: null, unsavedAction: "open" }),

  openDocument: async (filePath) => {
    if (!filePath.toLowerCase().endsWith(".md")) {
      set({ lastErrorKey: "error.not_md" });
      return false;
    }

    const existing = get().tabs[filePath];
    if (existing) {
      const flushed = flushActiveTabToCache(get());
      const tab: EditorTab = existing.kind
        ? existing
        : {
            ...existing,
            kind: isEntityPath(filePath) ? "entity" : "manuscript",
          };
      beginEditorSession();
      extractManuscriptFn = tab.kind === "entity" ? null : extractManuscriptFn;
      set({
        tabs: { ...flushed.tabs, [filePath]: tab },
        ...activateTabView(tab),
      });
      audit.info("editor", "obs.editor.tab.open", {
        path: filePath,
        kind: tab.kind,
        existing: true,
      });
      return true;
    }

    const flushedBeforeOpen = flushActiveTabToCache(get());
    set({ isLoading: true, lastErrorKey: null });
    try {
      if (isEntityPath(filePath)) {
        const entityDoc = await invokeCommand<EntityDocument>("read_entity", {
          filePath,
        });
        const template = await invokeCommand<EntityTemplate>("get_entity_template", {
          templateId: entityDoc.templateId,
        });
        const entityState = entityTabFromDocument(entityDoc, template);
        const tab: EditorTab = {
          filePath,
          kind: "entity",
          entity: entityState,
          savedBodyFingerprint: entityState.savedFingerprint,
          isDirty: false,
          saveStatus: "saved",
          activeBlockIndex: 0,
          activeEventContext: emptyEventContext,
          documentSyncKey: 0,
          metadataSaveStatus: "idle",
        };

        beginEditorSession();
        extractManuscriptFn = null;
        set((state) => ({
          tabs: { ...flushedBeforeOpen.tabs, [filePath]: tab },
          tabOrder: state.tabOrder.includes(filePath)
            ? state.tabOrder
            : [...state.tabOrder, filePath],
          isLoading: false,
          showExternalReloadDialog: false,
          ...activateTabView(tab),
        }));
        audit.info("editor", "obs.editor.tab.open", {
          path: filePath,
          kind: "entity",
          existing: false,
        });
        return true;
      }

      const manuscript = await invokeCommand<ParsedManuscript>("read_manuscript", {
        filePath,
      });
      const fields = manuscriptTabFields(manuscript);
      const tab: EditorTab = {
        filePath,
        kind: "manuscript",
        ...fields,
        isDirty: false,
        saveStatus: "saved",
        activeBlockIndex: 0,
        activeEventContext: emptyEventContext,
        documentSyncKey: 0,
        metadataSaveStatus: "idle",
      };

      beginEditorSession();
      set((state) => ({
        tabs: { ...flushedBeforeOpen.tabs, [filePath]: tab },
        tabOrder: state.tabOrder.includes(filePath)
          ? state.tabOrder
          : [...state.tabOrder, filePath],
        isLoading: false,
        showExternalReloadDialog: false,
        ...activateTabView(tab),
      }));
      audit.info("editor", "obs.editor.tab.open", {
        path: filePath,
        kind: "manuscript",
        existing: false,
      });
      return true;
    } catch (err) {
      set({
        lastErrorKey: parseAppError(err)?.key ?? "error.open_failed",
        isLoading: false,
      });
      return false;
    }
  },

  patchEntityField: (key, value) => {
    const path = get().activeFilePath;
    const entity = get().entity;
    if (!path || !entity || get().activeTabKind !== "entity") {
      return;
    }
    const next: EntityTabState = {
      ...entity,
      frontmatter: { ...entity.frontmatter, [key]: value },
    };
    set((state) => markEntityDirty(state, path, next));
  },

  setEntityBody: (body) => {
    const path = get().activeFilePath;
    const entity = get().entity;
    if (!path || !entity || get().activeTabKind !== "entity") {
      return;
    }
    const next: EntityTabState = { ...entity, body };
    set((state) => markEntityDirty(state, path, next));
  },

  saveEntity: async () => {
    const { activeFilePath, entity, isDirty, activeTabKind } = get();
    if (!activeFilePath || !entity || activeTabKind !== "entity" || !isDirty) {
      return true;
    }

    set({ saveStatus: "saving", lastErrorKey: null });
    try {
      const saved = await invokeCommand<EntityDocument>("save_entity", {
        filePath: activeFilePath,
        payload: {
          frontmatter: entity.frontmatter,
          body: entity.body,
        },
      });
      const template = entity.template;
      const nextEntity = entityTabFromDocument(saved, template);
      const fingerprint = nextEntity.savedFingerprint;
      set((state) => ({
        entity: nextEntity,
        documentSyncKey: state.documentSyncKey + 1,
        ...patchSavedBaseline(state, activeFilePath, fingerprint),
        tabs: syncTabInMap(state.tabs, activeFilePath, {
          entity: { ...nextEntity, savedFingerprint: fingerprint },
          savedBodyFingerprint: fingerprint,
          isDirty: false,
          saveStatus: "saved",
          documentSyncKey: state.documentSyncKey + 1,
        }),
      }));
      return true;
    } catch (err) {
      set({
        lastErrorKey: parseAppError(err)?.key ?? "error.entity.save_failed",
        saveStatus: "error",
      });
      return false;
    }
  },

  saveDocument: async () => {
    const { activeFilePath, activeTabKind, manuscript, isDirty } = get();
    if (activeTabKind === "entity") {
      audit.beginCorrelation(`save-${Date.now()}`);
      audit.info("editor", "obs.editor.save.start", {
        path: activeFilePath,
        kind: "entity",
      });
      const ok = await get().saveEntity();
      audit.info("editor", "obs.editor.save.end", {
        path: activeFilePath,
        kind: "entity",
        ok,
      });
      audit.endCorrelation();
      return ok;
    }
    if (!activeFilePath || !manuscript || !isDirty) {
      return true;
    }

    const extracted = extractManuscriptFn?.();
    if (!extracted) {
      console.error("[save_manuscript] extract unavailable — editor no registró extracción");
      set({
        lastErrorKey: "error.save_failed",
        lastErrorDetails: "extract_unavailable",
      });
      return false;
    }

    audit.beginCorrelation(`save-${Date.now()}`);
    audit.info("editor", "obs.editor.save.start", {
      path: activeFilePath,
      kind: "manuscript",
      segmentCount: extracted.segments.length,
    });

    set({ saveStatus: "saving", lastErrorKey: null, lastErrorDetails: null });
    try {
      markSelfSave(activeFilePath);
      const saved = await invokeCommand<ParsedManuscript>("save_manuscript", {
        filePath: activeFilePath,
        manuscript: {
          fileHeader: extracted.fileHeader,
          segments: extracted.segments,
        },
      });
      const fields = manuscriptTabFields(saved);
      const fingerprint = fields.savedBodyFingerprint;
      set((state) => ({
        manuscript: saved,
        document: fields.document,
        ...patchSavedBaseline(state, activeFilePath, fingerprint),
        tabs: syncTabInMap(state.tabs, activeFilePath, {
          ...fields,
          isDirty: false,
          saveStatus: "saved",
        }),
      }));
      audit.info("editor", "obs.editor.save.end", {
        path: activeFilePath,
        kind: "manuscript",
        ok: true,
      });
      audit.endCorrelation();
      return true;
    } catch (err) {
      const parsed = parseAppError(err);
      if (parsed?.details) {
        console.error("[save_manuscript]", parsed.key, parsed.details);
      } else {
        console.error("[save_manuscript]", err);
      }
      set({
        lastErrorKey: parsed?.key ?? "error.save_failed",
        lastErrorDetails: parsed?.details ?? null,
        saveStatus: "error",
      });
      audit.info("editor", "obs.editor.save.end", {
        path: activeFilePath,
        kind: "manuscript",
        ok: false,
        errorKey: parsed?.key,
      });
      audit.endCorrelation();
      return false;
    }
  },

  reloadDocumentFromDisk: async () => {
    const { activeFilePath } = get();
    if (!activeFilePath) {
      return false;
    }

    audit.info("editor", "obs.editor.reload", { path: activeFilePath });

    set({ isLoading: true, lastErrorKey: null });
    try {
      const manuscript = await invokeCommand<ParsedManuscript>("read_manuscript", {
        filePath: activeFilePath,
      });
      beginEditorSession();
      const fields = manuscriptTabFields(manuscript);
      set((state) => {
        const documentSyncKey = state.documentSyncKey + 1;
        return {
          manuscript,
          document: fields.document,
          isLoading: false,
          metadataSaveStatus: "idle",
          showExternalReloadDialog: false,
          documentSyncKey,
          ...patchSavedBaseline(state, activeFilePath, fields.savedBodyFingerprint),
          tabs: syncTabInMap(state.tabs, activeFilePath, {
            ...fields,
            isDirty: false,
            saveStatus: "saved",
            metadataSaveStatus: "idle",
            documentSyncKey,
          }),
        };
      });
      return true;
    } catch (err) {
      set({
        lastErrorKey: parseAppError(err)?.key ?? "error.open_failed",
        isLoading: false,
      });
      return false;
    }
  },

  requestExternalReload: () => {
    audit.info("editor", "obs.editor.reload.dialog", {
      path: get().activeFilePath,
    });
    set({ showExternalReloadDialog: true });
  },

  confirmExternalReload: async () => {
    set({ showExternalReloadDialog: false, isDirty: false });
    await get().reloadDocumentFromDisk();
  },

  dismissExternalReload: () => set({ showExternalReloadDialog: false }),

  reorderTabs: (fromIndex, toIndex) => {
    set((state) => {
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= state.tabOrder.length ||
        toIndex >= state.tabOrder.length ||
        fromIndex === toIndex
      ) {
        return state;
      }
      const tabOrder = [...state.tabOrder];
      const [moved] = tabOrder.splice(fromIndex, 1);
      tabOrder.splice(toIndex, 0, moved);
      return { tabOrder };
    });
  },

  remapTabPath: (fromPath, toPath) => {
    if (fromPath === toPath) {
      return;
    }
    set((state) => {
      const tabs = { ...state.tabs };
      let changed = false;

      for (const tabPath of Object.keys(tabs)) {
        const nextPath = remapPathForRename(tabPath, fromPath, toPath);
        if (!nextPath || nextPath === tabPath) {
          continue;
        }
        const tab = tabs[tabPath];
        delete tabs[tabPath];
        tabs[nextPath] = { ...tab, filePath: nextPath };
        changed = true;
      }

      if (!changed) {
        return state;
      }

      const tabOrder = state.tabOrder.map((p) => {
        const next = remapPathForRename(p, fromPath, toPath);
        return next ?? p;
      });
      const activeFilePath = state.activeFilePath
        ? (remapPathForRename(state.activeFilePath, fromPath, toPath) ??
          state.activeFilePath)
        : null;

      return { tabs, tabOrder, activeFilePath };
    });
  },

  closeTabsRemovedFromDisk: (removedPaths) => {
    const toClose = tabPathsToCloseOnRemove(
      removedPaths,
      useEditorStore.getState().tabOrder,
    );
    for (const path of toClose) {
      const nextTabs = { ...useEditorStore.getState().tabs };
      delete nextTabs[path];
      const nextOrder = useEditorStore.getState().tabOrder.filter((p) => p !== path);
      const wasActive = useEditorStore.getState().activeFilePath === path;
      const nextActive = wasActive ? (nextOrder[nextOrder.length - 1] ?? null) : null;

      audit.info("editor", "obs.editor.tab.close", {
        path,
        reason: "fs-remove",
        wasActive,
        nextActive: wasActive ? nextActive : useEditorStore.getState().activeFilePath,
        removedPaths,
      });

      if (!wasActive) {
        useEditorStore.setState({ tabs: nextTabs, tabOrder: nextOrder });
        syncManuscriptTabsClear(nextOrder);
        continue;
      }

      if (!nextActive) {
        extractManuscriptFn = null;
        useEditorStore.setState({
          tabs: nextTabs,
          tabOrder: nextOrder,
          ...emptyEditorView,
        });
        syncManuscriptTabsClear(nextOrder);
        continue;
      }

      const nextTab = nextTabs[nextActive];
      extractManuscriptFn = null;
      beginEditorSession();
      useEditorStore.setState({
        tabs: nextTabs,
        tabOrder: nextOrder,
        ...activateTabView(nextTab),
      });
      syncManuscriptTabsClear(nextOrder);
    }
  },

  reloadTabFromDisk: async (filePath) => {
    const tab = get().tabs[filePath];
    if (!tab || tab.kind === "entity") {
      return false;
    }

    try {
      const manuscript = await invokeCommand<ParsedManuscript>("read_manuscript", {
        filePath,
      });
      const fields = manuscriptTabFields(manuscript);
      const fingerprint = bodyFingerprintFromManuscript(manuscript);
      const isActive = get().activeFilePath === filePath;

      set((state) => {
        const documentSyncKey = isActive
          ? state.documentSyncKey + 1
          : state.documentSyncKey;
        const nextTabs = syncTabInMap(state.tabs, filePath, {
          ...fields,
          savedBodyFingerprint: fingerprint,
          isDirty: false,
          saveStatus: "saved",
          metadataSaveStatus: "idle",
          documentSyncKey: isActive
            ? documentSyncKey
            : (state.tabs[filePath]?.documentSyncKey ?? documentSyncKey),
        });

        if (!isActive) {
          return { tabs: nextTabs };
        }

        beginEditorSession();
        return {
          tabs: nextTabs,
          manuscript,
          document: fields.document,
          isLoading: false,
          metadataSaveStatus: "idle",
          showExternalReloadDialog: false,
          documentSyncKey,
          ...patchSavedBaseline(state, filePath, fingerprint),
        };
      });
      return true;
    } catch {
      return false;
    }
  },

  reloadAllTabsFromDisk: async () => {
    const paths = get().tabOrder.filter((path) => get().tabs[path]?.kind !== "entity");
    for (const path of paths) {
      await get().reloadTabFromDisk(path);
    }
    set({ showExternalReloadDialog: false, isDirty: false });
  },

  closeDocument: () => {
    extractManuscriptFn = null;
    set({ ...initialState });
  },

  reset: () => {
    extractManuscriptFn = null;
    set({ ...initialState });
  },
}));

/** Cierra una pestaña (con diálogo si hay cambios sin guardar). */
export function requestCloseEditorTab(filePath: string): void {
  const state = useEditorStore.getState();
  const tab = state.tabs[filePath];
  if (!tab) {
    return;
  }

  if (tab.isDirty) {
    audit.info("editor", "obs.editor.unsaved.dialog", {
      action: "close",
      path: filePath,
    });
    useEditorStore.setState({
      showUnsavedDialog: true,
      unsavedAction: "close",
      pendingFilePath: filePath,
    });
    return;
  }

  const nextTabs = { ...state.tabs };
  delete nextTabs[filePath];
  const nextOrder = state.tabOrder.filter((p) => p !== filePath);
  const wasActive = state.activeFilePath === filePath;

  if (!wasActive) {
    useEditorStore.setState({ tabs: nextTabs, tabOrder: nextOrder });
    syncManuscriptTabsClear(nextOrder);
    return;
  }

  const nextActive = nextOrder[nextOrder.length - 1] ?? null;
  if (!nextActive) {
    extractManuscriptFn = null;
    useEditorStore.setState({
      tabs: nextTabs,
      tabOrder: nextOrder,
      ...emptyEditorView,
    });
    syncManuscriptTabsClear(nextOrder);
    return;
  }

  const nextTab = nextTabs[nextActive];
  extractManuscriptFn = null;
  beginEditorSession();
  useEditorStore.setState({
    tabs: nextTabs,
    tabOrder: nextOrder,
    ...activateTabView(nextTab),
  });
  syncManuscriptTabsClear(nextOrder);
}

/** Guarda todas las pestañas con cambios y vuelve a la pestaña activa original. */
export async function saveAllOpenTabs(): Promise<boolean> {
  return audit.withCorrelationAsync(`save-all-${Date.now()}`, async () => {
    const initialActivePath = useEditorStore.getState().activeFilePath;
    const dirtyPaths = useEditorStore
      .getState()
      .tabOrder.filter((path) => useEditorStore.getState().tabs[path]?.isDirty);

    if (dirtyPaths.length === 0) {
      return true;
    }

    audit.info("editor", "obs.editor.saveAll.start", {
      dirtyPaths,
      activePath: initialActivePath,
    });

    let allSaved = true;

    for (const path of dirtyPaths) {
      const stateBefore = useEditorStore.getState();
      const tab = stateBefore.tabs[path];
      if (!tab || !tab.isDirty) {
        continue;
      }

      if (stateBefore.activeFilePath !== path) {
        await stateBefore.switchTab(path);
      }

      const stateAfterSwitch = useEditorStore.getState();
      const activeTab = stateAfterSwitch.tabs[path];
      if (!activeTab || !activeTab.isDirty) {
        continue;
      }

      const saved =
        activeTab.kind === "entity"
          ? await stateAfterSwitch.saveEntity()
          : await stateAfterSwitch.saveDocument();

      if (!saved) {
        allSaved = false;
      }
    }

    if (
      initialActivePath &&
      useEditorStore.getState().activeFilePath !== initialActivePath &&
      useEditorStore.getState().tabs[initialActivePath]
    ) {
      await useEditorStore.getState().switchTab(initialActivePath);
    }

    audit.info("editor", "obs.editor.saveAll.end", {
      ok: allSaved,
      activePath: useEditorStore.getState().activeFilePath,
      dirtyPaths,
    });

    return allSaved;
  });
}
