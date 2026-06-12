import { DEFAULT_AUDIT_SETTINGS } from "@/lib/audit/defaults";
import type { AuditApi, AuditDebugSettings, AuditDomain } from "@/lib/audit/types";

const noop = (): void => {};

function noopLog(
  _domain: AuditDomain,
  _event: string,
  _payload?: Record<string, unknown>,
  _message?: string,
): void {
  noop();
}

/** API no-op para builds release (`__AUDIT_ENABLED__ === false`). */
export function createStubAuditApi(): AuditApi {
  const settings: AuditDebugSettings = { ...DEFAULT_AUDIT_SETTINGS, enabled: false };

  return {
    trace: noopLog,
    debug: noopLog,
    info: noopLog,
    warn: noopLog,
    error: noopLog,
    withCorrelation: (_id, fn) => fn(),
    withCorrelationAsync: async (_id, fn) => fn(),
    beginCorrelation: () => "",
    endCorrelation: noop,
    getCorrelationId: () => null,
    isEnabled: () => false,
    setEnabled: noop,
    getSettings: () => settings,
    patchSettings: noop,
    getEntries: () => [],
    clearBuffer: noop,
    setPersistHandler: noop,
    subscribe: () => () => {},
    getSnapshot: () => [],
    reportDegraded: noop,
  };
}
