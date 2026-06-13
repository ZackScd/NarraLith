import { create } from "zustand";

import { audit } from "@/lib/audit";
import {
  auditBootstrap,
  auditClearLogs,
  auditClearRenderLogs,
  auditPatchSettings,
  auditSetEnabled,
  auditSetRenderLogEnabled,
  auditSetRenderVerboseEnabled,
} from "@/lib/audit/ipc";
import {
  applyRenderAuditConfig,
  ensureRenderAuditPersistHandlers,
  logRenderAuditBootstrap,
} from "@/lib/render-audit/bootstrap";
import { renderAudit } from "@/lib/render-audit";
import type { AuditConfigResponse, AuditDebugSettings } from "@/lib/types/audit";
import type { RenderLogClearTarget } from "@/lib/types/audit";

export type AuditViewerTab = "system" | "ui" | "uiVerbose";

interface AuditStoreState {
  bootstrapped: boolean;
  bootstrapping: boolean;
  sessionLogPath: string | null;
  renderStandardLogPath: string | null;
  renderVerboseLogPath: string | null;
  bootId: string | null;
  repoDebugRoot: string | null;
  settings: AuditDebugSettings | null;
  bootstrap: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
  setRenderLogEnabled: (enabled: boolean) => Promise<void>;
  setRenderVerboseEnabled: (enabled: boolean) => Promise<void>;
  patchSettings: (patch: Partial<AuditDebugSettings>) => Promise<void>;
  clearLogs: () => Promise<void>;
  clearRenderLogs: (target: RenderLogClearTarget) => Promise<void>;
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
}

function applyConfigToStore(config: AuditConfigResponse) {
  return {
    settings: config.settings,
    sessionLogPath: config.sessionLogPath,
    renderStandardLogPath: config.renderStandardLogPath,
    renderVerboseLogPath: config.renderVerboseLogPath,
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
      const config = await auditBootstrap();
      applyConfig(config);
      set({
        bootstrapped: true,
        bootstrapping: false,
        ...applyConfigToStore(config),
      });
      logRenderAuditBootstrap(config);
      audit.info("system", "obs.system.audit.bootstrap", {
        sessionLogPath: config.sessionLogPath,
        enabled: config.settings.enabled,
        clearLogsOnNextBoot: config.settings.clearLogsOnNextBoot,
        renderStandardLogPath: config.renderStandardLogPath,
        renderVerboseLogPath: config.renderVerboseLogPath,
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

  clearLogs: async () => {
    if (!__AUDIT_ENABLED__) {
      return;
    }

    try {
      audit.clearBuffer();
      const config = await auditClearLogs();
      applyConfig(config);
      set(applyConfigToStore(config));
    } catch (error) {
      console.debug("[audit] clearLogs failed", error);
    }
  },

  clearRenderLogs: async (target: RenderLogClearTarget) => {
    if (!__AUDIT_ENABLED__) {
      return;
    }

    try {
      if (target === "standard" || target === "all") {
        renderAudit.clearStandardBuffer();
      }
      if (target === "verbose" || target === "all") {
        renderAudit.clearVerboseBuffer();
      }
      const config = await auditClearRenderLogs(target);
      applyConfig(config);
      set(applyConfigToStore(config));
    } catch (error) {
      console.debug("[audit] clearRenderLogs failed", error);
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
