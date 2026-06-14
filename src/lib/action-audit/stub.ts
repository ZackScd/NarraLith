import { DEFAULT_ACTION_AUDIT_SETTINGS } from "@/lib/action-audit/defaults";
import type { ActionAuditApi, ActionAuditSettings } from "@/lib/action-audit/types";

const noop = (): void => {};

export function createStubActionAuditApi(): ActionAuditApi {
  const settings: ActionAuditSettings = { ...DEFAULT_ACTION_AUDIT_SETTINGS };

  return {
    track: noop,
    isSessionEnabled: () => false,
    isVerboseEnabled: () => false,
    setSessionEnabled: noop,
    setVerboseEnabled: noop,
    getSettings: () => settings,
    patchSettings: noop,
    getSessionSnapshot: () => [],
    getVerboseSnapshot: () => [],
    subscribeSession: () => noop,
    subscribeVerbose: () => noop,
    clearSessionBuffer: noop,
    clearVerboseBuffer: noop,
    setSessionPersistHandler: noop,
    setVerbosePersistHandler: noop,
    reportDegraded: noop,
  };
}
