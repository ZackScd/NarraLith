import { useCallback, useMemo, useRef } from "react";

import { searchEntities } from "@/lib/search/entityIndex";
import type { EntitySearchHit } from "@/lib/types/entitySearch";
import { useEntitySearchStore } from "@/stores/useEntitySearchStore";

const DEFAULT_LIMIT = 15;
const DEBOUNCE_MS = 80;

/**
 * API estable para autocompletado de entidades (Fase 3.2).
 * Requiere índice listo (`useEntityIndexBootstrap` en workspace).
 */
export function useEntitySearch() {
  const isReady = useEntitySearchStore((s) => s.isReady);
  const isLoading = useEntitySearchStore((s) => s.isLoading);
  const entityCount = useEntitySearchStore((s) => s.entityCount);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchImmediate = useCallback(
    (query: string, limit = DEFAULT_LIMIT): EntitySearchHit[] => {
      if (!isReady) {
        return [];
      }
      return searchEntities(query, limit);
    },
    [isReady],
  );

  const searchDebounced = useCallback(
    (query: string, limit: number, onResults: (hits: EntitySearchHit[]) => void) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onResults(searchImmediate(query, limit));
      }, DEBOUNCE_MS);
    },
    [searchImmediate],
  );

  return useMemo(
    () => ({
      isReady,
      isLoading,
      entityCount,
      search: searchImmediate,
      searchDebounced,
    }),
    [entityCount, isLoading, isReady, searchDebounced, searchImmediate],
  );
}
