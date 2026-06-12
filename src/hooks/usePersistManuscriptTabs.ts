import { useEffect, useRef } from "react";

import { audit } from "@/lib/audit";
import { setManuscriptTabsSession } from "@/lib/editor/lastManuscriptFile";
import { useEditorStore } from "@/stores/useEditorStore";
import { useProjectStore } from "@/stores/useProjectStore";

const PERSIST_DEBOUNCE_MS = 400;

/**
 * Persiste en localStorage pestañas de manuscrito (orden + activa + borradores sucios, FIX-007).
 */
export function usePersistManuscriptTabs(): void {
  const rootPath = useProjectStore((s) => s.activeProject?.rootPath);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!rootPath) {
      return;
    }

    const persistNow = () => {
      const session = useEditorStore.getState().getManuscriptSessionSnapshot();
      if (!session) {
        return;
      }
      setManuscriptTabsSession(rootPath, session);
      audit.debug("editor", "obs.editor.session.persist", {
        tabCount: session.tabOrder.length,
        draftCount: session.drafts ? Object.keys(session.drafts).length : 0,
        activePath: session.activeFilePath,
      });
    };

    const persistDebounced = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        persistNow();
      }, PERSIST_DEBOUNCE_MS);
    };

    const unsub = useEditorStore.subscribe((state, prev) => {
      if (
        state.tabOrder !== prev.tabOrder ||
        state.activeFilePath !== prev.activeFilePath ||
        state.tabs !== prev.tabs ||
        state.isDirty !== prev.isDirty ||
        state.manuscript !== prev.manuscript
      ) {
        persistDebounced();
      }
    });

    const flushOnHide = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      persistNow();
    };

    window.addEventListener("pagehide", flushOnHide);
    window.addEventListener("beforeunload", flushOnHide);

    return () => {
      unsub();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      window.removeEventListener("pagehide", flushOnHide);
      window.removeEventListener("beforeunload", flushOnHide);
      flushOnHide();
    };
  }, [rootPath]);
}
