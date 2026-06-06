import { useEffect } from "react";

import {
  isPersistableManuscriptPath,
  setManuscriptTabsSession,
} from "@/lib/editor/lastManuscriptFile";
import { useEditorStore } from "@/stores/useEditorStore";
import { useProjectStore } from "@/stores/useProjectStore";

function deriveManuscriptSession(tabOrder: string[], activeFilePath: string | null) {
  const manuscriptOrder = tabOrder.filter(isPersistableManuscriptPath);
  if (manuscriptOrder.length === 0) {
    return null;
  }

  const active =
    activeFilePath && isPersistableManuscriptPath(activeFilePath)
      ? activeFilePath
      : (manuscriptOrder[manuscriptOrder.length - 1] ?? null);

  return { tabOrder: manuscriptOrder, activeFilePath: active };
}

/**
 * Persiste en localStorage las pestañas de manuscrito abiertas (orden + activa).
 */
export function usePersistManuscriptTabs(): void {
  const rootPath = useProjectStore((s) => s.activeProject?.rootPath);

  useEffect(() => {
    if (!rootPath) {
      return;
    }

    const persist = () => {
      const { tabOrder, activeFilePath } = useEditorStore.getState();
      const session = deriveManuscriptSession(tabOrder, activeFilePath);
      if (!session) {
        return;
      }
      setManuscriptTabsSession(rootPath, session);
    };

    return useEditorStore.subscribe((state, prev) => {
      if (
        state.tabOrder === prev.tabOrder &&
        state.activeFilePath === prev.activeFilePath
      ) {
        return;
      }
      persist();
    });
  }, [rootPath]);
}
