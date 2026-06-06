import { useEffect } from "react";

import {
  clearManuscriptTabsSession,
  getManuscriptTabsSession,
  isPersistableManuscriptPath,
  setManuscriptTabsSession,
} from "@/lib/editor/lastManuscriptFile";
import { normalizeProjectPath } from "@/lib/pathUtils";
import { useEditorStore } from "@/stores/useEditorStore";
import { useFileTreeStore } from "@/stores/useFileTreeStore";
import { useProjectStore } from "@/stores/useProjectStore";

function expandAncestorFolders(filePath: string): void {
  const normalized = normalizeProjectPath(filePath);
  const parts = normalized.split("/");
  if (parts.length <= 1) {
    return;
  }
  const { expandPath } = useFileTreeStore.getState();
  let acc = "";
  for (let i = 0; i < parts.length - 1; i += 1) {
    acc = i === 0 ? parts[i]! : `${acc}/${parts[i]}`;
    expandPath(acc);
  }
}

/**
 * Al abrir el workspace, restaura las pestañas de manuscrito de la sesión anterior
 * (por proyecto), si el editor sigue vacío.
 */
export function useRestoreLastManuscriptFile(): void {
  const rootPath = useProjectStore((s) => s.activeProject?.rootPath);

  useEffect(() => {
    if (!rootPath) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      if (useEditorStore.getState().activeFilePath) {
        return;
      }

      const session = getManuscriptTabsSession(rootPath);
      if (!session || session.tabOrder.length === 0) {
        return;
      }

      const openedPaths: string[] = [];
      const { openDocument, switchTab } = useEditorStore.getState();

      for (const path of session.tabOrder) {
        if (!isPersistableManuscriptPath(path)) {
          continue;
        }
        const ok = await openDocument(path);
        if (cancelled) {
          return;
        }
        if (ok) {
          openedPaths.push(normalizeProjectPath(path));
        }
      }

      if (openedPaths.length === 0) {
        clearManuscriptTabsSession(rootPath);
        return;
      }

      const activeCandidate = session.activeFilePath
        ? normalizeProjectPath(session.activeFilePath)
        : null;
      const activePath =
        activeCandidate && openedPaths.includes(activeCandidate)
          ? activeCandidate
          : openedPaths[openedPaths.length - 1]!;

      await switchTab(activePath);
      if (cancelled) {
        return;
      }

      if (openedPaths.length !== session.tabOrder.length) {
        setManuscriptTabsSession(rootPath, {
          tabOrder: openedPaths,
          activeFilePath: activePath,
        });
      }

      useFileTreeStore.getState().selectNode(activePath);
      expandAncestorFolders(activePath);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [rootPath]);
}
