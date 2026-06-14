import { create } from "zustand";

import {
  applyExtractedManuscript,
  assertCacheSaveable,
  bodyFingerprintFromExtractedManuscript,
  bodyFingerprintFromManuscript,
  manuscriptToSavePayload,
  type ActiveEventContext,
  type ExtractedManuscriptPayload,
} from "@/lib/editor/documentSync";
import { beginEditorSession } from "@/lib/editor/editorSyncGuard";
import {
  clearManuscriptTabsSession,
  isPersistableManuscriptPath,
  type ManuscriptTabDraft,
  type ManuscriptTabsSession,
} from "@/lib/editor/lastManuscriptFile";
import {
  beginSaveBatch,
  endSaveBatch,
  entityPathsFromSegments,
  isSaveBatchInProgress,
  markSelfSave,
  markSelfSavePaths,
  remapPathForRename,
  shouldIgnoreFsReload,
  tabPathsToCloseOnRemove,
} from "@/lib/editor/fsSync";
import { manuscriptToParsedDocument } from "@/lib/editor/manuscriptBlocks";
import { reconciledKeysFromManuscript } from "@/lib/calendar/timeTagReconcile";
import { audit } from "@/lib/audit";
import { trackAction } from "@/lib/action-audit/trackAction";
import { invokeCommand, parseAppError } from "@/lib/ipc";
import { normalizeProjectPath, projectPathsEqual } from "@/lib/pathUtils";
import type { EntityDocument, EntityTabState } from "@/lib/types/entity";
import type { EntityTemplate } from "@/lib/types/entityTemplate";
import type { ParsedDocument } from "@/lib/types/editor";
import type { BarTag, ParsedManuscript } from "@/lib/types/manuscript";
import { entityFingerprint } from "@/lib/worldbuilding/entityFingerprint";
import { isEntityPath } from "@/lib/worldbuilding/entityPath";
import { useFileTreeStore } from "@/stores/useFileTreeStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useProjectTimelineStore } from "@/stores/useProjectTimelineStore";

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
type UpdateInlineTimeTagFn = (nodeKey: string, value: string) => boolean;
type UpdateBarTimeTagFn = (
  segmentId: string,
  tagIndex: number,
  timeTag: string,
  hour?: number | null,
) => boolean;
type RemoveEventFn = (segmentId: string) => boolean;
type RemoveEventEndFn = (segmentId: string) => boolean;

type UnsavedAction = "open" | "close";

interface SaveAtPathOptions {
  batch?: boolean;
}

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
  /** Resaltado inline disco vs borrador en Lexical (FIX-013). */
  dirtyDiffVisible: boolean;
  /** Incrementa tras guardar — el plugin refresca baseline / limpia estilos. */
  dirtyDiffBaselineVersion: number;
  /** Snapshot post-guardado para refrescar diff sin releer disco. */
  dirtyDiffSavedBaseline: ParsedManuscript | null;
  reconciledTimeTagKeys: Set<string>;

  setExtractManuscriptFn: (fn: ExtractManuscriptFn | null) => void;
  setInsertInlineTagFn: (fn: InsertInlineTagFn | null) => void;
  setCloseEventFn: (fn: CloseEventFn | null) => void;
  setExpandEventFn: (fn: ExpandEventFn | null) => void;
  setCommitEventFn: (fn: CommitEventFn | null) => void;
  setUpdateEventFn: (fn: UpdateEventFn | null) => void;
  setAppendBarTimeFn: (fn: AppendBarTimeFn | null) => void;
  setUpdateInlineTimeTagFn: (fn: UpdateInlineTimeTagFn | null) => void;
  setUpdateBarTimeTagFn: (fn: UpdateBarTimeTagFn | null) => void;
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
  updateInlineTimeTagAt: (nodeKey: string, value: string) => boolean;
  updateBarTimeTagAt: (
    segmentId: string,
    tagIndex: number,
    timeTag: string,
    hour?: number | null,
  ) => boolean;
  markTimeTagCalendarReconciled: (...keys: string[]) => void;
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
  saveManuscriptAtPath: (
    filePath: string,
    manuscript: ParsedManuscript,
    options?: SaveAtPathOptions,
  ) => Promise<boolean>;
  saveEntityAtPath: (
    filePath: string,
    entity: EntityTabState,
    options?: SaveAtPathOptions,
  ) => Promise<boolean>;
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
  /** Snapshot para localStorage: pestañas + borradores sucios (FIX-007). */
  getManuscriptSessionSnapshot: () => ManuscriptTabsSession | null;
  /** Restaura borrador sucio sobre pestaña ya abierta desde disco. */
  applyPersistedTabDraft: (filePath: string, draft: ManuscriptTabDraft) => void;
  /** Flush Lexical → caché y devuelve manuscrito activo para diff (FIX-013). */
  prepareActiveManuscriptDraftForDiff: () => ParsedManuscript | null;
  toggleDirtyDiffHighlight: () => void;
  clearDirtyDiffHighlight: () => void;
}

let extractManuscriptFn: ExtractManuscriptFn | null = null;
let insertInlineTagFn: InsertInlineTagFn | null = null;
let closeEventFn: CloseEventFn | null = null;
let expandEventFn: ExpandEventFn | null = null;
let commitEventFn: CommitEventFn | null = null;
let updateEventFn: UpdateEventFn | null = null;
let appendBarTimeFn: AppendBarTimeFn | null = null;
let updateInlineTimeTagFn: UpdateInlineTimeTagFn | null = null;
let updateBarTimeTagFn: UpdateBarTimeTagFn | null = null;
let removeEventFn: RemoveEventFn | null = null;
let removeEventEndFn: RemoveEventEndFn | null = null;

function manuscriptTabFields(manuscript: ParsedManuscript) {
  return {
    manuscript,
    document: manuscriptToParsedDocument(manuscript),
    savedBodyFingerprint: bodyFingerprintFromManuscript(manuscript),
  };
}

function mergeReconciledKeysFromManuscript(
  existing: Set<string>,
  manuscript: ParsedManuscript | null | undefined,
): Set<string> {
  if (!manuscript) {
    return existing;
  }
  const keys = reconciledKeysFromManuscript(manuscript);
  if (keys.length === 0) {
    return existing;
  }
  const next = new Set(existing);
  for (const key of keys) {
    next.add(key);
  }
  return next;
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
  reconciledTimeTagKeys: new Set<string>(),
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
  dirtyDiffVisible: false,
  dirtyDiffBaselineVersion: 0,
  dirtyDiffSavedBaseline: null as ParsedManuscript | null,
  reconciledTimeTagKeys: new Set<string>(),
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

function activateTabView(tab: EditorTab, reconciledTimeTagKeys: Set<string>) {
  const view = activeViewFromTab(tab);
  if (tab.kind === "manuscript" && tab.manuscript) {
    return {
      ...view,
      reconciledTimeTagKeys: mergeReconciledKeysFromManuscript(
        reconciledTimeTagKeys,
        tab.manuscript,
      ),
    };
  }
  return view;
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
  options?: SaveAtPathOptions,
): Partial<EditorState> {
  const tabs = syncTabInMap(state.tabs, filePath, {
    savedBodyFingerprint: fingerprint,
    isDirty: false,
    saveStatus: "saved",
  });
  if (!projectPathsEqual(state.activeFilePath, filePath)) {
    return { tabs };
  }
  const patch: Partial<EditorState> = {
    tabs,
    savedBodyFingerprint: fingerprint,
    isDirty: false,
    dirtyDiffBaselineVersion: state.dirtyDiffBaselineVersion + 1,
  };
  if (!options?.batch) {
    patch.saveStatus = "saved";
  }
  return patch;
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

  setUpdateInlineTimeTagFn: (fn) => {
    updateInlineTimeTagFn = fn;
  },

  setUpdateBarTimeTagFn: (fn) => {
    updateBarTimeTagFn = fn;
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
      reconciledTimeTagKeys: mergeReconciledKeysFromManuscript(
        state.reconciledTimeTagKeys,
        updated,
      ),
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

  updateInlineTimeTagAt: (nodeKey, value) =>
    updateInlineTimeTagFn?.(nodeKey, value) ?? false,

  updateBarTimeTagAt: (segmentId, tagIndex, timeTag, hour) =>
    updateBarTimeTagFn?.(segmentId, tagIndex, timeTag, hour) ?? false,

  markTimeTagCalendarReconciled: (...keys) => {
    set((state) => {
      const toAdd = keys.filter((key) => !state.reconciledTimeTagKeys.has(key));
      if (toAdd.length === 0) {
        return state;
      }
      const reconciledTimeTagKeys = new Set(state.reconciledTimeTagKeys);
      for (const key of toAdd) {
        reconciledTimeTagKeys.add(key);
      }
      return { reconciledTimeTagKeys };
    });
  },

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
        ...activateTabView(target, state.reconciledTimeTagKeys),
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
        dirtyDiffVisible: false,
        dirtyDiffSavedBaseline: null,
        ...activateTabView(tab, state.reconciledTimeTagKeys),
      });
      audit.info("editor", "obs.editor.tab.switch", { from: fromPath, to: filePath });
      trackAction("editor", "tabSwitch", { from: fromPath, to: filePath });
      return;
    }
    await get().openDocument(filePath);
  },

  confirmDiscardUnsaved: async () => {
    const { unsavedAction, pendingFilePath, activeFilePath, tabs, tabOrder, isDirty } =
      get();
    trackAction("editor", "unsavedDialog", {
      action: unsavedAction,
      path: pendingFilePath ?? activeFilePath,
      choice: "discard",
    });
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
        set({ ...activateTabView(tab, get().reconciledTimeTagKeys) });
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
        ...activateTabView(tab, get().reconciledTimeTagKeys),
      });
      syncManuscriptTabsClear(nextOrder);
    }
  },

  cancelPendingUnsaved: () => {
    const { unsavedAction, pendingFilePath, activeFilePath } = get();
    trackAction("editor", "unsavedDialog", {
      action: unsavedAction,
      path: pendingFilePath ?? activeFilePath,
      choice: "cancel",
    });
    set({ showUnsavedDialog: false, pendingFilePath: null, unsavedAction: "open" });
  },

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
        ...activateTabView(tab, get().reconciledTimeTagKeys),
      });
      audit.info("editor", "obs.editor.tab.open", {
        path: filePath,
        kind: tab.kind,
        existing: true,
      });
      trackAction("editor", "tabOpen", {
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
          ...activateTabView(tab, state.reconciledTimeTagKeys),
        }));
        audit.info("editor", "obs.editor.tab.open", {
          path: filePath,
          kind: "entity",
          existing: false,
        });
        trackAction("editor", "tabOpen", {
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
        ...activateTabView(tab, state.reconciledTimeTagKeys),
      }));
      audit.info("editor", "obs.editor.tab.open", {
        path: filePath,
        kind: "manuscript",
        existing: false,
      });
      trackAction("editor", "tabOpen", {
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

  saveEntityAtPath: async (filePath, entity, options = {}) => {
    const tab = get().tabs[filePath];
    if (!tab || tab.kind !== "entity") {
      return false;
    }
    if (!tab.isDirty) {
      return true;
    }

    if (!options.batch) {
      set({ saveStatus: "saving", lastErrorKey: null });
    }

    markSelfSave(filePath);
    try {
      const saved = await invokeCommand<EntityDocument>("save_entity", {
        filePath,
        payload: {
          frontmatter: entity.frontmatter,
          body: entity.body,
        },
      });
      const nextEntity = entityTabFromDocument(saved, entity.template);
      const fingerprint = nextEntity.savedFingerprint;
      const isActive = projectPathsEqual(get().activeFilePath, filePath);

      set((state) => {
        const documentSyncKey = isActive ? state.documentSyncKey + 1 : tab.documentSyncKey;
        const nextTabs = syncTabInMap(state.tabs, filePath, {
          entity: { ...nextEntity, savedFingerprint: fingerprint },
          savedBodyFingerprint: fingerprint,
          isDirty: false,
          saveStatus: "saved",
          documentSyncKey,
        });
        if (!isActive) {
          return { tabs: nextTabs };
        }
        const patch: Partial<EditorState> = {
          tabs: nextTabs,
          entity: nextEntity,
          documentSyncKey,
          savedBodyFingerprint: fingerprint,
          isDirty: false,
        };
        if (!options.batch) {
          patch.saveStatus = "saved";
        }
        return patch;
      });
      return true;
    } catch (err) {
      if (!options.batch) {
        set({
          lastErrorKey: parseAppError(err)?.key ?? "error.entity.save_failed",
          saveStatus: "error",
        });
      }
      return false;
    }
  },

  saveEntity: async () => {
    const { activeFilePath, entity, isDirty, activeTabKind } = get();
    if (!activeFilePath || !entity || activeTabKind !== "entity" || !isDirty) {
      return true;
    }
    return get().saveEntityAtPath(activeFilePath, entity);
  },

  saveManuscriptAtPath: async (filePath, manuscript, options = {}) => {
    const tab = get().tabs[filePath];
    if (!tab || tab.kind === "entity") {
      return false;
    }
    if (!tab.isDirty) {
      return true;
    }

    if (!options.batch) {
      set({ saveStatus: "saving", lastErrorKey: null, lastErrorDetails: null });
    }

    markSelfSavePaths([
      filePath,
      ...entityPathsFromSegments(manuscript.segments),
    ]);

    try {
      const saved = await invokeCommand<ParsedManuscript>("save_manuscript", {
        filePath,
        manuscript: manuscriptToSavePayload(manuscript),
      });
      const fields = manuscriptTabFields(saved);
      const fingerprint = fields.savedBodyFingerprint;
      const isActive = projectPathsEqual(get().activeFilePath, filePath);

      set((state) => {
        const nextTabs = syncTabInMap(state.tabs, filePath, {
          ...fields,
          isDirty: false,
          saveStatus: "saved",
        });
        if (!isActive) {
          return { tabs: nextTabs };
        }
        return {
          ...patchSavedBaseline(state, filePath, fingerprint, options),
          tabs: nextTabs,
          manuscript: saved,
          document: fields.document,
          dirtyDiffSavedBaseline: state.dirtyDiffVisible ? saved : state.dirtyDiffSavedBaseline,
          reconciledTimeTagKeys: mergeReconciledKeysFromManuscript(
            state.reconciledTimeTagKeys,
            saved,
          ),
        };
      });
      void useProjectTimelineStore.getState().load();
      return true;
    } catch (err) {
      const parsed = parseAppError(err);
      if (parsed?.details) {
        console.error("[save_manuscript]", parsed.key, parsed.details);
      } else {
        console.error("[save_manuscript]", err);
      }
      if (!options.batch) {
        set({
          lastErrorKey: parsed?.key ?? "error.save_failed",
          lastErrorDetails: parsed?.details ?? null,
          saveStatus: "error",
        });
      }
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
      trackAction("editor", "save", {
        path: activeFilePath,
        kind: "entity",
        ok,
        scope: "file",
      });
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

    const payload = applyExtractedManuscript(manuscript, extracted);
    const ok = await get().saveManuscriptAtPath(activeFilePath, payload);

    audit.info("editor", "obs.editor.save.end", {
      path: activeFilePath,
      kind: "manuscript",
      ok,
    });
    audit.endCorrelation();
    trackAction("editor", "save", {
      path: activeFilePath,
      kind: "manuscript",
      ok,
      scope: "file",
    });
    return ok;
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
        const reconciledTimeTagKeys = mergeReconciledKeysFromManuscript(
          state.reconciledTimeTagKeys,
          manuscript,
        );
        return {
          manuscript,
          document: fields.document,
          isLoading: false,
          metadataSaveStatus: "idle",
          showExternalReloadDialog: false,
          documentSyncKey,
          reconciledTimeTagKeys,
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
    trackAction("editor", "externalReload", {
      phase: "show",
      path: get().activeFilePath,
    });
    set({ showExternalReloadDialog: true });
  },

  confirmExternalReload: async () => {
    trackAction("editor", "externalReload", {
      phase: "confirm",
      choice: "reload",
      path: get().activeFilePath,
    });
    set({ showExternalReloadDialog: false, isDirty: false });
    await get().reloadDocumentFromDisk();
  },

  dismissExternalReload: () => {
    trackAction("editor", "externalReload", {
      phase: "dismiss",
      choice: "cancel",
      path: get().activeFilePath,
    });
    set({ showExternalReloadDialog: false });
  },

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
    if (isSaveBatchInProgress()) {
      audit.debug("fs", "obs.fs.remove.skip_batch_close", { removedPaths });
      return;
    }

    const state = get();
    const toClose = tabPathsToCloseOnRemove(removedPaths, state.tabOrder).filter(
      (path) => {
        if (!shouldIgnoreFsReload(path)) {
          return true;
        }
        audit.debug("fs", "obs.fs.self_save.ignore_remove", { path, removedPaths });
        if (projectPathsEqual(state.activeFilePath, path)) {
          console.warn(
            `[fsSync] Ignored spurious remove for active tab ${path} (recent self-save)`,
          );
        }
        return false;
      },
    );
    if (toClose.length === 0) {
      return;
    }

    for (const path of toClose) {
      const nextTabs = { ...useEditorStore.getState().tabs };
      delete nextTabs[path];
      const nextOrder = useEditorStore.getState().tabOrder.filter((p) => p !== path);
      const wasActive = projectPathsEqual(
        useEditorStore.getState().activeFilePath,
        path,
      );
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
        ...activateTabView(nextTab, useEditorStore.getState().reconciledTimeTagKeys),
      });
      syncManuscriptTabsClear(nextOrder);
    }

    const { activeFilePath, tabOrder } = useEditorStore.getState();
    const { selectedPath } = useFileTreeStore.getState();
    if (
      selectedPath &&
      !tabOrder.some((openPath) => projectPathsEqual(openPath, selectedPath))
    ) {
      useFileTreeStore.setState({ selectedPath: activeFilePath });
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
          reconciledTimeTagKeys: mergeReconciledKeysFromManuscript(
            state.reconciledTimeTagKeys,
            manuscript,
          ),
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

  getManuscriptSessionSnapshot: () => {
    const state = get();
    const { tabs } = flushActiveTabToCache(state);
    const tabOrder = state.tabOrder
      .filter(isPersistableManuscriptPath)
      .map((path) => normalizeProjectPath(path));

    if (tabOrder.length === 0) {
      return null;
    }

    const activeCandidate = state.activeFilePath
      ? normalizeProjectPath(state.activeFilePath)
      : null;
    const activeFilePath =
      activeCandidate && tabOrder.includes(activeCandidate)
        ? activeCandidate
        : (tabOrder[tabOrder.length - 1] ?? null);

    const drafts: Record<string, ManuscriptTabDraft> = {};
    for (const path of tabOrder) {
      const tab = tabs[path];
      if (tab?.kind !== "manuscript" || !tab.isDirty || !tab.manuscript) {
        continue;
      }
      drafts[path] = {
        manuscript: { ...tab.manuscript, filePath: path },
        savedBodyFingerprint: tab.savedBodyFingerprint,
      };
    }

    return {
      tabOrder,
      activeFilePath,
      ...(Object.keys(drafts).length > 0 ? { drafts } : {}),
    };
  },

  applyPersistedTabDraft: (filePath, draft) => {
    const path = normalizeProjectPath(filePath);
    if (!isPersistableManuscriptPath(path)) {
      return;
    }

    const manuscript: ParsedManuscript = {
      ...draft.manuscript,
      filePath: path,
    };
    const document = manuscriptToParsedDocument(manuscript);

    set((state) => {
      const tab = state.tabs[path];
      if (!tab || tab.kind !== "manuscript") {
        return state;
      }

      const tabs = syncTabInMap(state.tabs, path, {
        manuscript,
        document,
        savedBodyFingerprint: draft.savedBodyFingerprint,
        isDirty: true,
        saveStatus: "idle",
      });

      const updated = tabs[path];
      if (!updated) {
        return { tabs };
      }

      if (projectPathsEqual(state.activeFilePath, path)) {
        return {
          tabs,
          ...activateTabView(updated, state.reconciledTimeTagKeys),
          isDirty: true,
          saveStatus: "idle" as SaveStatus,
        };
      }

      return { tabs };
    });
  },

  prepareActiveManuscriptDraftForDiff: () => {
    const state = get();
    if (
      state.activeTabKind !== "manuscript" ||
      !state.activeFilePath ||
      !state.isDirty ||
      !state.manuscript
    ) {
      return null;
    }

    const flushed = flushActiveTabToCache(state);
    if (!flushed.manuscript) {
      return null;
    }

    const activePath = state.activeFilePath;
    set((s) => {
      if (!projectPathsEqual(s.activeFilePath, activePath)) {
        return s;
      }
      return {
        tabs: flushed.tabs,
        manuscript: flushed.manuscript,
        document: flushed.document,
      };
    });

    return flushed.manuscript;
  },

  toggleDirtyDiffHighlight: () => {
    const state = get();
    if (state.dirtyDiffVisible) {
      trackAction("editor", "dirtyDiffToggle", {
        path: state.activeFilePath,
        visible: false,
      });
      set({ dirtyDiffVisible: false, dirtyDiffSavedBaseline: null });
      return;
    }
    if (
      state.activeTabKind !== "manuscript" ||
      !state.activeFilePath ||
      !state.isDirty
    ) {
      return;
    }
    trackAction("editor", "dirtyDiffToggle", {
      path: state.activeFilePath,
      visible: true,
    });
    set({ dirtyDiffVisible: true });
  },

  clearDirtyDiffHighlight: () => {
    if (get().dirtyDiffVisible) {
      set({ dirtyDiffVisible: false, dirtyDiffSavedBaseline: null });
    }
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
    trackAction("editor", "unsavedDialog", {
      action: "close",
      path: filePath,
      result: "blocked",
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
    ...activateTabView(nextTab, state.reconciledTimeTagKeys),
  });
  syncManuscriptTabsClear(nextOrder);
}

/** Guarda la pestaña activa (manuscrito o entidad). */
export async function saveActiveTab(): Promise<boolean> {
  return useEditorStore.getState().saveDocument();
}

async function saveDirtyTabWithFallback(
  path: string,
  initialActivePath: string | null,
  stats: { cacheSaveCount: number; fallbackCount: number; switchCount: number },
): Promise<boolean> {
  audit.info("editor", "obs.editor.saveAll.fallback_switch", {
    path,
    reason: "cache_not_saveable",
  });
  stats.fallbackCount += 1;

  await useEditorStore.getState().switchTab(path);
  stats.switchCount += 1;

  const afterSwitch = useEditorStore.getState();
  const tab = afterSwitch.tabs[path];
  if (!tab?.isDirty) {
    return true;
  }

  const batchOpts: SaveAtPathOptions = { batch: true };
  let ok = false;
  if (tab.kind === "entity") {
    if (afterSwitch.entity) {
      ok = await afterSwitch.saveEntityAtPath(path, afterSwitch.entity, batchOpts);
    }
  } else {
    const extracted = extractManuscriptFn?.();
    if (extracted && afterSwitch.manuscript) {
      ok = await afterSwitch.saveManuscriptAtPath(
        path,
        applyExtractedManuscript(afterSwitch.manuscript, extracted),
        batchOpts,
      );
    }
  }

  if (
    initialActivePath &&
    !projectPathsEqual(path, initialActivePath) &&
    useEditorStore.getState().tabs[initialActivePath]
  ) {
    await useEditorStore.getState().switchTab(initialActivePath);
    stats.switchCount += 1;
  }

  return ok;
}

async function saveDirtyTabInBatch(
  path: string,
  initialActivePath: string | null,
  stats: { cacheSaveCount: number; fallbackCount: number; switchCount: number },
): Promise<boolean> {
  const store = useEditorStore.getState();
  const tab = store.tabs[path];
  if (!tab?.isDirty) {
    return true;
  }

  const batchOpts: SaveAtPathOptions = { batch: true };
  const isActive =
    initialActivePath != null && projectPathsEqual(path, initialActivePath);

  if (isActive) {
    if (tab.kind === "entity") {
      if (!store.entity) {
        return saveDirtyTabWithFallback(path, initialActivePath, stats);
      }
      audit.info("editor", "obs.editor.saveAll.cache_save", {
        path,
        kind: "entity",
        active: true,
      });
      stats.cacheSaveCount += 1;
      return store.saveEntityAtPath(path, store.entity, batchOpts);
    }

    const extracted = extractManuscriptFn?.();
    if (!extracted || !store.manuscript) {
      return saveDirtyTabWithFallback(path, initialActivePath, stats);
    }
    audit.info("editor", "obs.editor.saveAll.cache_save", {
      path,
      kind: "manuscript",
      active: true,
    });
    stats.cacheSaveCount += 1;
    return store.saveManuscriptAtPath(
      path,
      applyExtractedManuscript(store.manuscript, extracted),
      batchOpts,
    );
  }

  if (tab.kind === "entity") {
    if (!tab.entity) {
      return saveDirtyTabWithFallback(path, initialActivePath, stats);
    }
    audit.info("editor", "obs.editor.saveAll.cache_save", { path, kind: "entity" });
    stats.cacheSaveCount += 1;
    return store.saveEntityAtPath(path, tab.entity, batchOpts);
  }

  const cacheCheck = assertCacheSaveable(tab);
  if (cacheCheck.ok && tab.manuscript) {
    audit.info("editor", "obs.editor.saveAll.cache_save", { path, kind: "manuscript" });
    stats.cacheSaveCount += 1;
    return store.saveManuscriptAtPath(path, tab.manuscript, batchOpts);
  }

  return saveDirtyTabWithFallback(path, initialActivePath, stats);
}

/** Guarda todas las pestañas con cambios sin cambiar la pestaña activa (Fase 2b). */
export async function saveAllOpenTabs(): Promise<boolean> {
  return audit.withCorrelationAsync(`save-all-${Date.now()}`, async () => {
    const initialActivePath = useEditorStore.getState().activeFilePath;
    const dirtyPaths = useEditorStore
      .getState()
      .tabOrder.filter((path) => useEditorStore.getState().tabs[path]?.isDirty);

    if (dirtyPaths.length === 0) {
      return true;
    }

    markSelfSavePaths(dirtyPaths);
    beginSaveBatch();

    const stats = { cacheSaveCount: 0, fallbackCount: 0, switchCount: 0 };
    let allSaved = true;

    audit.info("editor", "obs.editor.saveAll.start", {
      dirtyPaths,
      activePath: initialActivePath,
    });

    useEditorStore.setState({
      saveStatus: "saving",
      lastErrorKey: null,
      lastErrorDetails: null,
    });

    try {
      const state = useEditorStore.getState();
      const flushed = flushActiveTabToCache(state);
      const flushPatch: Partial<EditorState> = { tabs: flushed.tabs };
      if (
        initialActivePath &&
        projectPathsEqual(state.activeFilePath, initialActivePath)
      ) {
        if (state.activeTabKind === "manuscript") {
          flushPatch.manuscript = flushed.manuscript;
          flushPatch.document = flushed.document;
        } else if (state.activeTabKind === "entity") {
          flushPatch.entity = flushed.entity;
        }
      }
      useEditorStore.setState(flushPatch);

      for (const path of dirtyPaths) {
        const ok = await saveDirtyTabInBatch(path, initialActivePath, stats);
        if (!ok) {
          allSaved = false;
        }
      }

      return allSaved;
    } finally {
      endSaveBatch();

      useEditorStore.setState({
        saveStatus: allSaved ? "saved" : "error",
      });

      audit.info("editor", "obs.editor.saveAll.end", {
        ok: allSaved,
        activePath: useEditorStore.getState().activeFilePath,
        dirtyPaths,
        cacheSaveCount: stats.cacheSaveCount,
        fallbackCount: stats.fallbackCount,
        switchCount: stats.switchCount,
      });
      trackAction("editor", "saveAll", {
        ok: allSaved,
        dirtyCount: dirtyPaths.length,
      });
    }
  });
}
