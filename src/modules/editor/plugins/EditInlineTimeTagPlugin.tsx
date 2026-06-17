import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNodeByKey, $getRoot } from "lexical";
import { useEffect, useLayoutEffect } from "react";

import {
  barTimeTagReconcileKey,
  inlineReconcileKey,
  timelineReconcileKeyForBarTag,
  timelineReconcileKeyForInlineTag,
} from "@/lib/calendar/timeTagReconcile";
import {
  $updateBarTimeTagAtIndex,
  $updateInlineTimeTagValue,
  getEventContextAtTopLevel,
  legacyBlockIndexFromContext,
} from "@/lib/editor/documentSync";
import { parseInlineTagsInText } from "@/lib/editor/inlineTagSyntax";
import { timeDraftFromRawTag } from "@/lib/editor/timeTagDraft";
import { $isEventTagBarNode } from "@/modules/editor/nodes/EventTagBarNode";
import { $isInlineTimeTagNode } from "@/modules/editor/nodes/InlineTimeTagNode";
import { useCalendarStore } from "@/stores/useCalendarStore";
import { useEditorStore } from "@/stores/useEditorStore";
import { useTimeTagDialogStore } from "@/stores/useTimeTagDialogStore";

/** Clic en chip inline/barTag → diálogo en modo edit. */
export function EditInlineTimeTagPlugin() {
  const [editor] = useLexicalComposerContext();
  const openTimeDialog = useTimeTagDialogStore((s) => s.open);
  const setUpdateInlineTimeTagFn = useEditorStore((s) => s.setUpdateInlineTimeTagFn);
  const setUpdateBarTimeTagFn = useEditorStore((s) => s.setUpdateBarTimeTagFn);

  useLayoutEffect(() => {
    setUpdateInlineTimeTagFn((nodeKey, value) => {
      let ok = false;
      editor.update(
        () => {
          ok = $updateInlineTimeTagValue(nodeKey, value);
        },
        { discrete: true },
      );
      if (ok) {
        const store = useEditorStore.getState();
        const keys = [inlineReconcileKey(nodeKey)];
        const filePath = store.activeFilePath;
        if (filePath) {
          editor.getEditorState().read(() => {
            const node = $getNodeByKey(nodeKey);
            if (!$isInlineTimeTagNode(node)) {
              return;
            }
            const top = node.getTopLevelElement();
            if (!top) {
              return;
            }
            const ctx = getEventContextAtTopLevel(top.getKey());
            const blockIndex = legacyBlockIndexFromContext(ctx);
            if (!ctx.segmentId || blockIndex < 1) {
              return;
            }
            for (const tag of parseInlineTagsInText(top.getTextContent())) {
              if (tag.type !== "time" || tag.value.trim() !== value.trim()) {
                continue;
              }
              keys.push(
                timelineReconcileKeyForInlineTag(
                  filePath,
                  blockIndex,
                  ctx.segmentId,
                  tag.start,
                  value,
                ),
              );
            }
          });
        }
        store.markTimeTagCalendarReconciled(...keys);
        store.markDirty();
        store.reconcileManuscriptFromEditor();
      }
      return ok;
    });

    setUpdateBarTimeTagFn((segmentId, tagIndex, timeTag, hour) => {
      let ok = false;
      editor.update(
        () => {
          ok = $updateBarTimeTagAtIndex(segmentId, tagIndex, timeTag, hour ?? null);
        },
        { discrete: true },
      );
      if (ok) {
        const store = useEditorStore.getState();
        const keys = [barTimeTagReconcileKey(segmentId, tagIndex)];
        const filePath = store.activeFilePath;
        if (filePath) {
          editor.getEditorState().read(() => {
            for (const child of $getRoot().getChildren()) {
              if (!$isEventTagBarNode(child) || child.getSegmentId() !== segmentId) {
                continue;
              }
              keys.push(
                timelineReconcileKeyForBarTag(
                  filePath,
                  child.getSegmentIndex(),
                  segmentId,
                  timeTag,
                ),
              );
              break;
            }
          });
        }
        store.markTimeTagCalendarReconciled(...keys);
        store.markDirty();
        store.reconcileManuscriptFromEditor();
      }
      return ok;
    });

    return () => {
      setUpdateInlineTimeTagFn(null);
      setUpdateBarTimeTagFn(null);
    };
  }, [editor, setUpdateInlineTimeTagFn, setUpdateBarTimeTagFn]);

  useEffect(() => {
    return editor.registerRootListener((rootElement) => {
      if (!rootElement) return;

      const onClick = (event: MouseEvent) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const host = target.closest<HTMLElement>(".narra-inline-time-tag-host");
        if (!host || !rootElement.contains(host)) return;

        const nodeKey = host.getAttribute("data-lexical-node-key");
        const rawValue = host.getAttribute("data-inline-tag-value");
        if (!nodeKey || !rawValue) return;

        event.preventDefault();
        event.stopPropagation();

        const filePath = useEditorStore.getState().activeFilePath;
        const calendar = useCalendarStore.getState().config;
        if (!filePath || !calendar) return;

        let blockIndex = 0;
        editor.getEditorState().read(() => {
          const node = $getNodeByKey(nodeKey);
          if (!$isInlineTimeTagNode(node)) return;
          const top = node.getTopLevelElement();
          if (top) {
            const ctx = getEventContextAtTopLevel(top.getKey());
            blockIndex = legacyBlockIndexFromContext(ctx);
          }
        });

        openTimeDialog({
          filePath,
          blockIndex,
          initial: timeDraftFromRawTag(rawValue, calendar),
          mode: "edit",
          editTarget: { kind: "inline", nodeKey },
          position: {
            x: event.clientX + 12,
            y: event.clientY + 12,
          },
        });
      };

      rootElement.addEventListener("click", onClick);
      return () => rootElement.removeEventListener("click", onClick);
    });
  }, [editor, openTimeDialog]);

  return null;
}
