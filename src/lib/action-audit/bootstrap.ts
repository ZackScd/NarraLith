import { auditAppendActionEntry } from "@/lib/audit/ipc";
import { actionAudit } from "@/lib/action-audit";
import type { AuditConfigResponse } from "@/lib/types/audit";

let persistConfigured = false;
let persistDegraded = false;

function pickActionSettings(settings: AuditConfigResponse["settings"]) {
  return {
    actionLogEnabled: settings.actionLogEnabled,
    actionClearLogsOnNextBoot: settings.actionClearLogsOnNextBoot,
    actionMaxBufferSize: settings.actionMaxBufferSize,
    actionLevel: settings.actionLevel,
    actionVerboseEnabled: settings.actionVerboseEnabled,
    actionVerboseClearLogsOnNextBoot: settings.actionVerboseClearLogsOnNextBoot,
    actionVerboseMaxBufferSize: settings.actionVerboseMaxBufferSize,
    actionVerboseLevel: settings.actionVerboseLevel,
  };
}

export function applyActionAuditConfig(config: AuditConfigResponse): void {
  actionAudit.setSessionEnabled(config.settings.actionLogEnabled);
  actionAudit.setVerboseEnabled(config.settings.actionVerboseEnabled);
  actionAudit.patchSettings(pickActionSettings(config.settings));
}

export function ensureActionAuditPersistHandlers(): void {
  if (persistConfigured || !__AUDIT_ENABLED__) {
    return;
  }
  persistConfigured = true;

  actionAudit.setSessionPersistHandler((entry) => {
    void auditAppendActionEntry("session", entry).catch((error) => {
      console.debug("[action-audit] append failed", error);
      if (!persistDegraded) {
        persistDegraded = true;
        actionAudit.reportDegraded("session_append_failed");
      }
    });
  });

  actionAudit.setVerbosePersistHandler((entry) => {
    void auditAppendActionEntry("verbose", entry).catch((error) => {
      console.debug("[action-audit] verbose append failed", error);
      if (!persistDegraded) {
        persistDegraded = true;
        actionAudit.reportDegraded("verbose_append_failed");
      }
    });
  });
}

export function logActionAuditBootstrap(config: AuditConfigResponse): void {
  if (!actionAudit.isSessionEnabled() && !actionAudit.isVerboseEnabled()) {
    return;
  }
  actionAudit.track(
    "system",
    "bootstrap",
    {
      bootId: config.bootId,
      systemSessionPath: config.sessionLogPath,
      actionSessionLogPath: config.actionSessionLogPath,
      actionVerboseLogPath: config.actionVerboseLogPath,
      actionLogEnabled: config.settings.actionLogEnabled,
      actionVerboseEnabled: config.settings.actionVerboseEnabled,
    },
    { channel: "session" },
  );
}
