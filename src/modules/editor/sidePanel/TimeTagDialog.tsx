import { BookmarkPlus, Clock, GripHorizontal, Save, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { effectiveCalendarForYear } from "@/lib/calendar/effectiveCalendar";
import {
  historyMarkedDaysForYear,
  historyMarkedHoursForDay,
} from "@/lib/calendar/calendarMarkers";
import {
  clampToCalendar,
  daysInMonth,
  findLastAddedTimeInManuscript,
  formatTimeTag,
} from "@/lib/calendar/dateTags";
import type { CalendarDateParts } from "@/lib/calendar/formatCalendarDisplayDate";
import { shiftCalendarMonth } from "@/lib/calendar/monthGrid";
import { resolveGlobalLastAddedTime } from "@/lib/calendar/lastProjectTime";
import type { CalendarConfig } from "@/lib/types/calendar";
import type { ParsedManuscript } from "@/lib/types/manuscript";
import type { LastAddedTimeMarker, TimelineEvent } from "@/lib/types/timeline";
import { cn } from "@/lib/utils";
import { useProjectTimeline } from "@/hooks/useProjectTimeline";
import { useCalendarStore } from "@/stores/useCalendarStore";
import { useEditorStore } from "@/stores/useEditorStore";
import { useManuscriptLabelDraftStore } from "@/stores/useManuscriptLabelDraftStore";
import { useTimeTagDialogStore, type TimeDraft } from "@/stores/useTimeTagDialogStore";
import { legacyBlockIndexIsValid } from "@/lib/editor/manuscriptBlocks";
import {
  commitManuscriptLabel,
  runLabelCommit,
} from "@/lib/editor/commitManuscriptLabel";

import { TimeTagYearRow } from "./TimeTagYearRow";
import { TimeTagMarkedPicker } from "./TimeTagMarkedPicker";
import { TimeTagMonthCalendar } from "./TimeTagMonthCalendar";
import { TimeTagTimelinePreview } from "./TimeTagTimelinePreview";

const DIALOG_MIN_WIDTH = 240;
const DIALOG_MIN_HEIGHT = 360;
const DIALOG_HORIZONTAL_PADDING = 24;
const VIEWPORT_MARGIN = 8;

function clampPosition(
  x: number,
  y: number,
  dialogWidth: number,
): { x: number; y: number } {
  const w = typeof window !== "undefined" ? window.innerWidth : 1024;
  const h = typeof window !== "undefined" ? window.innerHeight : 720;
  const width = Math.max(DIALOG_MIN_WIDTH, dialogWidth);
  const maxX = Math.max(VIEWPORT_MARGIN, w - width - VIEWPORT_MARGIN);
  const maxY = Math.max(VIEWPORT_MARGIN, h - DIALOG_MIN_HEIGHT - VIEWPORT_MARGIN);
  return {
    x: Math.min(Math.max(VIEWPORT_MARGIN, x), maxX),
    y: Math.min(Math.max(VIEWPORT_MARGIN, y), maxY),
  };
}

export function TimeTagDialog() {
  const { t } = useTranslation("editor");

  const isOpen = useTimeTagDialogStore((s) => s.isOpen);
  const position = useTimeTagDialogStore((s) => s.position);
  const filePath = useTimeTagDialogStore((s) => s.filePath);
  const blockIndex = useTimeTagDialogStore((s) => s.blockIndex);
  const draft = useTimeTagDialogStore((s) => s.draft);
  const commitOnSave = useTimeTagDialogStore((s) => s.commitOnSave);
  const mode = useTimeTagDialogStore((s) => s.mode);
  const editTarget = useTimeTagDialogStore((s) => s.editTarget);
  const setPosition = useTimeTagDialogStore((s) => s.setPosition);
  const setDraft = useTimeTagDialogStore((s) => s.setDraft);
  const close = useTimeTagDialogStore((s) => s.close);
  const toggleTimelinePreview = useTimeTagDialogStore((s) => s.toggleTimelinePreview);
  const timelinePreviewOpen = useTimeTagDialogStore((s) => s.timelinePreviewOpen);

  const calendar = useCalendarStore((s) => s.config);
  const manuscript = useEditorStore((s) => s.manuscript);
  const activeFilePath = useEditorStore((s) => s.activeFilePath);
  const activeEventContext = useEditorStore((s) => s.activeEventContext);
  const insertInlineTagAtCursor = useEditorStore((s) => s.insertInlineTagAtCursor);
  const commitEventAtCursor = useEditorStore((s) => s.commitEventAtCursor);
  const updateEventAtCursor = useEditorStore((s) => s.updateEventAtCursor);
  const appendBarTimeToActiveEvent = useEditorStore(
    (s) => s.appendBarTimeToActiveEvent,
  );
  const updateInlineTimeTagAt = useEditorStore((s) => s.updateInlineTimeTagAt);
  const updateBarTimeTagAt = useEditorStore((s) => s.updateBarTimeTagAt);
  const stageTime = useManuscriptLabelDraftStore((s) => s.stageTime);
  const clearPending = useManuscriptLabelDraftStore((s) => s.clear);
  const { events, lastAdded, reload } = useProjectTimeline();

  useEffect(() => {
    if (isOpen) {
      void reload();
    }
  }, [isOpen, reload]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, close]);

  useEffect(() => {
    if (isOpen && filePath && activeFilePath !== filePath) {
      close();
    }
  }, [isOpen, filePath, activeFilePath, close]);

  if (!isOpen || !calendar || blockIndex === null || filePath === null) {
    return null;
  }

  if (typeof window === "undefined") return null;

  const yearCalendar = effectiveCalendarForYear(draft.year, calendar);
  const monthsLen = Math.max(1, yearCalendar.months.length);
  const safeMonth = Math.min(Math.max(1, draft.month), monthsLen);
  const monthLength = daysInMonth(safeMonth - 1, draft.year, calendar);
  const safeDay = Math.min(Math.max(1, draft.day), monthLength);

  const setDay = (n: number) => {
    if (Number.isNaN(n)) return;
    setDraft({ day: Math.max(1, n) });
  };
  const setMonth = (n: number) => {
    if (Number.isNaN(n)) return;
    setDraft({ month: Math.max(1, Math.min(monthsLen, n)) });
  };
  const setYear = (n: number) => {
    if (Number.isNaN(n)) return;
    setDraft({ year: n });
  };
  const setHour = (n: number | null) => {
    if (n === null) return setDraft({ hour: null });
    if (Number.isNaN(n)) return;
    setDraft({
      hour: Math.max(0, Math.min(Math.max(1, calendar.hoursPerDay) - 1, n)),
    });
  };

  const applyQuickDate = (parts: CalendarDateParts) => {
    const safe = clampToCalendar(parts, calendar);
    setDraft({ day: safe.day, month: safe.month, year: safe.year });
  };

  const handleSave = async () => {
    const safe = clampToCalendar(
      { day: safeDay, month: safeMonth, year: draft.year },
      calendar,
    );

    if (mode === "edit" && editTarget) {
      const timeTag = formatTimeTag(safe);
      const ok =
        editTarget.kind === "inline"
          ? updateInlineTimeTagAt(editTarget.nodeKey, timeTag)
          : updateBarTimeTagAt(
              editTarget.segmentId,
              editTarget.tagIndex,
              timeTag,
              draft.hour ?? null,
            );
      if (ok) {
        close();
      }
      return;
    }

    if (!legacyBlockIndexIsValid(manuscript, blockIndex)) return;

    if (commitOnSave) {
      const ok = runLabelCommit(() =>
        commitManuscriptLabel({
          pending: {
            filePath,
            eventSegmentIndex: null,
            event: null,
            time: {
              timeTag: formatTimeTag(safe),
              timeHour: draft.hour ?? null,
              draft: {
                day: safe.day,
                month: safe.month,
                year: safe.year,
                hour: draft.hour ?? null,
              },
            },
          },
          activeEventContext,
          insertInlineTagAtCursor,
          commitEventAtCursor,
          updateEventAtCursor,
          appendBarTimeToActiveEvent,
        }),
      );
      if (ok) {
        clearPending();
      }
    } else {
      stageTime({
        filePath,
        draft: {
          day: safe.day,
          month: safe.month,
          year: safe.year,
          hour: draft.hour ?? null,
        },
      });
    }

    close();
  };

  return (
    <>
      {createPortal(
        <DialogBody
          calendar={calendar}
          draft={draft}
          safeDay={safeDay}
          safeMonth={safeMonth}
          monthLength={monthLength}
          position={position}
          parsedManuscript={manuscript}
          events={events}
          lastAdded={lastAdded}
          onApplyQuickDate={applyQuickDate}
          onClose={close}
          onSetDay={setDay}
          setPosition={setPosition}
          onSetMonth={setMonth}
          onSetYear={setYear}
          onSetHour={setHour}
          onSave={() => void handleSave()}
          commitOnSave={commitOnSave}
          mode={mode}
          onToggleTimelinePreview={toggleTimelinePreview}
          timelinePreviewOpen={timelinePreviewOpen}
          t={t}
        />,
        window.document.body,
      )}
      <TimeTagTimelinePreview calendar={calendar} events={events} />
    </>
  );
}

interface DialogBodyProps {
  calendar: CalendarConfig;
  draft: TimeDraft;
  safeDay: number;
  safeMonth: number;
  monthLength: number;
  position: { x: number; y: number };
  parsedManuscript: ParsedManuscript | null;
  events: TimelineEvent[];
  lastAdded: LastAddedTimeMarker | null;
  onApplyQuickDate: (parts: CalendarDateParts) => void;
  onClose: () => void;
  setPosition: (pos: { x: number; y: number }) => void;
  onSetDay: (n: number) => void;
  onSetMonth: (n: number) => void;
  onSetYear: (n: number) => void;
  onSetHour: (n: number | null) => void;
  onSave: () => void;
  commitOnSave: boolean;
  mode: "insert" | "edit";
  onToggleTimelinePreview: () => void;
  timelinePreviewOpen: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function DialogBody({
  calendar,
  draft,
  safeDay,
  safeMonth,
  monthLength,
  position,
  parsedManuscript,
  events,
  lastAdded,
  onApplyQuickDate,
  onClose,
  setPosition,
  onSetDay,
  onSetMonth,
  onSetYear,
  onSetHour,
  onSave,
  commitOnSave,
  mode,
  onToggleTimelinePreview,
  timelinePreviewOpen,
  t,
}: DialogBodyProps) {
  const yearCalendar = effectiveCalendarForYear(draft.year, calendar);
  const monthName = yearCalendar.months[safeMonth - 1]?.name ?? String(safeMonth);
  const monthsLen = Math.max(1, yearCalendar.months.length);
  const hoursPerDay = Math.max(1, calendar.hoursPerDay);
  const maxHour = hoursPerDay - 1;

  const markedInYear = useMemo(
    () => historyMarkedDaysForYear(draft.year, events, calendar),
    [draft.year, events, calendar],
  );

  const monthsWithMarks = useMemo(
    () => new Set([...markedInYear.values()].map((d) => d.month)),
    [markedInYear],
  );

  const daysWithMarks = useMemo(
    () =>
      new Set(
        [...markedInYear.values()]
          .filter((d) => d.month === safeMonth)
          .map((d) => d.day),
      ),
    [markedInYear, safeMonth],
  );

  const hoursWithMarks = useMemo(
    () => historyMarkedHoursForDay(draft.year, safeMonth, safeDay, events, calendar),
    [draft.year, safeMonth, safeDay, events, calendar],
  );

  const documentLast = useMemo(
    () => findLastAddedTimeInManuscript(parsedManuscript),
    [parsedManuscript],
  );

  const globalLast = useMemo(
    () => resolveGlobalLastAddedTime(lastAdded, events),
    [lastAdded, events],
  );

  const dialogRef = useRef<HTMLDivElement>(null);
  const visibleRowRef = useRef<HTMLDivElement>(null);
  const sizerRowRef = useRef<HTMLDivElement>(null);
  const dragOriginRef = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );
  const [pickerRowWidth, setPickerRowWidth] = useState(0);

  const getDialogWidth = useCallback(
    () => dialogRef.current?.offsetWidth ?? DIALOG_MIN_WIDTH,
    [],
  );

  const reclampPosition = useCallback(() => {
    setPosition(clampPosition(position.x, position.y, getDialogWidth()));
  }, [getDialogWidth, position.x, position.y, setPosition]);

  useEffect(() => {
    const el = calendar.hoursEnabled ? visibleRowRef.current : sizerRowRef.current;
    if (!el) return;
    const update = () => {
      setPickerRowWidth(el.scrollWidth);
      reclampPosition();
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [
    reclampPosition,
    calendar.hoursEnabled,
    monthLength,
    monthName,
    hoursPerDay,
    maxHour,
    draft.hour,
  ]);

  const renderPickers = ({
    fill,
    includeHour,
  }: {
    fill: boolean;
    includeHour: boolean;
  }) => (
    <>
      <TimeTagMarkedPicker
        fill={fill}
        label={t("panel.monthLabel")}
        value={safeMonth}
        onValueChange={(n) => onSetMonth(n ?? 1)}
        min={1}
        max={monthsLen}
        fallback={1}
        displaySuffix={monthName}
        options={yearCalendar.months.map((m, idx) => ({
          value: idx + 1,
          label: m.name,
          marked: monthsWithMarks.has(idx + 1),
        }))}
        listAriaLabel={t("panel.monthListOpen")}
      />
      <TimeTagMarkedPicker
        fill={fill}
        label={t("panel.dayLabel")}
        value={safeDay}
        onValueChange={(n) => onSetDay(n ?? 1)}
        min={1}
        max={monthLength}
        fallback={1}
        options={Array.from({ length: monthLength }, (_, i) => i + 1).map((d) => ({
          value: d,
          label: String(d),
          marked: daysWithMarks.has(d),
        }))}
        listAriaLabel={t("panel.dayListOpen")}
      />
      {includeHour ? (
        <TimeTagMarkedPicker
          label={t("panel.hourLabel")}
          value={draft.hour}
          onValueChange={onSetHour}
          min={0}
          max={maxHour}
          fallback={0}
          nullable
          placeholder={t("panel.hourPlaceholder")}
          valueWidthClass="w-9"
          options={Array.from({ length: hoursPerDay }, (_, h) => h).map((h) => ({
            value: h,
            label: String(h),
            marked: hoursWithMarks.has(h),
          }))}
          listAriaLabel={t("panel.hourListOpen")}
        />
      ) : null}
    </>
  );

  const onPointerDownDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    dragOriginRef.current = {
      x: e.clientX,
      y: e.clientY,
      px: position.x,
      py: position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const origin = dragOriginRef.current;
    if (!origin) return;
    setPosition(
      clampPosition(
        origin.px + (e.clientX - origin.x),
        origin.py + (e.clientY - origin.y),
        getDialogWidth(),
      ),
    );
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragOriginRef.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      dragOriginRef.current = null;
    }
  };

  const dialogWidth =
    pickerRowWidth > 0
      ? Math.max(DIALOG_MIN_WIDTH, pickerRowWidth + DIALOG_HORIZONTAL_PADDING)
      : DIALOG_MIN_WIDTH;

  const shiftMonth = (delta: number) => {
    onApplyQuickDate(
      shiftCalendarMonth(
        { day: safeDay, month: safeMonth, year: draft.year },
        delta,
        calendar,
      ),
    );
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="false"
      aria-label={mode === "edit" ? t("timeTag.editTitle") : t("panel.timeDialogTitle")}
      className="fixed z-50 flex w-fit min-w-[240px] flex-col rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl"
      style={{ left: position.x, top: position.y, width: dialogWidth }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <header
        className="flex cursor-grab items-center justify-between gap-2 rounded-t-lg border-b border-border/60 bg-card/70 px-3 py-2 active:cursor-grabbing"
        onPointerDown={onPointerDownDrag}
      >
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <GripHorizontal className="size-3.5 text-muted-foreground" />
          <span>{mode === "edit" ? t("timeTag.editTitle") : t("panel.timeDialogTitle")}</span>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-6"
          onClick={onClose}
          aria-label={t("panel.timeDialogClose")}
          title={t("panel.timeDialogClose")}
        >
          <X className="size-3.5" />
        </Button>
      </header>

      <div className="relative flex flex-col gap-3 px-3 py-3">
        <div className="min-w-0 overflow-hidden">
          <TimeTagYearRow
            calendar={calendar}
            year={draft.year}
            events={events}
            documentLast={documentLast}
            globalLast={globalLast}
            onYearChange={onSetYear}
            onApplyDate={onApplyQuickDate}
          />
        </div>

        <div
          className="pointer-events-none invisible absolute h-0 overflow-hidden"
          aria-hidden
        >
          <div
            ref={sizerRowRef}
            className="flex w-fit flex-nowrap items-center gap-x-2"
          >
            {renderPickers({ fill: false, includeHour: true })}
          </div>
        </div>

        <div
          ref={visibleRowRef}
          className={cn(
            calendar.hoursEnabled
              ? "flex w-fit flex-nowrap items-center gap-x-2 overflow-visible"
              : "grid grid-cols-2 gap-x-2",
          )}
          style={
            !calendar.hoursEnabled && pickerRowWidth > 0
              ? { width: pickerRowWidth }
              : undefined
          }
        >
          {renderPickers({
            fill: !calendar.hoursEnabled,
            includeHour: !!calendar.hoursEnabled,
          })}
        </div>

        <TimeTagMonthCalendar
          year={draft.year}
          month={safeMonth}
          selectedDay={safeDay}
          onSelectDay={onSetDay}
          onPrevMonth={() => shiftMonth(-1)}
          onNextMonth={() => shiftMonth(1)}
          calendar={calendar}
          events={events}
        />

        <div className="flex gap-2">
          <Button
            type="button"
            variant={timelinePreviewOpen ? "secondary" : "outline"}
            className="h-8 flex-1 gap-1.5 text-[11px]"
            onClick={onToggleTimelinePreview}
            title={t("panel.timeTimelineButton")}
          >
            <Clock className="size-3.5 shrink-0" />
            {t("panel.timeTimelineButton")}
          </Button>
          <Button
            type="button"
            className="h-8 flex-1 gap-1.5 text-[11px]"
            onClick={onSave}
            title={commitOnSave ? t("panel.timeInsert") : t("panel.timeSave")}
          >
            {commitOnSave ? (
              <BookmarkPlus className="size-3.5 shrink-0" />
            ) : (
              <Save className="size-3.5 shrink-0" />
            )}
            {commitOnSave ? t("panel.timeInsert") : t("panel.timeSave")}
          </Button>
        </div>
      </div>
    </div>
  );
}
