import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";

import { isEditorHydrating, LEXICAL_HYDRATE_TAG } from "@/lib/editor/editorSyncGuard";
import { useEditorStore } from "@/stores/useEditorStore";

/** Marca el documento como modificado solo si cambió el texto (no al hacer clic o cambiar selección). */
export function DirtyStatePlugin() {
  const markDirty = useEditorStore((s) => s.markDirty);
  const [editor] = useLexicalComposerContext();

  return (
    <OnChangePlugin
      ignoreSelectionChange
      ignoreHistoryMergeTagChange
      onChange={(_editorState, _lexicalEditor, tags) => {
        if (isEditorHydrating() || tags.has(LEXICAL_HYDRATE_TAG)) {
          return;
        }
        if (editor.isComposing()) {
          return;
        }
        markDirty();
      }}
    />
  );
}
