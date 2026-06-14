import { create } from "zustand";

import { audit } from "@/lib/audit";
import {
  auditBootstrap,
  auditClearAllLogs,
  auditPatchSettings,
  auditSetActionLogEnabled,
  auditSetActionVerboseEnabled,
  auditSetEnabled,
  auditSetRenderLogEnabled,
  auditSetRenderVerboseEnabled,
} from "@/lib/audit/ipc";
import {
  applyActionAuditConfig,
  ensureActionAuditPersistHandlers,
  logActionAuditBootstrap,
} from "@/lib/action-audit/bootstrap";
import { actionAudit } from "@/lib/action-audit";
import {
  applyRenderAuditConfig,
  ensureRenderAuditPersistHandlers,
  logRenderAuditBootstrap,
} from "@/lib/render-audit/bootstrap";
import { renderAudit } from "@/lib/render-audit";
import type { AuditConfigResponse, AuditDebugSettings } from "@/lib/types/audit";

export type AuditViewerTab = "system" | "ui" | "uiVerbose" | "action" | "actionVerbose";

interface AuditStoreState {
  bootstrapped: boolean;
  bootstrapping: boolean;
  sessionLogPath: string | null;
  renderStandardLogPath: string | null;
  renderVerboseLogPath: string | null;
  actionSessionLogPath: string | null;
  actionVerboseLogPath: string | null;
  bootId: string | null;
  repoDebugRoot: string | null;
  settings: AuditDebugSettings | null;
  bootstrap: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
  setRenderLogEnabled: (enabled: boolean) => Promise<void>;
  setRenderVerboseEnabled: (enabled: boolean) => Promise<void>;
  setActionLogEnabled: (enabled: boolean) => Promise<void>;
  setActionVerboseEnabled: (enabled: boolean) => Promise<void>;
  patchSettings: (patch: Partial<AuditDebugSettings>) => Promise<void>;
  clearAllLogs: () => Promise<void>;
  viewerOpen: boolean;
  viewerTab: AuditViewerTab;
  setViewerOpen: (open: boolean) => void;
  setViewerTab: (tab: AuditViewerTab) => void;
  toggleViewer: () => void;
}

function applyConfig(config: AuditConfigResponse): void {
  audit.setEnabled(config.settings.enabled);
  audit.patchSettings(config.settings);
  applyRenderAuditConfig(config);
  applyActionAuditConfig(config);
}

function applyConfigToStore(config: AuditConfigResponse) {
  return {
    settings: config.settings,
    sessionLogPath: config.sessionLogPath,
    renderStandardLogPath: config.renderStandardLogPath,
    renderVerboseLogPath: config.renderVerboseLogPath,
    actionSessionLogPath: config.actionSessionLogPath,
    actionVerboseLogPath: config.actionVerboseLogPath,
    bootId: config.bootId,
    repoDebugRoot: config.repoDebugRoot,
  };
}

export const useAuditStore = create<AuditStoreState>((set, get) => ({
  bootstrapped: false,
  bootstrapping: false,
  sessionLogPath: null,
  renderStandardLogPath: null,
  renderVerboseLogPath: null,
  actionSessionLogPath: null,
  actionVerboseLogPath: null,
  bootId: null,
  repoDebugRoot: null,
  settings: null,
  viewerOpen: false,
  viewerTab: "system",

  bootstrap: async () => {
    if (!__AUDIT_ENABLED__) {
      return;
    }
    if (get().bootstrapped || get().bootstrapping) {
      return;
    }

    set({ bootstrapping: true });

    try {
      ensureRenderAuditPersistHandlers();
      ensureActionAuditPersistHandlers();
      const config = await auditBootstrap();
      applyConfig(config);
      set({
        bootstrapped: true,
        bootstrapping: false,
        ...applyConfigToStore(config),
      });
      logRenderAuditBootstrap(config);
      logActionAuditBootstrap(config);
      audit.info("system", "obs.system.audit.bootstrap", {
        sessionLogPath: config.sessionLogPath,
        enabled: config.settings.enabled,
        clearLogsOnNextBoot: config.settings.clearLogsOnNextBoot,
        renderStandardLogPath: config.renderStandardLogPath,
        renderVerboseLogPath: config.renderVerboseLogPath,
        actionSessionLogPath: config.actionSessionLogPath,
        actionVerboseLogPath: config.actionVerboseLogPath,
      });
    } catch (error) {
      set({ bootstrapping: false });
      console.debug("[audit] bootstrap failed", error);
    }
  },

  setEnabled: async (enabled: boolean) => {
    if (!__AUDIT_ENABLED__) {
      return;
    }

    try {
      const config = await auditSetEnabled(enabled);
      applyConfig(config);
      set(applyConfigToStore(config));
    } catch (error) {
      console.debug("[audit] setEnabled failed", error);
    }
  },

  setRenderLogEnabled: async (enabled: boolean) => {
    if (!__AUDIT_ENABLED__) {
      return;
    }

    try {
      const config = await auditSetRenderLogEnabled(enabled);
      applyConfig(config);
      set(applyConfigToStore(config));
      if (enabled) {
        logRenderAuditBootstrap(config);
      }
    } catch (error) {
      console.debug("[audit] setRenderLogEnabled failed", error);
    }
  },

  setRenderVerboseEnabled: async (enabled: boolean) => {
    if (!__AUDIT_ENABLED__) {
      return;
    }

    try {
      const config = await auditSetRenderVerboseEnabled(enabled);
      applyConfig(config);
      set(applyConfigToStore(config));
      if (enabled) {
        logRenderAuditBootstrap(config);
      }
    } catch (error) {
      console.debug("[audit] setRenderVerboseEnabled failed", error);
    }
  },

  setActionLogEnabled: async (enabled: boolean) => {
    if (!__AUDIT_ENABLED__) {
      return;
    }

    try {
      const config = await auditSetActionLogEnabled(enabled);
      applyConfig(config);
      set(applyConfigToStore(config));
      if (enabled) {
        logActionAuditBootstrap(config);
      }
    } catch (error) {
      console.debug("[audit] setActionLogEnabled failed", error);
    }
  },

  setActionVerboseEnabled: async (enabled: boolean) => {
    if (!__AUDIT_ENABLED__) {
      return;
    }

    try {
      const config = await auditSetActionVerboseEnabled(enabled);
      applyConfig(config);
      set(applyConfigToStore(config));
      if (enabled) {
        logActionAuditBootstrap(config);
      }
    } catch (error) {
      console.debug("[audit] setActionVerboseEnabled failed", error);
    }
  },

  patchSettings: async (patch: Partial<AuditDebugSettings>) => {
    if (!__AUDIT_ENABLED__) {
      return;
    }

    try {
      const config = await auditPatchSettings(patch);
      applyConfig(config);
      set(applyConfigToStore(config));
    } catch (error) {
      console.debug("[audit] patchSettings failed", error);
    }
  },

  clearAllLogs: async () => {
    if (!__AUDIT_ENABLED__) {
      return;
    }

    try {
      audit.clearBuffer();
      renderAudit.clearStandardBuffer();
      renderAudit.clearVerboseBuffer();
      actionAudit.clearSessionBuffer();
      actionAudit.clearVerboseBuffer();
      const config = await auditClearAllLogs();
      applyConfig(config);
      set(applyConfigToStore(config));
    } catch (error) {
      console.debug("[audit] clearAllLogs failed", error);
    }
  },

  setViewerOpen: (open: boolean) => {
    if (!__AUDIT_ENABLED__) {
      return;
    }
    set({ viewerOpen: open });
  },

  setViewerTab: (tab: AuditViewerTab) => {
    if (!__AUDIT_ENABLED__) {
      return;
    }
    set({ viewerTab: tab });
  },

  toggleViewer: () => {
    if (!__AUDIT_ENABLED__) {
      return;
    }
    set((state) => ({ viewerOpen: !state.viewerOpen }));
  },
}));

export function isAllSingleSessionNextBoot(settings: AuditDebugSettings | null): boolean {
  if (!settings) {
    return false;
  }
  return (
    settings.clearLogsOnNextBoot &&
    settings.renderClearLogsOnNextBoot &&
    settings.renderVerboseClearLogsOnNextBoot &&
    settings.actionClearLogsOnNextBoot &&
    settings.actionVerboseClearLogsOnNextBoot
  );
}

export function patchAllSingleSessionNextBoot(enabled: boolean): Partial<AuditDebugSettings> {
  return {
    clearLogsOnNextBoot: enabled,
    renderClearLogsOnNextBoot: enabled,
    renderVerboseClearLogsOnNextBoot: enabled,
    actionClearLogsOnNextBoot: enabled,
    actionVerboseClearLogsOnNextBoot: enabled,
  };
}
