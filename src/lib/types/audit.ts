export type {
  AuditDebugSettings,
  AuditDomain,
  AuditEntry,
  AuditLevel,
} from "@/lib/audit/types";

import type { AuditDebugSettings } from "@/lib/audit/types";

/** Respuesta de `audit_bootstrap` / `audit_get_config` / mutaciones de settings. */
export interface AuditConfigResponse {
  settings: AuditDebugSettings;
  sessionLogPath: string | null;
  renderStandardLogPath: string | null;
  renderVerboseLogPath: string | null;
  actionSessionLogPath: string | null;
  actionVerboseLogPath: string | null;
  bootId: string;
  repoDebugRoot: string;
}

/** Respuesta de `audit_get_log_path`. */
export interface AuditLogPathResponse {
  sessionLogPath: string | null;
  renderStandardLogPath: string | null;
  renderVerboseLogPath: string | null;
  actionSessionLogPath: string | null;
  actionVerboseLogPath: string | null;
  logsDir: string;
  renderLogsDir: string;
  actionLogsDir: string;
  repoDebugRoot: string;
}

export type RenderLogChannel = "standard" | "verbose";
export type RenderLogClearTarget = "standard" | "verbose" | "all";
export type ActionLogChannel = "session" | "verbose";
export type ActionLogClearTarget = "session" | "verbose" | "all";

export type AuditSettingsPatch = Partial<AuditDebugSettings>;
