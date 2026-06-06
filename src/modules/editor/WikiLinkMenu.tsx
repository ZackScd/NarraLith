import { useTranslation } from "react-i18next";

import type { EntitySearchHit } from "@/lib/types/entitySearch";
import { cn } from "@/lib/utils";

interface WikiLinkMenuProps {
  hits: EntitySearchHit[];
  selectedIndex: number;
  query: string;
  isReady: boolean;
  anchorRect: DOMRect | null;
  onSelect: (hit: EntitySearchHit) => void;
  onHoverIndex: (index: number) => void;
}

export function WikiLinkMenu({
  hits,
  selectedIndex,
  query,
  isReady,
  anchorRect,
  onSelect,
  onHoverIndex,
}: WikiLinkMenuProps) {
  const { t } = useTranslation("references");

  if (!anchorRect) {
    return null;
  }

  const top = anchorRect.bottom + window.scrollY + 4;
  const left = anchorRect.left + window.scrollX;

  return (
    <div
      className="narra-wikilink-menu fixed z-50 min-w-[220px] max-w-[360px] rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-md"
      style={{ top, left }}
      role="listbox"
      aria-label={t("typeahead.ariaLabel")}
    >
      {!isReady ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">
          {t("typeahead.loading")}
        </p>
      ) : hits.length === 0 ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">
          {query.trim() ? t("typeahead.empty", { query }) : t("typeahead.hint")}
        </p>
      ) : (
        <ul className="max-h-56 overflow-y-auto">
          {hits.map((hit, index) => (
            <li key={hit.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === selectedIndex}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent",
                  index === selectedIndex && "bg-accent",
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(hit);
                }}
                onMouseEnter={() => onHoverIndex(index)}
              >
                <span className="font-medium">{hit.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {hit.path}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
