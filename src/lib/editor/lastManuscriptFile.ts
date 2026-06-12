import { normalizeProjectPath } from "@/lib/pathUtils";
import type { ParsedManuscript } from "@/lib/types/manuscript";
import { isEntityPath } from "@/lib/worldbuilding/entityPath";

export const LAST_MANUSCRIPT_FILE_STORAGE_KEY = "narralith:last-manuscript-file";

/** Borrador en RAM de una pestaña manuscrito sucia (FIX-007). */
export type ManuscriptTabDraft = {
  manuscript: ParsedManuscript;
  /** Baseline en disco al abrir / último guardado — para `isDirty`. */
  savedBodyFingerprint: string;
};

export type ManuscriptTabsSession = {
  tabOrder: string[];
  activeFilePath: string | null;
  /** Solo rutas sucias; omitir si vacío. */
  drafts?: Record<string, ManuscriptTabDraft>;
};

type StoredSessionValue = ManuscriptTabsSession | string;

type LastManuscriptFileMap = Record<string, StoredSessionValue>;

function normalizeRoot(projectRoot: string): string {
  return normalizeProjectPath(projectRoot);
}

export function isPersistableManuscriptPath(filePath: string): boolean {
  const normalized = normalizeProjectPath(filePath);
  return normalized.toLowerCase().endsWith(".md") && !isEntityPath(normalized);
}

function isParsedManuscript(value: unknown): value is ParsedManuscript {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.filePath !== "string") {
    return false;
  }
  if (!record.fileHeader || typeof record.fileHeader !== "object") {
    return false;
  }
  if (!Array.isArray(record.segments)) {
    return false;
  }
  return true;
}

function parseTabDraft(value: unknown): ManuscriptTabDraft | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.savedBodyFingerprint !== "string") {
    return null;
  }
  if (!isParsedManuscript(record.manuscript)) {
    return null;
  }
  return {
    manuscript: record.manuscript,
    savedBodyFingerprint: record.savedBodyFingerprint,
  };
}

function normalizeDrafts(
  drafts: Record<string, ManuscriptTabDraft> | undefined,
  tabOrder: string[],
): Record<string, ManuscriptTabDraft> | undefined {
  if (!drafts) {
    return undefined;
  }
  const allowed = new Set(tabOrder);
  const normalized: Record<string, ManuscriptTabDraft> = {};
  for (const [path, draft] of Object.entries(drafts)) {
    const key = normalizeProjectPath(path);
    if (!allowed.has(key) || !isPersistableManuscriptPath(key)) {
      continue;
    }
    normalized[key] = {
      manuscript: { ...draft.manuscript, filePath: key },
      savedBodyFingerprint: draft.savedBodyFingerprint,
    };
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeSession(
  session: ManuscriptTabsSession,
): ManuscriptTabsSession | null {
  const seen = new Set<string>();
  const tabOrder: string[] = [];
  for (const path of session.tabOrder) {
    if (!isPersistableManuscriptPath(path)) {
      continue;
    }
    const normalized = normalizeProjectPath(path);
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    tabOrder.push(normalized);
  }

  if (tabOrder.length === 0) {
    return null;
  }

  const activeCandidate = session.activeFilePath
    ? normalizeProjectPath(session.activeFilePath)
    : null;
  const activeFilePath =
    activeCandidate && tabOrder.includes(activeCandidate)
      ? activeCandidate
      : tabOrder[tabOrder.length - 1]!;

  const drafts = normalizeDrafts(session.drafts, tabOrder);
  return { tabOrder, activeFilePath, ...(drafts ? { drafts } : {}) };
}

function parseStoredSession(value: unknown): ManuscriptTabsSession | null {
  if (typeof value === "string") {
    if (!isPersistableManuscriptPath(value)) {
      return null;
    }
    const path = normalizeProjectPath(value);
    return { tabOrder: [path], activeFilePath: path };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.tabOrder)) {
    return null;
  }

  const tabOrder = record.tabOrder.filter(
    (path): path is string => typeof path === "string",
  );
  const activeFilePath =
    typeof record.activeFilePath === "string" ? record.activeFilePath : null;

  let drafts: Record<string, ManuscriptTabDraft> | undefined;
  if (record.drafts && typeof record.drafts === "object" && !Array.isArray(record.drafts)) {
    const parsed: Record<string, ManuscriptTabDraft> = {};
    for (const [path, raw] of Object.entries(record.drafts)) {
      const draft = parseTabDraft(raw);
      if (draft) {
        parsed[normalizeProjectPath(path)] = draft;
      }
    }
    drafts = Object.keys(parsed).length > 0 ? parsed : undefined;
  }

  return normalizeSession({ tabOrder, activeFilePath, drafts });
}

function readMap(): LastManuscriptFileMap {
  try {
    const raw = localStorage.getItem(LAST_MANUSCRIPT_FILE_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const map: LastManuscriptFileMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof key !== "string") {
        continue;
      }
      if (typeof value === "string") {
        map[normalizeRoot(key)] = normalizeProjectPath(value);
        continue;
      }
      const session = parseStoredSession(value);
      if (session) {
        map[normalizeRoot(key)] = session;
      }
    }
    return map;
  } catch {
    return {};
  }
}

function writeMap(map: LastManuscriptFileMap): void {
  try {
    localStorage.setItem(LAST_MANUSCRIPT_FILE_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / private mode */
  }
}

export function getManuscriptTabsSession(
  projectRoot: string,
): ManuscriptTabsSession | null {
  const map = readMap();
  const stored = map[normalizeRoot(projectRoot)];
  if (!stored) {
    return null;
  }
  return parseStoredSession(stored);
}

export function setManuscriptTabsSession(
  projectRoot: string,
  session: ManuscriptTabsSession,
): void {
  const normalized = normalizeSession(session);
  const key = normalizeRoot(projectRoot);
  const map = readMap();

  if (!normalized) {
    if (key in map) {
      delete map[key];
      writeMap(map);
    }
    return;
  }

  map[key] = normalized;
  writeMap(map);
}

export function clearManuscriptTabsSession(projectRoot: string): void {
  const map = readMap();
  const key = normalizeRoot(projectRoot);
  if (!(key in map)) {
    return;
  }
  delete map[key];
  writeMap(map);
}
