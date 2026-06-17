import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  clampToCalendar,
  findLastAddedTimeInManuscript,
  parseTimeTag,
} from "@/lib/calendar/dateTags";
import { parseInlineTagsInText } from "@/lib/editor/inlineTagSyntax";
import {
  timeTagFromEventSegment,
} from "@/lib/editor/manuscriptBlocks";
import { legacyBlockIndexFromContext } from "@/lib/editor/documentSync";
import { fromAbsoluteDay, toAbsoluteDay } from "@/lib/calendar/engine";
import { calendarDatesEqual } from "@/lib/calendar/formatCalendarDisplayDate";
import { resolveGlobalLastAddedTime } from "@/lib/calendar/lastProjectTime";
import { shiftCalendarMonth } from "@/lib/calendar/monthGrid";
import type { CalendarAnnualEvent } from "@/lib/types/calendar";
import { useProjectTimeline } from "@/hooks/useProjectTimeline";
import { useCalendarStore } from "@/stores/useCalendarStore";
import { useEditorStore } from "@/stores/useEditorStore";
import { useManuscriptLabelDraftStore } from "@/stores/useManuscriptLabelDraftStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useTimeTagDialogStore } from "@/stores/useTimeTagDialogStore";

import {
  DateDisplayRow,
  SideAddTimeButton,
  SideTimeCalendarCard,
  type SideCalendarViewMode,
} from "./SideTimeCalendarCard";

export function SideTimeSection() {
  const { t } = useTranslation("editor");

  const calendar = useCalendarStore((s) => s.config);
  const loadCalendar = useCalendarStore((s) => s.loadCalendar);

  const manuscript = useEditorStore((s) => s.manuscript);
  const activeFilePath = useEditorStore((s) => s.activeFilePath);
  const activeTabKind = useEditorStore((s) => s.activeTabKind);
  const activeEventContext = useEditorStore((s) => s.activeEventContext);

  const panelDateDisplayFormat = useSettingsStore((s) => s.panelDateDisplayFormat);

  const { events, lastAdded } = useProjectTimeline();

  const dialogIsOpen = useTimeTagDialogStore((s) => s.isOpen);
  const dialogFilePath = useTimeTagDialogStore((s) => s.filePath);
  const dialogDraft = useTimeTagDialogStore((s) => s.draft);
  const openDialog = useTimeTagDialogStore((s) => s.open);
  const closeDialog = useTimeTagDialogStore((s) => s.close);

  const pending = useManuscriptLabelDraftStore((s) => s.pending);

  const [calendarViewMode, setCalendarViewMode] =
    useState<SideCalendarViewMode>("week");

  useEffect(() => {
    if (!calendar) {
      void loadCalendar();
    }
  }, [calendar, loadCalendar]);

  const documentLast = useMemo(() => findLastAddedTimeInManuscript(manuscript), [manuscript]);

  const globalLast = useMemo(
    () => resolveGlobalLastAddedTime(lastAdded, events),
    [lastAdded, events],
  );

  const showDocumentRow =
    documentLast !== null && !calendarDatesEqual(documentLast, globalLast);

  const activeBlockIndex = legacyBlockIndexFromContext(activeEventContext);

  const activeEventSegment =
    activeTabKind === "manuscript" && activeEventContext.inEvent && activeEventContext.segmentIndex !== null
      ? manuscript?.segments[activeEventContext.segmentIndex]
      : null;
  const activeBlockTime = useMemo(() => {
    if (!activeEventSegment || activeEventSegment.kind !== "event") {
      return null;
    }
    return parseTimeTag(timeTagFromEventSegment(activeEventSegment));
  }, [activeEventSegment]);

  const fallbackDate = useMemo(
    () => documentLast ?? globalLast ?? { day: 1, month: 1, year: 0 },
    [documentLast, globalLast],
  );

  const hasWeekAnchor = documentLast !== null || globalLast !== null;

  const [anchor, setAnchor] = useState<{ day: number; month: number; year: number }>(
    fallbackDate,
  );

  useEffect(() => {
    queueMicrotask(() => setAnchor(fallbackDate));
  }, [fallbackDate]);

  const isManuscriptTab = activeTabKind === "manuscript";
  const canEdit = isManuscriptTab && Boolean(activeFilePath);

  const pendingForActive =
    pending && pending.filePath === activeFilePath ? pending.time : null;

  const pendingDraft = pendingForActive?.draft ?? null;

  const isEditingThisBlock = dialogIsOpen && dialogFilePath === activeFilePath;

  const displayParts = pendingDraft
    ? { day: pendingDraft.day, month: pendingDraft.month, year: pendingDraft.year }
    : isEditingThisBlock
      ? { day: dialogDraft.day, month: dialogDraft.month, year: dialogDraft.year }
      : null;

  const displayHour = pendingDraft
    ? (pendingDraft.hour ?? null)
    : isEditingThisBlock
      ? (dialogDraft.hour ?? null)
      : null;

  const storyDayKeys = useMemo(() => {
    const set = new Set<string>();
    if (!manuscript) return set;
    for (const tag of parseInlineTagsInText(manuscript.fileHeader.body)) {
      if (tag.type !== "time") {
        continue;
      }
      const inline = parseTimeTag(tag.value);
      if (inline) {
        set.add(`${inline.month}:${inline.day}:${inline.year}`);
      }
    }
    for (const segment of manuscript.segments) {
      if (segment.kind === "event") {
        const parts = parseTimeTag(timeTagFromEventSegment(segment));
        if (parts) {
          set.add(`${parts.month}:${parts.day}:${parts.year}`);
        }
      }
      for (const tag of parseInlineTagsInText(segment.body)) {
        if (tag.type !== "time") {
          continue;
        }
        const inline = parseTimeTag(tag.value);
        if (inline) {
          set.add(`${inline.month}:${inline.day}:${inline.year}`);
        }
      }
    }
    return set;
  }, [manuscript]);

  const annualByKey = useMemo(() => {
    const map = new Map<string, CalendarAnnualEvent[]>();
    for (const ev of calendar?.annualEvents ?? []) {
      const key = `${ev.month}:${ev.day}`;
      const list = map.get(key);
      if (list) list.push(ev);
      else map.set(key, [ev]);
    }
    return map;
  }, [calendar]);

  if (!calendar) {
    return (
      <section className="border-b border-border/60 px-3 py-3 text-xs text-muted-foreground">
        {t("panel.calendarLoading")}
      </section>
    );
  }

  const shiftWeek = (deltaWeeks: number) => {
    const daysPerWeek = Math.max(1, calendar.daysPerWeek);
    const abs = toAbsoluteDay(anchor, calendar);
    const next = abs + BigInt(deltaWeeks * daysPerWeek);
    setAnchor(fromAbsoluteDay(next, calendar));
  };

  const handlePrev = () => {
    if (calendarViewMode === "week") {
      shiftWeek(-1);
    } else {
      setAnchor(shiftCalendarMonth(anchor, -1, calendar));
    }
  };

  const handleNext = () => {
    if (calendarViewMode === "week") {
      shiftWeek(1);
    } else {
      setAnchor(shiftCalendarMonth(anchor, 1, calendar));
    }
  };

  const handleToggleViewMode = () => {
    setCalendarViewMode((mode) => {
      const next = mode === "week" ? "month" : "week";
      if (next === "month") {
        setAnchor(fallbackDate);
      }
      return next;
    });
  };

  const handleAddTime = () => {
    if (!canEdit || !activeFilePath) return;
    if (isEditingThisBlock) {
      closeDialog();
      return;
    }

    const initialParts = pendingDraft ?? activeBlockTime ?? documentLast ?? anchor;
    const initial = clampToCalendar(initialParts, calendar);
    openDialog({
      filePath: activeFilePath,
      blockIndex: activeBlockIndex,
      initial: { ...initial, hour: pendingDraft?.hour ?? null },
    });
  };

  return (
    <section className="flex shrink-0 flex-col gap-3 border-b border-border/60 px-3 py-3">
      <div>
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {t("panel.lastAddedTitle")}
        </p>
        <DateDisplayRow
          parts={globalLast}
          emptyLabel={t("panel.noLastDate")}
          calendar={calendar}
          displayMode={panelDateDisplayFormat}
        />
      </div>

      <SideTimeCalendarCard
        calendar={calendar}
        displayMode={panelDateDisplayFormat}
        documentLast={documentLast}
        globalLast={globalLast}
        showDocumentRow={showDocumentRow}
        anchor={anchor}
        fallbackDate={fallbackDate}
        hasWeekAnchor={hasWeekAnchor}
        calendarViewMode={calendarViewMode}
        onToggleViewMode={handleToggleViewMode}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={() => setAnchor(fallbackDate)}
        storyDayKeys={storyDayKeys}
        annualByKey={annualByKey}
        addTimeButton={
          <SideAddTimeButton
            canEdit={canEdit}
            isEditingThisBlock={isEditingThisBlock}
            pendingForActive={Boolean(pendingForActive)}
            displayParts={displayParts}
            displayHour={displayHour}
            calendar={calendar}
            onClick={handleAddTime}
          />
        }
      />
    </section>
  );
}
