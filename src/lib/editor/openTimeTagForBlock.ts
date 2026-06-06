import { clampToCalendar, parseTimeTag } from "@/lib/calendar/dateTags";
import { timeTagFromBlockMetadata } from "@/lib/editor/manuscriptBlocks";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { TimeDraft } from "@/stores/useTimeTagDialogStore";

export interface OpenTimeTagDialogFn {
  (params: {
    filePath: string;
    blockIndex: number;
    initial: TimeDraft;
    commitOnSave?: boolean;
  }): void;
}

/** Abre el diálogo de etiqueta de tiempo para un bloque concreto. */
export function openTimeTagForBlock(params: {
  filePath: string;
  blockIndex: number;
  metadata: Record<string, unknown> | undefined;
  rightPanelCollapsed: boolean;
  calendar: CalendarConfig;
  openTimeDialog: OpenTimeTagDialogFn;
}): void {
  const {
    filePath,
    blockIndex,
    metadata,
    rightPanelCollapsed,
    calendar,
    openTimeDialog,
  } = params;

  const parsed = parseTimeTag(timeTagFromBlockMetadata(metadata));
  const initial = clampToCalendar(
    parsed ?? {
      day: calendar.epoch.day,
      month: calendar.epoch.month,
      year: calendar.epoch.year,
    },
    calendar,
  );

  openTimeDialog({
    filePath,
    blockIndex,
    initial: { ...initial, hour: null },
    commitOnSave: rightPanelCollapsed,
  });
}
