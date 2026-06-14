import { useExplorerActionAudit } from "@/lib/action-audit/hooks/useExplorerActionAudit";
import { useLayoutActionAudit } from "@/lib/action-audit/hooks/useLayoutActionAudit";
import { useTimelineActionAudit } from "@/lib/action-audit/hooks/useTimelineActionAudit";
import { useWorkspaceActionAudit } from "@/lib/action-audit/hooks/useWorkspaceActionAudit";

/** Monta hooks de instrumentación OBS-003 transversal (Fases 1–2). */
export function useUiActionAudit(): void {
  useWorkspaceActionAudit();
  useExplorerActionAudit();
  useTimelineActionAudit();
  useLayoutActionAudit();
}
