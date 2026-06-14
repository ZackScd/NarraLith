import { useEffect, useRef } from "react";

import { trackAction } from "@/lib/action-audit/trackAction";
import { useFileTreeStore } from "@/stores/useFileTreeStore";

const SEARCH_DEBOUNCE_MS = 300;

export function useExplorerActionAudit(): void {
  const selectedPath = useFileTreeStore((s) => s.selectedPath);
  const searchQuery = useFileTreeStore((s) => s.searchQuery);
  const prevPath = useRef<string | null>(null);
  const prevQuery = useRef(searchQuery);

  useEffect(() => {
    if (!selectedPath || selectedPath === prevPath.current) {
      prevPath.current = selectedPath;
      return;
    }
    trackAction("explorer", "select", { path: selectedPath });
    prevPath.current = selectedPath;
  }, [selectedPath]);

  useEffect(() => {
    if (searchQuery === prevQuery.current) {
      return;
    }
    const timer = setTimeout(() => {
      trackAction(
        "explorer",
        "search.query",
        {
          queryLen: searchQuery.length,
          query: searchQuery.slice(0, 80),
          previousLen: prevQuery.current.length,
        },
        { channel: "verbose", level: "debug" },
      );
      prevQuery.current = searchQuery;
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);
}
