import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { panelInputClass } from "@/components/workspace-ui";
import { useEntitySearch } from "@/hooks/useEntitySearch";
import type { EntitySearchHit } from "@/lib/types/entitySearch";
import { cn } from "@/lib/utils";

interface WikiPathInputProps {
  value: string;
  placeholder?: string;
  className?: string;
  onChange: (path: string) => void;
}

export function WikiPathInput({
  value,
  placeholder,
  className,
  onChange,
}: WikiPathInputProps) {
  const { isReady, searchDebounced } = useEntitySearch();
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<EntitySearchHit[]>([]);
  const [selected, setSelected] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !isReady) return;
    const q = value.startsWith("[[") ? value.slice(2) : value;
    searchDebounced(q.trim(), 8, setHits);
  }, [value, open, isReady, searchDebounced]);

  const visibleHits = open && isReady ? hits : [];

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (hit: EntitySearchHit) => {
    onChange(hit.path);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <Input
        value={value}
        placeholder={placeholder ?? "[[archivo]]"}
        className={cn(panelInputClass, className)}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setSelected(0);
        }}
        onKeyDown={(e) => {
          if (!open || visibleHits.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelected((i) => (i + 1) % visibleHits.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelected((i) => (i - 1 + visibleHits.length) % visibleHits.length);
          } else if (e.key === "Enter" && visibleHits[selected]) {
            e.preventDefault();
            pick(visibleHits[selected]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && visibleHits.length > 0 ? (
        <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-40 overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-md">
          {visibleHits.map((hit, i) => (
            <li key={hit.path}>
              <button
                type="button"
                className={cn(
                  "flex w-full flex-col px-2 py-1 text-left text-xs hover:bg-muted",
                  i === selected && "bg-muted",
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(hit);
                }}
              >
                <span className="font-medium">{hit.name}</span>
                <span className="truncate text-[10px] text-muted-foreground">
                  {hit.path}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
