import { useCallback, useEffect, useMemo, useState } from "react";

import { invokeCommand, parseAppError } from "@/lib/ipc";
import { entityStemFromPath } from "@/lib/pathUtils";
import type { BacklinkRow, UnlinkedMentionRow } from "@/lib/types/references";
import { useEditorStore } from "@/stores/useEditorStore";

const UNLINKED_LIMIT = 50;

type ReferencesSnapshot = {
  key: string;
  backlinks: BacklinkRow[];
  unlinked: UnlinkedMentionRow[];
  errorKey: string | null;
};

export function useReferencesData() {
  const activeFilePath = useEditorStore((s) => s.activeFilePath);
  const documentSyncKey = useEditorStore((s) => s.documentSyncKey);
  const saveStatus = useEditorStore((s) => s.saveStatus);

  const [snapshot, setSnapshot] = useState<ReferencesSnapshot | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const entityPath = activeFilePath;
  const entityName = entityStemFromPath(activeFilePath);
  const hasEntity = Boolean(entityPath && entityName);

  const fetchKey = useMemo(() => {
    if (!entityPath || !entityName) {
      return null;
    }
    return `${entityPath}\0${entityName}\0${documentSyncKey}\0${saveStatus}\0${refreshToken}`;
  }, [documentSyncKey, entityName, entityPath, refreshToken, saveStatus]);

  const reload = useCallback(() => {
    setRefreshToken((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!fetchKey || !entityPath || !entityName) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const [bl, ul] = await Promise.all([
          invokeCommand<BacklinkRow[]>("get_backlinks", { entityPath }),
          invokeCommand<UnlinkedMentionRow[]>("find_unlinked_mentions", {
            entityName,
            entityPath,
            limit: UNLINKED_LIMIT,
          }),
        ]);
        if (!cancelled) {
          setSnapshot({
            key: fetchKey,
            backlinks: bl,
            unlinked: ul,
            errorKey: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setSnapshot({
            key: fetchKey,
            backlinks: [],
            unlinked: [],
            errorKey: parseAppError(err)?.key ?? "error.references.load_failed",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [entityName, entityPath, fetchKey]);

  const isCurrent = hasEntity && snapshot?.key === fetchKey;

  return {
    entityPath,
    entityName,
    backlinks: isCurrent ? snapshot.backlinks : [],
    unlinked: isCurrent ? snapshot.unlinked : [],
    isLoading: hasEntity && !isCurrent,
    errorKey: isCurrent ? snapshot.errorKey : null,
    reload,
  };
}
