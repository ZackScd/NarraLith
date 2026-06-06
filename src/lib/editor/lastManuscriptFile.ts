import { normalizeProjectPath } from "@/lib/pathUtils";
import { isEntityPath } from "@/lib/worldbuilding/entityPath";

export const LAST_MANUSCRIPT_FILE_STORAGE_KEY = "narralith:last-manuscript-file";

export type ManuscriptTabsSession = {
  tabOrder: string[];
  activeFilePath: string | null;
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

  return { tabOrder, activeFilePath };
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

  return normalizeSession({ tabOrder, activeFilePath });
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
