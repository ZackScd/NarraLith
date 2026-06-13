import { auditAppendRenderEntry } from "@/lib/audit/ipc";
import { renderAudit } from "@/lib/render-audit";
import { UI_EVENTS } from "@/lib/render-audit/events";
import type { AuditConfigResponse } from "@/lib/types/audit";

let persistConfigured = false;
let persistDegraded = false;

function pickRenderSettings(settings: AuditConfigResponse["settings"]) {
  return {
    renderLogEnabled: settings.renderLogEnabled,
    renderClearLogsOnNextBoot: settings.renderClearLogsOnNextBoot,
    renderMaxBufferSize: settings.renderMaxBufferSize,
    renderLevel: settings.renderLevel,
    renderVerboseEnabled: settings.renderVerboseEnabled,
    renderVerboseClearLogsOnNextBoot: settings.renderVerboseClearLogsOnNextBoot,
    renderVerboseMaxBufferSize: settings.renderVerboseMaxBufferSize,
    renderVerboseLevel: settings.renderVerboseLevel,
  };
}

export function applyRenderAuditConfig(config: AuditConfigResponse): void {
  renderAudit.setStandardEnabled(config.settings.renderLogEnabled);
  renderAudit.setVerboseEnabled(config.settings.renderVerboseEnabled);
  renderAudit.patchSettings(pickRenderSettings(config.settings));
}

export function ensureRenderAuditPersistHandlers(): void {
  if (persistConfigured || !__AUDIT_ENABLED__) {
    return;
  }
  persistConfigured = true;

  renderAudit.setStandardPersistHandler((entry) => {
    void auditAppendRenderEntry("standard", entry).catch((error) => {
      console.debug("[render-audit] append failed", error);
      if (!persistDegraded) {
        persistDegraded = true;
        renderAudit.reportDegraded("standard_append_failed");
      }
    });
  });

  renderAudit.setVerbosePersistHandler((entry) => {
    void auditAppendRenderEntry("verbose", entry).catch((error) => {
      console.debug("[render-audit] verbose append failed", error);
      if (!persistDegraded) {
        persistDegraded = true;
        renderAudit.reportDegraded("verbose_append_failed");
      }
    });
  });
}

export function logRenderAuditBootstrap(config: AuditConfigResponse): void {
  if (!renderAudit.isStandardEnabled() && !renderAudit.isVerboseEnabled()) {
    return;
  }
  renderAudit.ui(
    UI_EVENTS.render.bootstrap,
    {
      bootId: config.bootId,
      systemSessionPath: config.sessionLogPath,
      renderStandardLogPath: config.renderStandardLogPath,
      renderVerboseLogPath: config.renderVerboseLogPath,
      renderLogEnabled: config.settings.renderLogEnabled,
      renderVerboseEnabled: config.settings.renderVerboseEnabled,
    },
    { channel: "standard" },
  );
  renderAudit.ui(
    UI_EVENTS.workspace.bootstrap,
    {
      bootId: config.bootId,
      systemSessionPath: config.sessionLogPath,
      renderLogEnabled: config.settings.renderLogEnabled,
      renderVerboseEnabled: config.settings.renderVerboseEnabled,
    },
    { channel: "standard" },
  );
}
