import type { AuditLevel } from "@/lib/audit/types";
import { AUDIT_LEVEL_RANK } from "@/lib/audit/defaults";
import type { RenderAuditSettings } from "@/lib/render-audit/types";

export const MAX_UI_PAYLOAD_BYTES = 2_048;
export const MAX_UI_VERBOSE_PAYLOAD_BYTES = 8_192;

export const DEFAULT_RENDER_AUDIT_SETTINGS: RenderAuditSettings = {
  renderLogEnabled: false,
  renderClearLogsOnNextBoot: false,
  renderMaxBufferSize: 800,
  renderLevel: "info",
  renderVerboseEnabled: false,
  renderVerboseClearLogsOnNextBoot: false,
  renderVerboseMaxBufferSize: 400,
  renderVerboseLevel: "debug",
};

export function shouldLogUiLevel(
  level: AuditLevel,
  minLevel: AuditLevel,
): boolean {
  return AUDIT_LEVEL_RANK[level] >= AUDIT_LEVEL_RANK[minLevel];
}
