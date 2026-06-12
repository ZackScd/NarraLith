import { useEffect } from "react";

import { saveActiveTab, saveAllOpenTabs } from "@/stores/useEditorStore";

/** Ctrl+S guarda la pestaña activa; Ctrl+Shift+S guarda todas las sucias. */
export function useSaveShortcut() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") {
        return;
      }
      event.preventDefault();
      if (event.shiftKey) {
        void saveAllOpenTabs();
      } else {
        void saveActiveTab();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
