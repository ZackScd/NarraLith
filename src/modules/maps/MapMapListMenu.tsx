import { ChevronsUpDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import type { MapSummaryV2 } from "@/lib/types/maps";
import { cn } from "@/lib/utils";

interface MapMapListMenuProps {
  maps: MapSummaryV2[];
  activeMapId: string | null;
  onSelectMap: (mapId: string) => void;
}

export function MapMapListMenu({ maps, activeMapId, onSelectMap }: MapMapListMenuProps) {
  const { t } = useTranslation("maps");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  if (maps.length === 0) {
    return null;
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="size-7 shrink-0"
        title={t("topBar.openMapList")}
        aria-label={t("topBar.openMapList")}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronsUpDown className="size-3.5" />
      </Button>
      {open ? (
        <div
          className="absolute left-0 top-full z-50 mt-1 max-h-64 w-72 overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-lg"
          role="listbox"
          aria-label={t("selector.label")}
        >
          {maps.map((map) => {
            const isActive = map.id === activeMapId;
            return (
              <button
                key={map.id}
                type="button"
                role="option"
                aria-selected={isActive}
                className={cn(
                  "flex w-full px-3 py-2 text-left text-sm hover:bg-muted/60",
                  isActive && "bg-muted font-medium",
                )}
                onClick={() => {
                  onSelectMap(map.id);
                  setOpen(false);
                }}
              >
                {t("selector.option", {
                  name: map.name,
                  width: map.width,
                  height: map.height,
                })}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
