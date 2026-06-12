import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createParagraphNode,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
} from "lexical";
import { useEffect } from "react";

import {
  $appendBarTimeToSegment,
  $closeEventAtParagraph,
  $expandEventAtParagraph,
  $updateEventBarAtSegment,
} from "@/lib/editor/documentSync";
import { stableSegmentId } from "@/lib/editor/manuscriptBlocks";
import type { BarTag } from "@/lib/types/manuscript";
import { $createEventTagBarNode } from "@/modules/editor/nodes/EventTagBarNode";
import { useEditorStore } from "@/stores/useEditorStore";

function $insertEventBlockAtCursor(
  filePath: string,
  segmentIndex: number,
  name: string,
  description: string,
  entityPath: string,
  barTags: BarTag[],
): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return false;
  }

  const top = selection.anchor.getNode().getTopLevelElement();
  if (!top || !$isParagraphNode(top)) {
    return false;
  }

  const segmentId = stableSegmentId(filePath, segmentIndex);
  const bar = $createEventTagBarNode(
    segmentId,
    segmentIndex,
    name,
    description,
    entityPath,
    barTags,
  );
  const body = $createParagraphNode();

  top.insertAfter(bar);
  bar.insertAfter(body);
  body.select();

  return true;
}

/** Cierre `[-]`, expansión `[+]` y apertura de evento desde panel (RAM). */
export function ManuscriptEventCommandsPlugin() {
  const [editor] = useLexicalComposerContext();
  const setCloseEventFn = useEditorStore((s) => s.setCloseEventFn);
  const setExpandEventFn = useEditorStore((s) => s.setExpandEventFn);
  const setCommitEventFn = useEditorStore((s) => s.setCommitEventFn);
  const setUpdateEventFn = useEditorStore((s) => s.setUpdateEventFn);
  const setAppendBarTimeFn = useEditorStore((s) => s.setAppendBarTimeFn);

  useEffect(() => {
    setCloseEventFn(() => {
      let ok = false;
      editor.update(
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return;
          }
          const top = selection.anchor.getNode().getTopLevelElement();
          if (!top || !$isParagraphNode(top)) {
            return;
          }
          ok = $closeEventAtParagraph(top.getKey());
        },
        { discrete: true },
      );
      if (ok) {
        editor.focus();
        useEditorStore.getState().markDirty();
        useEditorStore.getState().reconcileManuscriptFromEditor();
      }
      return ok;
    });

    setExpandEventFn(() => {
      let ok = false;
      editor.update(
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) {
            return;
          }
          const top = selection.anchor.getNode().getTopLevelElement();
          if (!top || !$isParagraphNode(top)) {
            return;
          }
          ok = $expandEventAtParagraph(top.getKey());
        },
        { discrete: true },
      );
      if (ok) {
        useEditorStore.getState().markDirty();
        useEditorStore.getState().reconcileManuscriptFromEditor();
      }
      return ok;
    });

    setCommitEventFn((params) => {
      const filePath = useEditorStore.getState().activeFilePath;
      if (!filePath) {
        return false;
      }
      const manuscript = useEditorStore.getState().manuscript;
      const segmentIndex = manuscript?.segments.length ?? 0;

      let ok = false;
      editor.update(
        () => {
          ok = $insertEventBlockAtCursor(
            filePath,
            segmentIndex,
            params.name,
            params.description,
            params.entityPath,
            params.barTags,
          );
        },
        { discrete: true },
      );
      if (ok) {
        useEditorStore.getState().markDirty();
        useEditorStore.getState().reconcileManuscriptFromEditor();
      }
      return ok;
    });

    setUpdateEventFn((params) => {
      const segmentId = useEditorStore.getState().activeEventContext.segmentId;
      if (!segmentId) {
        return false;
      }
      let ok = false;
      editor.update(
        () => {
          ok = $updateEventBarAtSegment(
            segmentId,
            params.name,
            params.description,
            params.barTags,
          );
        },
        { discrete: true },
      );
      if (ok) {
        useEditorStore.getState().markDirty();
        useEditorStore.getState().reconcileManuscriptFromEditor();
      }
      return ok;
    });

    setAppendBarTimeFn((timeTag, hour) => {
      const segmentId = useEditorStore.getState().activeEventContext.segmentId;
      if (!segmentId) {
        return false;
      }
      let ok = false;
      editor.update(
        () => {
          ok = $appendBarTimeToSegment(segmentId, timeTag, hour ?? null);
        },
        { discrete: true },
      );
      if (ok) {
        useEditorStore.getState().markDirty();
        useEditorStore.getState().reconcileManuscriptFromEditor();
      }
      return ok;
    });

    return () => {
      setCloseEventFn(null);
      setExpandEventFn(null);
      setCommitEventFn(null);
      setUpdateEventFn(null);
      setAppendBarTimeFn(null);
    };
  }, [
    editor,
    setCloseEventFn,
    setExpandEventFn,
    setCommitEventFn,
    setUpdateEventFn,
    setAppendBarTimeFn,
  ]);

  return null;
}
