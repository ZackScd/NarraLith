import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNodeByKey } from "lexical";
import { useCallback, useEffect, useState } from "react";

import { inlineReconcileKey, timelineReconcileKeyForInlineTag } from "@/lib/calendar/timeTagReconcile";
import {
  getEventContextAtTopLevel,
  legacyBlockIndexFromContext,
} from "@/lib/editor/documentSync";
import { parseInlineTagsInText } from "@/lib/editor/inlineTagSyntax";
import { TimeTagChip } from "@/modules/editor/components/TimeTagChip";
import {
  $isInlineTimeTagNode,
} from "@/modules/editor/nodes/InlineTimeTagNode";
import { useEditorStore } from "@/stores/useEditorStore";
import { useLayoutStore } from "@/stores/useLayoutStore";

/** Lee el nodo Lexical en cada update para que el chip refleje valor y reconciled. */
export function InlineTimeTagChipHost({ nodeKey }: { nodeKey: string }) {
  const [editor] = useLexicalComposerContext();
  const visible = useLayoutStore((s) => s.inlineMetadataVisible);
  const [value, setValue] = useState("");
  const [nodeReconciled, setNodeReconciled] = useState(false);
  const [storeReconciled, setStoreReconciled] = useState(false);

  const syncFromEditor = useCallback(() => {
    editor.getEditorState().read(() => {
      const node = $getNodeByKey(nodeKey);
      if (!$isInlineTimeTagNode(node)) {
        return;
      }
      const tagValue = node.getValue();
      setValue(tagValue);
      setNodeReconciled(node.isCalendarReconciled());

      const { activeFilePath, reconciledTimeTagKeys } = useEditorStore.getState();
      if (reconciledTimeTagKeys.has(inlineReconcileKey(nodeKey))) {
        setStoreReconciled(true);
        return;
      }

      let timelineMatch = false;
      if (activeFilePath) {
        const top = node.getTopLevelElement();
        if (top) {
          const ctx = getEventContextAtTopLevel(top.getKey());
          const blockIndex = legacyBlockIndexFromContext(ctx);
          if (ctx.segmentId && blockIndex >= 1) {
            for (const tag of parseInlineTagsInText(top.getTextContent())) {
              if (tag.type !== "time" || tag.value.trim() !== tagValue.trim()) {
                continue;
              }
              if (
                reconciledTimeTagKeys.has(
                  timelineReconcileKeyForInlineTag(
                    activeFilePath,
                    blockIndex,
                    ctx.segmentId,
                    tag.start,
                    tagValue,
                  ),
                )
              ) {
                timelineMatch = true;
                break;
              }
            }
          }
        }
      }
      setStoreReconciled(timelineMatch);
    });
  }, [editor, nodeKey]);

  useEffect(() => {
    syncFromEditor();
    const unsubStore = useEditorStore.subscribe((state, prev) => {
      if (state.reconciledTimeTagKeys === prev.reconciledTimeTagKeys) {
        return;
      }
      syncFromEditor();
    });
    const removeUpdateListener = editor.registerUpdateListener(() => {
      syncFromEditor();
    });
    return () => {
      unsubStore();
      removeUpdateListener();
    };
  }, [editor, syncFromEditor]);

  return (
    <TimeTagChip
      value={value}
      calendarReconciled={nodeReconciled || storeReconciled}
      visible={visible}
    />
  );
}
