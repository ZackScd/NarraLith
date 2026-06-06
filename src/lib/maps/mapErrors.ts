import type { AppErrorPayload } from "@/lib/ipc";

export function mapErrorKey(err: AppErrorPayload | null): string {
  if (err?.key?.startsWith("error.maps.")) {
    return err.key.replace("error.maps.", "errors.");
  }
  return "errors.generic";
}
