import { useEffect, useMemo, useState } from "react";

import { invokeCommand } from "@/lib/ipc";
import type { InhabitantRow } from "@/lib/types/entity";
import { useEditorStore } from "@/stores/useEditorStore";

type InhabitantsSnapshot = {
  key: string;
  rows: InhabitantRow[];
  errorKey: string | null;
};

export function useLocationInhabitants(locationPath: string | null) {
  const documentSyncKey = useEditorStore((s) => s.documentSyncKey);
  const [snapshot, setSnapshot] = useState<InhabitantsSnapshot | null>(null);

  const fetchKey = useMemo(() => {
    if (!locationPath) {
      return null;
    }
    return `${locationPath}\0${documentSyncKey}`;
  }, [locationPath, documentSyncKey]);

  useEffect(() => {
    if (!fetchKey || !locationPath) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const list = await invokeCommand<InhabitantRow[]>("get_location_inhabitants", {
          locationPath,
          limit: 100,
        });
        if (!cancelled) {
          setSnapshot({ key: fetchKey, rows: list, errorKey: null });
        }
      } catch {
        if (!cancelled) {
          setSnapshot({
            key: fetchKey,
            rows: [],
            errorKey: "inhabitants.loadFailed",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchKey, locationPath]);

  const isLoading = Boolean(locationPath) && snapshot?.key !== fetchKey;
  const rows = snapshot?.key === fetchKey ? snapshot.rows : [];
  const errorKey = snapshot?.key === fetchKey ? snapshot.errorKey : null;

  return { rows, isLoading, errorKey };
}
