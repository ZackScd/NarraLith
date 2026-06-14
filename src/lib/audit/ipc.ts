import { invoke } from "@tauri-apps/api/core";

import type {
  AuditConfigResponse,
  AuditEntry,
  AuditLogPathResponse,
  AuditSettingsPatch,
  ActionLogChannel,
  ActionLogClearTarget,
  RenderLogChannel,
  RenderLogClearTarget,
} from "@/lib/types/audit";

/** Comandos `audit_*` — invocación directa (excluidos de `auditInvoke` en Fase 1). */

export function auditBootstrap(): Promise<AuditConfigResponse> {
  return invoke<AuditConfigResponse>("audit_bootstrap");
}

export function auditGetConfig(): Promise<AuditConfigResponse> {
  return invoke<AuditConfigResponse>("audit_get_config");
}

export function auditSetEnabled(enabled: boolean): Promise<AuditConfigResponse> {
  return invoke<AuditConfigResponse>("audit_set_enabled", { enabled });
}

export function auditPatchSettings(
  patch: AuditSettingsPatch,
): Promise<AuditConfigResponse> {
  return invoke<AuditConfigResponse>("audit_patch_settings", { patch });
}

export function auditClearLogs(): Promise<AuditConfigResponse> {
  return invoke<AuditConfigResponse>("audit_clear_logs");
}

export function auditAppendEntry(entry: AuditEntry): Promise<void> {
  return invoke<void>("audit_append_entry", { entry });
}

export function auditAppendRenderEntry(
  channel: RenderLogChannel,
  entry: AuditEntry,
): Promise<void> {
  return invoke<void>("audit_append_render_entry", { channel, entry });
}

export function auditSetRenderLogEnabled(enabled: boolean): Promise<AuditConfigResponse> {
  return invoke<AuditConfigResponse>("audit_set_render_log_enabled", { enabled });
}

export function auditSetRenderVerboseEnabled(enabled: boolean): Promise<AuditConfigResponse> {
  return invoke<AuditConfigResponse>("audit_set_render_verbose_enabled", { enabled });
}

export function auditClearRenderLogs(
  target: RenderLogClearTarget,
): Promise<AuditConfigResponse> {
  return invoke<AuditConfigResponse>("audit_clear_render_logs", { target });
}

export function auditClearAllLogs(): Promise<AuditConfigResponse> {
  return invoke<AuditConfigResponse>("audit_clear_all_logs");
}

export function auditSetActionLogEnabled(enabled: boolean): Promise<AuditConfigResponse> {
  return invoke<AuditConfigResponse>("audit_set_action_log_enabled", { enabled });
}

export function auditSetActionVerboseEnabled(enabled: boolean): Promise<AuditConfigResponse> {
  return invoke<AuditConfigResponse>("audit_set_action_verbose_enabled", { enabled });
}

export function auditAppendActionEntry(
  channel: ActionLogChannel,
  entry: AuditEntry,
): Promise<void> {
  return invoke<void>("audit_append_action_entry", { channel, entry });
}

export function auditClearActionLogs(
  target: ActionLogClearTarget,
): Promise<AuditConfigResponse> {
  return invoke<AuditConfigResponse>("audit_clear_action_logs", { target });
}

export function auditGetLogPath(): Promise<AuditLogPathResponse> {
  return invoke<AuditLogPathResponse>("audit_get_log_path");
}
