import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { LexicalEditor } from "lexical";
import { useEffect } from "react";

import { $focusAtLastParagraph } from "@/lib/editor/focusEditorAtEnd";

function focusEditorAtEnd(editor: LexicalEditor): void {
  editor.focus();
  editor.update(
    () => {
      $focusAtLastParagraph();
    },
    { discrete: true },
  );
}

function shouldFocusFromEmptyAreaClick(
  target: EventTarget | null,
  rootElement: HTMLElement,
  scrollPanel: HTMLElement | null,
): boolean {
  if (!(target instanceof Node)) {
    return false;
  }

  if (target === rootElement) {
    return true;
  }

  if (scrollPanel?.contains(target) && !rootElement.contains(target)) {
    return true;
  }

  return false;
}

/** Clic en vacío del panel o padding del contenteditable → foco al final del manuscrito. */
export function ClickToFocusPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerRootListener((rootElement) => {
      if (!rootElement) {
        return;
      }

      const scrollPanel = rootElement.closest<HTMLElement>(".scroll-panel");

      const onMouseDown = (event: MouseEvent) => {
        if (!shouldFocusFromEmptyAreaClick(event.target, rootElement, scrollPanel)) {
          return;
        }

        event.preventDefault();
        focusEditorAtEnd(editor);
      };

      const host = scrollPanel ?? rootElement;
      host.addEventListener("mousedown", onMouseDown, true);

      return () => {
        host.removeEventListener("mousedown", onMouseDown, true);
      };
    });
  }, [editor]);

  return null;
}
