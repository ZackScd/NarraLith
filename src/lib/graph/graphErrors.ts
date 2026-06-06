import type { AppErrorPayload } from "@/lib/ipc";

const GRAPH_ERROR_PREFIX = "errors.";

export function graphErrorKey(err: AppErrorPayload | null): string {
  if (!err?.key) {
    return "errors.generic";
  }
  if (err.key.startsWith("error.graph.")) {
    return `${GRAPH_ERROR_PREFIX}${err.key.replace("error.graph.", "")}`;
  }
  return "errors.generic";
}
