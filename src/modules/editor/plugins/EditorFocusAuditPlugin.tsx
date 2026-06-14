import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";

import { trackAction } from "@/lib/action-audit/trackAction";
import { useEditorStore } from "@/stores/useEditorStore";

/** Foco/blur del lienzo Lexical — canal verbose (OBS-003 §4.4). */
export function EditorFocusAuditPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerRootListener((rootElement) => {
      if (!rootElement) {
        return;
      }

      const onFocusIn = () => {
        const path = useEditorStore.getState().activeFilePath;
        trackAction(
          "editor",
          "focus",
          { path, phase: "focus" },
          { channel: "verbose", level: "debug" },
        );
      };

      const onFocusOut = () => {
        const path = useEditorStore.getState().activeFilePath;
        trackAction(
          "editor",
          "focus",
          { path, phase: "blur" },
          { channel: "verbose", level: "debug" },
        );
      };

      rootElement.addEventListener("focusin", onFocusIn);
      rootElement.addEventListener("focusout", onFocusOut);

      return () => {
        rootElement.removeEventListener("focusin", onFocusIn);
        rootElement.removeEventListener("focusout", onFocusOut);
      };
    });
  }, [editor]);

  return null;
}
