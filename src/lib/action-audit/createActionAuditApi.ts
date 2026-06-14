import { AuditRingBuffer } from "@/lib/audit/ringBuffer";
import type { AuditEntry, AuditLevel } from "@/lib/audit/types";
import {
  DEFAULT_ACTION_AUDIT_SETTINGS,
  MAX_ACTION_PAYLOAD_BYTES,
  MAX_ACTION_VERBOSE_PAYLOAD_BYTES,
  shouldLogActionLevel,
} from "@/lib/action-audit/defaults";
import { sanitizeActionPayload } from "@/lib/action-audit/sanitizeActionPayload";
import type {
  ActionArea,
  ActionAuditApi,
  ActionAuditSettings,
  ActionLogChannel,
} from "@/lib/action-audit/types";

let entryCounter = 0;

function nextEntryId(): string {
  entryCounter += 1;
  return `fe-action-${Date.now()}-${entryCounter}`;
}

function createChannelState(maxSize: number) {
  let buffer = new AuditRingBuffer(maxSize);
  let snapshot: AuditEntry[] = buffer.toArray();
  let persistHandler: ((entry: AuditEntry) => void) | null = null;
  const listeners = new Set<() => void>();

  function emitChange(): void {
    snapshot = buffer.toArray();
    for (const listener of listeners) {
      try {
        listener();
      } catch {
        /* action audit nunca lanza */
      }
    }
  }

  return {
    push(entry: AuditEntry) {
      buffer.push(entry);
      emitChange();
      if (persistHandler) {
        try {
          persistHandler(entry);
        } catch {
          /* action audit nunca lanza */
        }
      }
    },
    resize(max: number) {
      buffer.resize(max);
    },
    clear() {
      buffer.clear();
      emitChange();
    },
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setPersistHandler(handler: ((entry: AuditEntry) => void) | null) {
      persistHandler = handler;
    },
  };
}

export function createActionAuditApi(
  initialSettings: Partial<ActionAuditSettings> = {},
): ActionAuditApi {
  let settings: ActionAuditSettings = {
    ...DEFAULT_ACTION_AUDIT_SETTINGS,
    ...initialSettings,
  };

  const session = createChannelState(settings.actionMaxBufferSize);
  const verbose = createChannelState(settings.actionVerboseMaxBufferSize);

  function logChannel(
    channel: ActionLogChannel,
    level: AuditLevel,
    area: ActionArea,
    action: string,
    payload?: Record<string, unknown>,
  ): void {
    const enabled =
      channel === "session" ? settings.actionLogEnabled : settings.actionVerboseEnabled;
    const minLevel = channel === "session" ? settings.actionLevel : settings.actionVerboseLevel;
    if (!enabled || !shouldLogActionLevel(level, minLevel)) {
      return;
    }

    try {
      const maxBytes =
        channel === "session" ? MAX_ACTION_PAYLOAD_BYTES : MAX_ACTION_VERBOSE_PAYLOAD_BYTES;
      const basePayload = {
        channel,
        area,
        action,
        ...payload,
      };
      const safePayload = sanitizeActionPayload(basePayload, maxBytes);
      const entry: AuditEntry = {
        id: nextEntryId(),
        ts: Date.now(),
        level,
        domain: "action",
        event: `obs.action.${area}.${action}`,
        source: "frontend",
      };
      if (safePayload) {
        entry.payload = safePayload;
      }
      if (channel === "session") {
        session.push(entry);
      } else {
        verbose.push(entry);
      }
    } catch {
      /* action audit nunca lanza */
    }
  }

  return {
    track(area, action, payload, options) {
      const channel = options?.channel ?? "session";
      const level = options?.level ?? "info";
      if (channel === "both") {
        logChannel("session", level, area, action, payload);
        logChannel("verbose", level, area, action, payload);
        return;
      }
      logChannel(channel, level, area, action, payload);
    },

    isSessionEnabled: () => settings.actionLogEnabled,
    isVerboseEnabled: () => settings.actionVerboseEnabled,

    setSessionEnabled(enabled: boolean) {
      settings = { ...settings, actionLogEnabled: enabled };
    },

    setVerboseEnabled(enabled: boolean) {
      settings = { ...settings, actionVerboseEnabled: enabled };
    },

    getSettings: () => ({ ...settings }),

    patchSettings(patch: Partial<ActionAuditSettings>) {
      settings = { ...settings, ...patch };
      if (patch.actionMaxBufferSize != null) {
        session.resize(patch.actionMaxBufferSize);
      }
      if (patch.actionVerboseMaxBufferSize != null) {
        verbose.resize(patch.actionVerboseMaxBufferSize);
      }
    },

    getSessionSnapshot: () => session.getSnapshot(),
    getVerboseSnapshot: () => verbose.getSnapshot(),
    subscribeSession: (listener) => session.subscribe(listener),
    subscribeVerbose: (listener) => verbose.subscribe(listener),
    clearSessionBuffer: () => session.clear(),
    clearVerboseBuffer: () => verbose.clear(),
    setSessionPersistHandler: (handler) => session.setPersistHandler(handler),
    setVerbosePersistHandler: (handler) => verbose.setPersistHandler(handler),

    reportDegraded(reason: string) {
      if (!settings.actionLogEnabled && !settings.actionVerboseEnabled) {
        return;
      }
      logChannel("session", "warn", "system", "degraded", { reason });
    },
  };
}
