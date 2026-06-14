export type AuditLevel = "trace" | "debug" | "info" | "warn" | "error";

export type AuditDomain =
  | "ipc"
  | "fs"
  | "editor"
  | "store"
  | "project"
  | "explorer"
  | "watcher"
  | "entity"
  | "system"
  | "ui"
  | "action";

export interface AuditEntry {
  id: string;
  ts: number;
  level: AuditLevel;
  domain: AuditDomain;
  event: string;
  message?: string;
  correlationId?: string;
  payload?: Record<string, unknown>;
  source: "frontend" | "backend";
  durationMs?: number;
}

export interface AuditDebugSettings {
  enabled: boolean;
  clearLogsOnNextBoot: boolean;
  level: AuditLevel;
  logIpcArgs: boolean;
  logStorePatches: boolean;
  maxBufferSize: number;
  renderLogEnabled: boolean;
  renderClearLogsOnNextBoot: boolean;
  renderMaxBufferSize: number;
  renderLevel: AuditLevel;
  renderVerboseEnabled: boolean;
  renderVerboseClearLogsOnNextBoot: boolean;
  renderVerboseMaxBufferSize: number;
  renderVerboseLevel: AuditLevel;
  actionLogEnabled: boolean;
  actionClearLogsOnNextBoot: boolean;
  actionMaxBufferSize: number;
  actionLevel: AuditLevel;
  actionVerboseEnabled: boolean;
  actionVerboseClearLogsOnNextBoot: boolean;
  actionVerboseMaxBufferSize: number;
  actionVerboseLevel: AuditLevel;
}

export interface AuditApi {
  trace: (
    domain: AuditDomain,
    event: string,
    payload?: Record<string, unknown>,
    message?: string,
  ) => void;
  debug: (
    domain: AuditDomain,
    event: string,
    payload?: Record<string, unknown>,
    message?: string,
  ) => void;
  info: (
    domain: AuditDomain,
    event: string,
    payload?: Record<string, unknown>,
    message?: string,
  ) => void;
  warn: (
    domain: AuditDomain,
    event: string,
    payload?: Record<string, unknown>,
    message?: string,
  ) => void;
  error: (
    domain: AuditDomain,
    event: string,
    payload?: Record<string, unknown>,
    message?: string,
  ) => void;
  withCorrelation: <T>(correlationId: string, fn: () => T) => T;
  withCorrelationAsync: <T>(correlationId: string, fn: () => Promise<T>) => Promise<T>;
  beginCorrelation: (id?: string) => string;
  endCorrelation: () => void;
  getCorrelationId: () => string | null;
  isEnabled: () => boolean;
  setEnabled: (enabled: boolean) => void;
  getSettings: () => Readonly<AuditDebugSettings>;
  patchSettings: (patch: Partial<AuditDebugSettings>) => void;
  getEntries: (limit?: number) => AuditEntry[];
  clearBuffer: () => void;
  setPersistHandler: (handler: ((entry: AuditEntry) => void) | null) => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => AuditEntry[];
  /** Solo buffer RAM — sin persistir (p. ej. fallo de escritura NDJSON). */
  reportDegraded: (reason: string) => void;
}
