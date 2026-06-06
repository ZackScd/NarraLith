import { invokeCommand, parseAppError } from "@/lib/ipc";

export type EnsureEventEntityResult =
  | { ok: true; path: string }
  | { ok: false; errorKey: string };

/** Crea o reutiliza ficha WB en `Worldbuilding/Eventos/` (§1.10, D1). */
export async function ensureEventEntityPath(params: {
  name: string;
  description: string;
  sourcePath: string;
}): Promise<EnsureEventEntityResult> {
  try {
    const path = await invokeCommand<string>("ensure_event_entity", {
      name: params.name,
      description: params.description,
      sourcePath: params.sourcePath,
    });
    return { ok: true, path };
  } catch (err) {
    return {
      ok: false,
      errorKey: parseAppError(err)?.key ?? "error.entity.ensure_failed",
    };
  }
}
