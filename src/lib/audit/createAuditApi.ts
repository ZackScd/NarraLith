import {
  AUDIT_LEVEL_RANK,
  DEFAULT_AUDIT_SETTINGS,
} from "@/lib/audit/defaults";
import { AuditRingBuffer } from "@/lib/audit/ringBuffer";
import { sanitizeAuditPayload } from "@/lib/audit/sanitizePayload";
import type {
  AuditApi,
  AuditDebugSettings,
  AuditDomain,
  AuditEntry,
  AuditLevel,
} from "@/lib/audit/types";

let entryCounter = 0;
let correlationCounter = 0;

function nextEntryId(): string {
  entryCounter += 1;
  return `fe-${Date.now()}-${entryCounter}`;
}

export function createAuditApi(
  initialSettings: Partial<AuditDebugSettings> = {},
): AuditApi {
  let settings: AuditDebugSettings = {
    ...DEFAULT_AUDIT_SETTINGS,
    ...initialSettings,
  };
  let buffer = new AuditRingBuffer(settings.maxBufferSize);
  let snapshot: AuditEntry[] = buffer.toArray();
  let correlationId: string | null = null;
  let persistHandler: ((entry: AuditEntry) => void) | null = null;
  const correlationStack: Array<string | null> = [];
  const listeners = new Set<() => void>();

  /** Referencia estable para `useSyncExternalStore` — solo cambia cuando el buffer muta. */
  function emitChange(): void {
    snapshot = buffer.toArray();
    for (const listener of listeners) {
      try {
        listener();
      } catch {
        // audit nunca lanza
      }
    }
  }

  function shouldLog(level: AuditLevel): boolean {
    if (!settings.enabled) {
      return false;
    }
    return AUDIT_LEVEL_RANK[level] >= AUDIT_LEVEL_RANK[settings.level];
  }

  function log(
    level: AuditLevel,
    domain: AuditDomain,
    event: string,
    payload?: Record<string, unknown>,
    message?: string,
  ): void {
    if (!shouldLog(level)) {
      return;
    }

    try {
      const entry: AuditEntry = {
        id: nextEntryId(),
        ts: Date.now(),
        level,
        domain,
        event,
        source: "frontend",
      };
      if (message) {
        entry.message = message;
      }
      if (correlationId) {
        entry.correlationId = correlationId;
      }
      const safePayload = sanitizeAuditPayload(payload);
      if (safePayload) {
        entry.payload = safePayload;
      }
      buffer.push(entry);
      emitChange();
      if (persistHandler) {
        try {
          persistHandler(entry);
        } catch {
          // audit nunca lanza
        }
      }
    } catch {
      // audit nunca lanza
    }
  }

  return {
    trace: (domain, event, payload, message) =>
      log("trace", domain, event, payload, message),
    debug: (domain, event, payload, message) =>
      log("debug", domain, event, payload, message),
    info: (domain, event, payload, message) =>
      log("info", domain, event, payload, message),
    warn: (domain, event, payload, message) =>
      log("warn", domain, event, payload, message),
    error: (domain, event, payload, message) =>
      log("error", domain, event, payload, message),

    withCorrelation<T>(id: string, fn: () => T): T {
      const prev = correlationId;
      correlationId = id;
      try {
        return fn();
      } finally {
        correlationId = prev;
      }
    },

    async withCorrelationAsync<T>(id: string, fn: () => Promise<T>): Promise<T> {
      const prev = correlationId;
      correlationId = id;
      try {
        return await fn();
      } finally {
        correlationId = prev;
      }
    },

    beginCorrelation(id?: string): string {
      correlationStack.push(correlationId);
      const nextId = id ?? `corr-${Date.now()}-${++correlationCounter}`;
      correlationId = nextId;
      return nextId;
    },

    endCorrelation() {
      correlationId = correlationStack.pop() ?? null;
    },

    getCorrelationId: () => correlationId,

    isEnabled: () => settings.enabled,

    setEnabled(enabled: boolean) {
      settings = { ...settings, enabled };
    },

    getSettings: () => ({ ...settings }),

    patchSettings(patch: Partial<AuditDebugSettings>) {
      settings = { ...settings, ...patch };
      if (patch.maxBufferSize != null) {
        buffer.resize(patch.maxBufferSize);
      }
    },

    getEntries: (limit?: number) => buffer.toArray(limit),

    clearBuffer: () => {
      buffer.clear();
      emitChange();
    },

    setPersistHandler(handler: ((entry: AuditEntry) => void) | null) {
      persistHandler = handler;
    },

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getSnapshot: () => snapshot,

    reportDegraded(reason: string) {
      if (!shouldLog("warn")) {
        return;
      }
      try {
        const entry: AuditEntry = {
          id: nextEntryId(),
          ts: Date.now(),
          level: "warn",
          domain: "system",
          event: "obs.system.audit.degraded",
          source: "frontend",
          payload: { reason },
        };
        buffer.push(entry);
        emitChange();
      } catch {
        // audit nunca lanza
      }
    },
  };
}
