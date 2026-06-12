import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

import { audit } from "@/lib/audit";
import { auditAppendEntry } from "@/lib/audit/ipc";
import type { FsChangeEvent } from "@/lib/types/fs";
import { useAuditStore } from "@/stores/useAuditStore";

let bootstrapPromise: Promise<void> | null = null;
let persistConfigured = false;
let eventListenersReady = false;
let persistDegraded = false;

function ensurePersistHandler(): void {
  if (persistConfigured || !__AUDIT_ENABLED__) {
    return;
  }
  persistConfigured = true;

  audit.setPersistHandler((entry) => {
    void auditAppendEntry(entry).catch((error) => {
      console.debug("[audit] append failed", error);
      if (!persistDegraded) {
        persistDegraded = true;
        audit.reportDegraded("append_failed");
      }
    });
  });
}

async function ensureAuditEventListeners(): Promise<void> {
  if (eventListenersReady || !__AUDIT_ENABLED__) {
    return;
  }
  eventListenersReady = true;

  await listen<FsChangeEvent>("fs-changed", (event) => {
    const { kind, paths, fromPath } = event.payload;
    audit.info("fs", "obs.fs.changed", {
      kind,
      paths,
      ...(fromPath ? { fromPath } : {}),
    });
  });

  await listen<{ issues?: unknown[] }>("consistency-updated", (event) => {
    audit.info("system", "obs.consistency.updated", {
      issueCount: Array.isArray(event.payload?.issues)
        ? event.payload.issues.length
        : 0,
    });
  });

  await listen("graph-index-updated", () => {
    audit.info("system", "obs.graph.index.updated", {});
  });
}

async function runAuditBootstrap(): Promise<void> {
  if (!__AUDIT_ENABLED__) {
    return;
  }

  ensurePersistHandler();
  await useAuditStore.getState().bootstrap();

  if (!useAuditStore.getState().bootstrapped) {
    return;
  }

  await ensureAuditEventListeners();
}

/**
 * Arranque OBS-001: one-shot, sesión NDJSON, persistencia TS→Rust.
 * Idempotente (StrictMode). Debe montarse **antes** de `useFsWatcher`.
 */
export function useAuditBootstrap() {
  useEffect(() => {
    if (!__AUDIT_ENABLED__) {
      return;
    }

    if (!bootstrapPromise) {
      bootstrapPromise = runAuditBootstrap();
    }

    void bootstrapPromise;
  }, []);
}
