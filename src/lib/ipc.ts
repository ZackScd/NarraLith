import { auditInvoke } from "@/lib/audit/auditInvoke";

/** Error IPC desde Rust (`AppError`). */
export interface AppErrorPayload {
  key: string;
  details?: string;
}

export function parseAppError(error: unknown): AppErrorPayload | null {
  if (isAppError(error)) {
    return error;
  }
  if (typeof error === "string") {
    try {
      const parsed: unknown = JSON.parse(error);
      if (isAppError(parsed)) {
        return parsed;
      }
    } catch {
      return null;
    }
  }
  return null;
}

export function isAppError(error: unknown): error is AppErrorPayload {
  return (
    typeof error === "object" &&
    error !== null &&
    "key" in error &&
    typeof (error as AppErrorPayload).key === "string"
  );
}

export async function invokeCommand<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  return auditInvoke<T>(cmd, args);
}
