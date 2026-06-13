import { DEFAULT_RENDER_AUDIT_SETTINGS } from "@/lib/render-audit/defaults";
import type { RenderAuditApi, RenderAuditSettings } from "@/lib/render-audit/types";

const noop = (): void => {};

export function createStubRenderAuditApi(): RenderAuditApi {
  const settings: RenderAuditSettings = { ...DEFAULT_RENDER_AUDIT_SETTINGS };

  return {
    ui: noop,
    isStandardEnabled: () => false,
    isVerboseEnabled: () => false,
    setStandardEnabled: noop,
    setVerboseEnabled: noop,
    getSettings: () => settings,
    patchSettings: noop,
    getStandardSnapshot: () => [],
    getVerboseSnapshot: () => [],
    subscribeStandard: () => noop,
    subscribeVerbose: () => noop,
    clearStandardBuffer: noop,
    clearVerboseBuffer: noop,
    setStandardPersistHandler: noop,
    setVerbosePersistHandler: noop,
    reportDegraded: noop,
  };
}
