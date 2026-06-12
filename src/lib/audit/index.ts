export type {
  AuditApi,
  AuditDebugSettings,
  AuditDomain,
  AuditEntry,
  AuditLevel,
} from "@/lib/audit/types";

export {
  AUDIT_LEVEL_RANK,
  DEFAULT_AUDIT_SETTINGS,
  DEFAULT_MAX_BUFFER_SIZE,
  MAX_PAYLOAD_BYTES,
} from "@/lib/audit/defaults";

export { AuditRingBuffer } from "@/lib/audit/ringBuffer";
export { sanitizeAuditPayload } from "@/lib/audit/sanitizePayload";
export { createAuditApi } from "@/lib/audit/createAuditApi";
export { createStubAuditApi } from "@/lib/audit/stub";
export { auditInvoke, buildAuditIpcPayload } from "@/lib/audit/auditInvoke";
export {
  auditAppendEntry,
  auditBootstrap,
  auditClearLogs,
  auditGetConfig,
  auditGetLogPath,
  auditPatchSettings,
  auditSetEnabled,
} from "@/lib/audit/ipc";

export { audit } from "@/lib/audit/instance";
