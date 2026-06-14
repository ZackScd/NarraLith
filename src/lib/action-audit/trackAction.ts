import { actionAudit } from "@/lib/action-audit/instance";
import type { ActionArea, ActionLogOptions } from "@/lib/action-audit/types";

/** Emite acción de usuario (OBS-003). Early exit si ambos canales off. */
export function trackAction(
  area: ActionArea,
  action: string,
  payload?: Record<string, unknown>,
  options?: ActionLogOptions,
): void {
  actionAudit.track(area, action, payload, options);
}
