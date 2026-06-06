import { useEffect, useMemo, useState } from "react";

import { invokeCommand } from "@/lib/ipc";
import type { FolderMeta } from "@/lib/types/folder";
import { useFileTreeStore } from "@/stores/useFileTreeStore";

const EMPTY_META: FolderMeta = { description: "" };

type CardSnapshot = {
  key: string;
  meta: FolderMeta;
  entityCount: number;
};

export function useFolderCardData(dirPath: string) {
  const revision = useFileTreeStore((s) => s.revision);
  const [snapshot, setSnapshot] = useState<CardSnapshot | null>(null);

  const fetchKey = useMemo(
    () => (dirPath ? `${dirPath}\0${revision}` : ""),
    [dirPath, revision],
  );

  useEffect(() => {
    if (!fetchKey || !dirPath) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const [folderMeta, count] = await Promise.all([
          invokeCommand<FolderMeta>("get_folder_meta", { relativeDir: dirPath }),
          invokeCommand<number>("count_entities_in_tree", { relativeDir: dirPath }),
        ]);
        if (!cancelled) {
          setSnapshot({ key: fetchKey, meta: folderMeta, entityCount: count });
        }
      } catch {
        if (!cancelled) {
          setSnapshot({ key: fetchKey, meta: EMPTY_META, entityCount: 0 });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchKey, dirPath]);

  const isLoading = Boolean(dirPath) && snapshot?.key !== fetchKey;
  const meta = snapshot?.key === fetchKey ? snapshot.meta : EMPTY_META;
  const entityCount = snapshot?.key === fetchKey ? snapshot.entityCount : 0;

  return { meta, entityCount, isLoading };
}
