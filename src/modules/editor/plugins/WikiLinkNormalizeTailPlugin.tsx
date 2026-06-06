import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection, $isTextNode } from "lexical";
import { useEffect } from "react";

import { isEditorHydrating, LEXICAL_HYDRATE_TAG } from "@/lib/editor/editorSyncGuard";
import { $normalizeTextAfterWikiLink } from "@/lib/editor/wikiLinkPlaceholder";

const NORMALIZE_TAG = "narralith-wikilink-normalize";

/** Colapsa espacio/ZWSP tras wiki-link cuando el usuario escribe puntuación o texto. */
export function WikiLinkNormalizeTailPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ tags }) => {
      if (
        tags.has(NORMALIZE_TAG) ||
        tags.has(LEXICAL_HYDRATE_TAG) ||
        isEditorHydrating()
      ) {
        return;
      }

      editor.update(
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            return;
          }
          const node = selection.anchor.getNode();
          if ($isTextNode(node)) {
            $normalizeTextAfterWikiLink(node);
          }
        },
        { tag: NORMALIZE_TAG },
      );
    });
  }, [editor]);

  return null;
}
