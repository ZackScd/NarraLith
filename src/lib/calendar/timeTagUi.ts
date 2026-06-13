import type { TFunction } from "i18next";

import type { TimeTagStatus } from "@/lib/calendar/classifyTimeTag";

export function isStaleTimeTagStatus(status: TimeTagStatus): boolean {
  return status === "invalid" || status === "structure_stale";
}

export function timeTagTooltipTitle(
  t: TFunction<"editor">,
  status: TimeTagStatus | undefined,
  raw: string,
): string {
  if (status === "structure_stale") {
    return t("timeTag.structureStale");
  }
  if (status === "invalid") {
    return t("timeTag.invalidDetail", { raw });
  }
  return t("metadata.time");
}

export function staleTimeTagTooltipTitle(
  t: TFunction<"editor">,
  status: TimeTagStatus,
  raw: string,
): string | undefined {
  if (!isStaleTimeTagStatus(status)) {
    return undefined;
  }
  return timeTagTooltipTitle(t, status, raw);
}
