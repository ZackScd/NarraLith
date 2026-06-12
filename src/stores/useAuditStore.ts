import { create } from "zustand";

import { audit } from "@/lib/audit";
import {
  auditBootstrap,
  auditClearLogs,
  auditPatchSettings,
  auditSetEnabled,
} from "@/lib/audit/ipc";
import type { AuditConfigResponse, AuditDebugSettings } from "@/lib/types/audit";

interface AuditStoreState {
  bootstrapped: boolean;
  bootstrapping: boolean;
  sessionLogPath: string | null;
  repoDebugRoot: string | null;
  settings: AuditDebugSettings | null;
  bootstrap: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
  patchSettings: (patch: Partial<AuditDebugSettings>) => Promise<void>;
  clearLogs: () => Promise<void>;
  viewerOpen: boolean;
  setViewerOpen: (open: boolean) => void;
  toggleViewer: () => void;
}

function applyConfig(config: AuditConfigResponse): void {
  audit.setEnabled(config.settings.enabled);
  audit.patchSettings(config.settings);
}

export const useAuditStore = create<AuditStoreState>((set, get) => ({
  bootstrapped: false,
  bootstrapping: false,
  sessionLogPath: null,
  repoDebugRoot: null,
  settings: null,
  viewerOpen: false,

  bootstrap: async () => {
    if (!__AUDIT_ENABLED__) {
      return;
    }
    if (get().bootstrapped || get().bootstrapping) {
      return;
    }

    set({ bootstrapping: true });

    try {
      const config = await auditBootstrap();
      applyConfig(config);
      set({
        bootstrapped: true,
        bootstrapping: false,
        sessionLogPath: config.sessionLogPath,
        repoDebugRoot: config.repoDebugRoot,
        settings: config.settings,
      });
      audit.info("system", "obs.system.audit.bootstrap", {
        sessionLogPath: config.sessionLogPath,
        enabled: config.settings.enabled,
        clearLogsOnNextBoot: config.settings.clearLogsOnNextBoot,
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
      set({
        settings: config.settings,
        sessionLogPath: config.sessionLogPath,
        repoDebugRoot: config.repoDebugRoot,
      });
    } catch (error) {
      console.debug("[audit] setEnabled failed", error);
    }
  },

  patchSettings: async (patch: Partial<AuditDebugSettings>) => {
    if (!__AUDIT_ENABLED__) {
      return;
    }

    try {
      const config = await auditPatchSettings(patch);
      applyConfig(config);
      set({
        settings: config.settings,
        sessionLogPath: config.sessionLogPath,
        repoDebugRoot: config.repoDebugRoot,
      });
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
      set({
        settings: config.settings,
        sessionLogPath: config.sessionLogPath,
        repoDebugRoot: config.repoDebugRoot,
      });
    } catch (error) {
      console.debug("[audit] clearLogs failed", error);
    }
  },

  setViewerOpen: (open: boolean) => {
    if (!__AUDIT_ENABLED__) {
      return;
    }
    set({ viewerOpen: open });
  },

  toggleViewer: () => {
    if (!__AUDIT_ENABLED__) {
      return;
    }
    set((state) => ({ viewerOpen: !state.viewerOpen }));
  },
}));
