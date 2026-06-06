import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";

import { extractManuscriptFromEditor } from "@/lib/editor/documentSync";
import { useEditorStore } from "@/stores/useEditorStore";

/** Registra la función que el store usa al guardar (IPC `save_manuscript`). */
export function ExtractBlocksPlugin() {
  const [editor] = useLexicalComposerContext();
  const setExtractManuscriptFn = useEditorStore((s) => s.setExtractManuscriptFn);

  useEffect(() => {
    setExtractManuscriptFn(() => {
      const manuscript = useEditorStore.getState().manuscript;
      if (!manuscript) {
        return null;
      }
      let result: ReturnType<typeof extractManuscriptFromEditor> | null = null;
      editor.getEditorState().read(() => {
        result = extractManuscriptFromEditor(
          manuscript.filePath,
          manuscript.fileHeader.title,
        );
      });
      return result;
    });
    return () => setExtractManuscriptFn(null);
  }, [editor, setExtractManuscriptFn]);

  return null;
}
