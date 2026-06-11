import {
  CalendarClock,
  BookmarkPlus,
  PanelRightClose,
  PanelRightOpen,
  Save,
  Tags,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  commitManuscriptLabel,
  runLabelCommitAsync,
} from "@/lib/editor/commitManuscriptLabel";
import { normalizeEditorErrorKey } from "@/lib/editor/editorErrors";
import { ensureEventEntityPath } from "@/lib/editor/ensureEventEntity";
import { openTimeTagForBlock } from "@/lib/editor/openTimeTagForBlock";
import { cn } from "@/lib/utils";
import { useCallback, useState } from "react";

import { useCalendarStore } from "@/stores/useCalendarStore";
import { saveAllOpenTabs, useEditorStore } from "@/stores/useEditorStore";
import { useLayoutStore } from "@/stores/useLayoutStore";
import { useManuscriptLabelDraftStore } from "@/stores/useManuscriptLabelDraftStore";
import { useTimeTagDialogStore } from "@/stores/useTimeTagDialogStore";

import { SideEventSection } from "./sidePanel/SideEventSection";
import { SideTimeSection } from "./sidePanel/SideTimeSection";
import { TimeTagDialog } from "./sidePanel/TimeTagDialog";

/**
 * Barra lateral derecha del editor:
 *  - Cabecera con dos botones (Etiquetas / Guardar todo).
 *  - Sección de tiempo con [3 T] última fecha añadida, [3.1] semana actual y
 *    [3.2] botón de añadir/editar la etiqueta de tiempo del bloque activo.
 *  - El diálogo flotante para componer la etiqueta de tiempo se monta en este
 *    mismo árbol vía portal hacia `body` para que pueda arrastrarse libremente.
 */
export function EditorSidePanel() {
  const { t } = useTranslation("editor");
  const [commitError, setCommitError] = useState<{
    filePath: string;
    key: string;
  } | null>(null);

  const inlineMetadataVisible = useLayoutStore((s) => s.inlineMetadataVisible);
  const toggleInlineMetadata = useLayoutStore((s) => s.toggleInlineMetadata);
  const rightPanelCollapsed = useLayoutStore((s) => s.rightPanelCollapsed);
  const rightPanelWidth = useLayoutStore((s) => s.rightPanelWidth);
  const toggleRightPanelCollapsed = useLayoutStore((s) => s.toggleRightPanelCollapsed);

  const compactToolbar = rightPanelWidth < 240;

  const tabOrder = useEditorStore((s) => s.tabOrder);
  const tabs = useEditorStore((s) => s.tabs);
  const document = useEditorStore((s) => s.document);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const activeFilePath = useEditorStore((s) => s.activeFilePath);
  const activeBlockIndex = useEditorStore((s) => s.activeBlockIndex);
  const activeEventContext = useEditorStore((s) => s.activeEventContext);
  const activeTabKind = useEditorStore((s) => s.activeTabKind);
  const insertInlineTagAtCursor = useEditorStore((s) => s.insertInlineTagAtCursor);
  const commitEventAtCursor = useEditorStore((s) => s.commitEventAtCursor);
  const updateEventAtCursor = useEditorStore((s) => s.updateEventAtCursor);
  const appendBarTimeToActiveEvent = useEditorStore(
    (s) => s.appendBarTimeToActiveEvent,
  );
  const calendar = useCalendarStore((s) => s.config);
  const openTimeDialog = useTimeTagDialogStore((s) => s.open);

  const pending = useManuscriptLabelDraftStore((s) => s.pending);
  const clearPending = useManuscriptLabelDraftStore((s) => s.clear);

  const showManuscriptTools = activeTabKind === "manuscript" && Boolean(activeFilePath);

  const commitErrorKey =
    commitError?.filePath === activeFilePath ? commitError.key : null;

  const hasDirtyTabs = tabOrder.some((path) => tabs[path]?.isDirty);
  const saving = saveStatus === "saving";

  const eventDraftCommitOk =
    !pending?.event?.name.trim() ||
    !activeEventContext.inEvent ||
    !activeEventContext.segmentId ||
    pending.eventSegmentIndex === activeEventContext.segmentIndex;

  const canCommitPending =
    Boolean(pending) &&
    activeTabKind === "manuscript" &&
    Boolean(activeFilePath) &&
    pending?.filePath === activeFilePath &&
    ((Boolean(pending.event?.name.trim()) && eventDraftCommitOk) ||
      Boolean(pending.time));

  const commitPending = useCallback(async () => {
    if (!pending || !activeFilePath) {
      return;
    }

    setCommitError(null);

    await runLabelCommitAsync(async () => {
      let entityPath = "";
      const eventDraft = pending.event;
      const isNewEvent =
        Boolean(eventDraft?.name.trim()) &&
        !(activeEventContext.inEvent && activeEventContext.segmentId);

      if (isNewEvent && eventDraft) {
        const resolved = await ensureEventEntityPath({
          name: eventDraft.name.trim(),
          description: eventDraft.description.trim(),
          sourcePath: activeFilePath,
        });
        if (!resolved.ok) {
          setCommitError({ filePath: activeFilePath, key: resolved.errorKey });
          return;
        }
        entityPath = resolved.path;
      }

      const ok = commitManuscriptLabel({
        pending,
        activeEventContext,
        entityPath,
        insertInlineTagAtCursor,
        commitEventAtCursor,
        updateEventAtCursor,
        appendBarTimeToActiveEvent,
      });
      if (ok) {
        clearPending();
      }
    });
  }, [
    activeEventContext,
    activeFilePath,
    appendBarTimeToActiveEvent,
    clearPending,
    commitEventAtCursor,
    insertInlineTagAtCursor,
    pending,
    updateEventAtCursor,
  ]);

  const openAddTimeDialog = useCallback(() => {
    if (activeTabKind !== "manuscript" || !activeFilePath || !calendar) {
      return;
    }
    const block = document?.blocks[activeBlockIndex];
    openTimeTagForBlock({
      filePath: activeFilePath,
      blockIndex: activeBlockIndex,
      metadata: block?.metadata as Record<string, unknown> | undefined,
      rightPanelCollapsed,
      calendar,
      openTimeDialog,
    });
  }, [
    activeTabKind,
    activeFilePath,
    calendar,
    document,
    activeBlockIndex,
    openTimeDialog,
    rightPanelCollapsed,
  ]);

  const tagsTitle = inlineMetadataVisible
    ? t("panel.hideInlineTags")
    : t("panel.showInlineTags");
  const saveTitle = saving ? t("header.saving") : t("header.saveAll");

  if (rightPanelCollapsed) {
    return (
      <aside
        className="flex h-full w-full shrink-0 flex-col items-center gap-1 border-l border-border bg-card py-2"
        aria-label={t("panel.title")}
      >
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          title={t("panel.expandTools")}
          onClick={toggleRightPanelCollapsed}
        >
          <PanelRightOpen className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant={inlineMetadataVisible ? "secondary" : "ghost"}
          className="size-8"
          title={
            inlineMetadataVisible
              ? t("panel.hideInlineTags")
              : t("panel.showInlineTags")
          }
          onClick={toggleInlineMetadata}
        >
          <Tags className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          title={t("header.saveAll")}
          disabled={!hasDirtyTabs || saving}
          onClick={() => void saveAllOpenTabs()}
        >
          <Save className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          title={t("panel.addTimeIcon")}
          disabled={activeTabKind !== "manuscript" || !activeFilePath}
          onClick={openAddTimeDialog}
        >
          <CalendarClock className="size-4" />
        </Button>
        <TimeTagDialog />
      </aside>
    );
  }

  return (
    <aside
      className="flex h-full w-full shrink-0 flex-col border-l border-border bg-card"
      aria-label={t("panel.title")}
    >
      <div
        className={cn(
          "flex h-10 min-w-0 shrink-0 items-center overflow-hidden border-b border-border bg-card/70",
          compactToolbar ? "gap-1 px-2" : "gap-2 px-3",
        )}
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-7 shrink-0"
          title={t("panel.collapseTools")}
          onClick={toggleRightPanelCollapsed}
        >
          <PanelRightClose className="size-3.5" />
        </Button>
        {compactToolbar ? (
          <Button
            type="button"
            variant={inlineMetadataVisible ? "secondary" : "outline"}
            size="icon"
            className={cn(
              "size-7 shrink-0",
              inlineMetadataVisible && "border-primary/40",
            )}
            aria-pressed={inlineMetadataVisible}
            title={tagsTitle}
            onClick={toggleInlineMetadata}
          >
            <Tags className="size-3.5" />
          </Button>
        ) : (
          <Button
            type="button"
            variant={inlineMetadataVisible ? "secondary" : "outline"}
            className={cn(
              "h-7 min-w-0 flex-1 px-2 text-xs",
              inlineMetadataVisible && "border-primary/40",
            )}
            aria-pressed={inlineMetadataVisible}
            title={tagsTitle}
            onClick={toggleInlineMetadata}
          >
            <Tags className="mr-1 size-3.5 shrink-0" />
            <span className="truncate">{t("panel.tagsButton")}</span>
          </Button>
        )}
        {compactToolbar ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-7 shrink-0"
            disabled={!hasDirtyTabs || saving}
            title={saveTitle}
            onClick={() => void saveAllOpenTabs()}
          >
            <Save className="size-3.5" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="h-7 min-w-0 flex-1 px-2 text-xs"
            disabled={!hasDirtyTabs || saving}
            title={saveTitle}
            onClick={() => void saveAllOpenTabs()}
          >
            <Save className="mr-1 size-3.5 shrink-0" />
            <span className="truncate">
              {saving ? t("header.saving") : t("header.saveAll")}
            </span>
          </Button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {showManuscriptTools ? (
          <>
            <SideEventSection />
            <SideTimeSection />
          </>
        ) : null}
      </div>

      {showManuscriptTools ? (
        <div className="shrink-0 space-y-2 border-t border-border/60 bg-card/30 p-3">
          {commitErrorKey ? (
            <p className="text-xs text-destructive" role="alert">
              {t(normalizeEditorErrorKey(commitErrorKey), {
                defaultValue: commitErrorKey,
              })}
            </p>
          ) : null}
          <Button
            type="button"
            className="w-full gap-2"
            disabled={!canCommitPending}
            onClick={() => void commitPending()}
          >
            <BookmarkPlus className="size-4 shrink-0" />
            {t("panel.addTagToDocument")}
          </Button>
        </div>
      ) : null}

      <TimeTagDialog />
    </aside>
  );
}
