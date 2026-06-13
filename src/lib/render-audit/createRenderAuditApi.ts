import { AuditRingBuffer } from "@/lib/audit/ringBuffer";
import type { AuditEntry, AuditLevel } from "@/lib/audit/types";
import {
  DEFAULT_RENDER_AUDIT_SETTINGS,
  MAX_UI_PAYLOAD_BYTES,
  MAX_UI_VERBOSE_PAYLOAD_BYTES,
  shouldLogUiLevel,
} from "@/lib/render-audit/defaults";
import { UI_EVENTS } from "@/lib/render-audit/events";
import { sanitizeUiPayload } from "@/lib/render-audit/sanitizeUiPayload";
import type {
  RenderAuditApi,
  RenderAuditSettings,
  UiLogChannel,
} from "@/lib/render-audit/types";

let entryCounter = 0;

function nextEntryId(): string {
  entryCounter += 1;
  return `fe-ui-${Date.now()}-${entryCounter}`;
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
        /* render audit nunca lanza */
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
          /* render audit nunca lanza */
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

export function createRenderAuditApi(
  initialSettings: Partial<RenderAuditSettings> = {},
): RenderAuditApi {
  let settings: RenderAuditSettings = {
    ...DEFAULT_RENDER_AUDIT_SETTINGS,
    ...initialSettings,
  };

  const standard = createChannelState(settings.renderMaxBufferSize);
  const verbose = createChannelState(settings.renderVerboseMaxBufferSize);

  function logChannel(
    channel: "standard" | "verbose",
    level: AuditLevel,
    event: string,
    payload?: Record<string, unknown>,
  ): void {
    const enabled =
      channel === "standard" ? settings.renderLogEnabled : settings.renderVerboseEnabled;
    const minLevel =
      channel === "standard" ? settings.renderLevel : settings.renderVerboseLevel;
    if (!enabled || !shouldLogUiLevel(level, minLevel)) {
      return;
    }

    try {
      const maxBytes =
        channel === "standard" ? MAX_UI_PAYLOAD_BYTES : MAX_UI_VERBOSE_PAYLOAD_BYTES;
      const safePayload = sanitizeUiPayload(
        payload ? { ...payload, channel } : { channel },
        maxBytes,
      );
      const entry: AuditEntry = {
        id: nextEntryId(),
        ts: Date.now(),
        level,
        domain: "ui",
        event,
        source: "frontend",
      };
      if (safePayload) {
        entry.payload = safePayload;
      }
      if (channel === "standard") {
        standard.push(entry);
      } else {
        verbose.push(entry);
      }
    } catch {
      /* render audit nunca lanza */
    }
  }

  return {
    ui(event, payload, options) {
      const channel: UiLogChannel = options?.channel ?? "standard";
      const level: AuditLevel = options?.level ?? "info";
      if (channel === "both") {
        logChannel("standard", level, event, payload);
        logChannel("verbose", level, event, payload);
        return;
      }
      logChannel(channel, level, event, payload);
    },

    isStandardEnabled: () => settings.renderLogEnabled,
    isVerboseEnabled: () => settings.renderVerboseEnabled,

    setStandardEnabled(enabled: boolean) {
      settings = { ...settings, renderLogEnabled: enabled };
    },

    setVerboseEnabled(enabled: boolean) {
      settings = { ...settings, renderVerboseEnabled: enabled };
    },

    getSettings: () => ({ ...settings }),

    patchSettings(patch: Partial<RenderAuditSettings>) {
      settings = { ...settings, ...patch };
      if (patch.renderMaxBufferSize != null) {
        standard.resize(patch.renderMaxBufferSize);
      }
      if (patch.renderVerboseMaxBufferSize != null) {
        verbose.resize(patch.renderVerboseMaxBufferSize);
      }
    },

    getStandardSnapshot: () => standard.getSnapshot(),
    getVerboseSnapshot: () => verbose.getSnapshot(),
    subscribeStandard: (listener) => standard.subscribe(listener),
    subscribeVerbose: (listener) => verbose.subscribe(listener),
    clearStandardBuffer: () => standard.clear(),
    clearVerboseBuffer: () => verbose.clear(),
    setStandardPersistHandler: (handler) => standard.setPersistHandler(handler),
    setVerbosePersistHandler: (handler) => verbose.setPersistHandler(handler),

    reportDegraded(reason: string) {
      if (!settings.renderLogEnabled && !settings.renderVerboseEnabled) {
        return;
      }
      logChannel("standard", "warn", UI_EVENTS.render.degraded, { reason });
    },
  };
}
