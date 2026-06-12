import { invoke } from "@tauri-apps/api/core";

import { audit } from "@/lib/audit/instance";

const AUDIT_IPC_PREFIX = "audit_";

/** Comandos de alta frecuencia — sin log IPC en v1 (§13.3). */
const SKIP_IPC_AUDIT = new Set(["list_dir_tree"]);

function shouldAuditCommand(cmd: string): boolean {
  return (
    __AUDIT_ENABLED__ &&
    audit.isEnabled() &&
    !cmd.startsWith(AUDIT_IPC_PREFIX) &&
    !SKIP_IPC_AUDIT.has(cmd)
  );
}

function readPathArg(args?: Record<string, unknown>): string | undefined {
  if (!args) {
    return undefined;
  }
  if (typeof args.filePath === "string") {
    return args.filePath;
  }
  if (typeof args.path === "string") {
    return args.path;
  }
  return undefined;
}

/** Payload acotado para NDJSON — exportado para tests. */
export function buildAuditIpcPayload(
  cmd: string,
  args?: Record<string, unknown>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = { cmd };
  const path = readPathArg(args);
  if (path) {
    payload.path = path;
  }
  if (args) {
    payload.argKeys = Object.keys(args);
    if (audit.getSettings().logIpcArgs) {
      if (cmd === "save_manuscript" && args.manuscript && typeof args.manuscript === "object") {
        const segments = (args.manuscript as { segments?: unknown[] }).segments;
        if (Array.isArray(segments)) {
          payload.segmentCount = segments.length;
        }
      }
      if (cmd === "save_entity" && args.entity && typeof args.entity === "object") {
        payload.fieldCount = Object.keys(args.entity as object).length;
      }
    }
  }
  return payload;
}

function readIpcError(error: unknown): { key?: string; details?: string } {
  if (typeof error === "object" && error !== null && "key" in error) {
    const record = error as { key?: unknown; details?: unknown };
    return {
      key: typeof record.key === "string" ? record.key : undefined,
      details: typeof record.details === "string" ? record.details : undefined,
    };
  }
  return {};
}

export async function auditInvoke<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!shouldAuditCommand(cmd)) {
    return invoke<T>(cmd, args);
  }

  const startPayload = buildAuditIpcPayload(cmd, args);
  audit.debug("ipc", "obs.ipc.invoke.start", startPayload);
  const startedAt = performance.now();

  try {
    const result = await invoke<T>(cmd, args);
    audit.debug("ipc", "obs.ipc.invoke.end", {
      ...startPayload,
      durationMs: Math.round(performance.now() - startedAt),
    });
    return result;
  } catch (error) {
    const parsed = readIpcError(error);
    audit.warn("ipc", "obs.ipc.invoke.error", {
      ...startPayload,
      durationMs: Math.round(performance.now() - startedAt),
      errorKey: parsed?.key,
      ...(parsed?.details ? { details: parsed.details } : {}),
    });
    throw error;
  }
}
