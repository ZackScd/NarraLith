import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
} from "lexical";
import { useEffect } from "react";

import { $createInlineTimeTagNode } from "@/modules/editor/nodes/InlineTimeTagNode";
import { useEditorStore } from "@/stores/useEditorStore";

function $insertInlineTagAtCursor(tagType: string, value: string): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return false;
  }

  const anchorNode = selection.anchor.getNode();
  if (!$isTextNode(anchorNode)) {
    return false;
  }

  const offset = selection.anchor.offset;
  const text = anchorNode.getTextContent();
  const tag = $createInlineTimeTagNode(tagType, value);

  if (offset <= 0) {
    anchorNode.insertBefore(tag);
  } else if (offset >= text.length) {
    anchorNode.insertAfter(tag);
  } else {
    const left = text.slice(0, offset);
    const right = text.slice(offset);
    anchorNode.setTextContent(left);
    anchorNode.insertAfter(tag);
    tag.insertAfter($createTextNode(right));
  }

  tag.selectNext();
  return true;
}

/** Registra inserción de `{{time:…}}` en la posición del cursor (sin `+++`). */
export function InsertInlineTagPlugin() {
  const [editor] = useLexicalComposerContext();
  const setInsertInlineTagFn = useEditorStore((s) => s.setInsertInlineTagFn);

  useEffect(() => {
    setInsertInlineTagFn((tagType, tagValue) => {
      let ok = false;
      editor.update(
        () => {
          ok = $insertInlineTagAtCursor(tagType, tagValue);
        },
        { discrete: true },
      );
      if (ok) {
        useEditorStore.getState().markDirty();
        useEditorStore.getState().reconcileManuscriptFromEditor();
      }
      return ok;
    });
    return () => setInsertInlineTagFn(null);
  }, [editor, setInsertInlineTagFn]);

  return null;
}
