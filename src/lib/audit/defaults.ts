import type { AuditDebugSettings, AuditLevel } from "@/lib/audit/types";

export const DEFAULT_MAX_BUFFER_SIZE = 2_000;
export const MAX_PAYLOAD_BYTES = 2_048;

export const AUDIT_LEVEL_RANK: Record<AuditLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

export const DEFAULT_AUDIT_SETTINGS: AuditDebugSettings = {
  enabled: true,
  clearLogsOnNextBoot: false,
  level: "info",
  logIpcArgs: false,
  logStorePatches: false,
  maxBufferSize: DEFAULT_MAX_BUFFER_SIZE,
};
