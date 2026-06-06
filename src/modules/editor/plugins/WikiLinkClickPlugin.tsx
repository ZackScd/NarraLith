import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";

import { useEditorStore } from "@/stores/useEditorStore";

export function WikiLinkClickPlugin() {
  const [editor] = useLexicalComposerContext();
  const navigateToDocument = useEditorStore((s) => s.navigateToDocument);

  useEffect(() => {
    return editor.registerRootListener((rootElement) => {
      if (!rootElement) {
        return;
      }

      const onClick = (event: MouseEvent) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }
        const linkEl = target.closest<HTMLElement>("[data-wiki-target]");
        if (!linkEl || !rootElement.contains(linkEl)) {
          return;
        }
        const path = linkEl.getAttribute("data-wiki-path");
        if (!path) {
          return;
        }
        event.preventDefault();
        void navigateToDocument(path);
      };

      rootElement.addEventListener("click", onClick);
      return () => rootElement.removeEventListener("click", onClick);
    });
  }, [editor, navigateToDocument]);

  return null;
}
