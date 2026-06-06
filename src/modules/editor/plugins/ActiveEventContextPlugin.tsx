import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection } from "lexical";
import { useEffect } from "react";

import {
  getEventContextAtTopLevel,
  legacyBlockIndexFromContext,
} from "@/lib/editor/documentSync";
import { useEditorStore } from "@/stores/useEditorStore";

/** Sustituye `ActiveBlockPlugin`: contexto de evento bajo el cursor. */
export function ActiveEventContextPlugin() {
  const [editor] = useLexicalComposerContext();
  const setActiveEventContext = useEditorStore((s) => s.setActiveEventContext);

  useEffect(() => {
    const updateFromSelection = () => {
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return;
        }
        const top = selection.anchor.getNode().getTopLevelElement();
        if (!top) {
          return;
        }
        const ctx = getEventContextAtTopLevel(top.getKey());
        setActiveEventContext(ctx, legacyBlockIndexFromContext(ctx));
      });
    };

    updateFromSelection();
    return editor.registerUpdateListener(() => {
      updateFromSelection();
    });
  }, [editor, setActiveEventContext]);

  return null;
}
