import type { AuditLevel } from "@/lib/audit/types";
import { AUDIT_LEVEL_RANK } from "@/lib/audit/defaults";
import type { ActionAuditSettings } from "@/lib/action-audit/types";

export const MAX_ACTION_PAYLOAD_BYTES = 2_048;
export const MAX_ACTION_VERBOSE_PAYLOAD_BYTES = 4_096;

export const DEFAULT_ACTION_AUDIT_SETTINGS: ActionAuditSettings = {
  actionLogEnabled: false,
  actionClearLogsOnNextBoot: false,
  actionMaxBufferSize: 600,
  actionLevel: "info",
  actionVerboseEnabled: false,
  actionVerboseClearLogsOnNextBoot: false,
  actionVerboseMaxBufferSize: 300,
  actionVerboseLevel: "debug",
};

export function shouldLogActionLevel(
  level: AuditLevel,
  minLevel: AuditLevel,
): boolean {
  return AUDIT_LEVEL_RANK[level] >= AUDIT_LEVEL_RANK[minLevel];
}
