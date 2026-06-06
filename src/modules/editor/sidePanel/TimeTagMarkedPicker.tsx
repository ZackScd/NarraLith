import { ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { EditableNumberInput } from "@/components/EditableNumberInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface TimeTagMarkedPickerOption {
  value: number;
  label: string;
  marked: boolean;
}

interface MenuRect {
  top: number;
  left: number;
  width: number;
}

interface TimeTagMarkedPickerProps {
  label: string;
  value: number | null;
  onValueChange: (value: number | null) => void;
  min: number;
  max: number;
  fallback: number;
  options: TimeTagMarkedPickerOption[];
  listAriaLabel: string;
  displaySuffix?: ReactNode;
  nullable?: boolean;
  placeholder?: string;
  className?: string;
  /** Ancho del input numérico cuando no hay displaySuffix (p. ej. w-9 para Hora con N/A). */
  valueWidthClass?: string;
  /** Estira el cuadro para llenar la celda (Mes/Día sin horas). */
  fill?: boolean;
}

const gridOverlayClass = "grid px-1 text-xs [&>*]:col-start-1 [&>*]:row-start-1";

const compactNumericInputClass =
  "h-8 shrink-0 border-0 bg-transparent px-1 text-center text-xs shadow-none focus-visible:ring-0";

export function TimeTagMarkedPicker({
  label,
  value,
  onValueChange,
  min,
  max,
  fallback,
  options,
  listAriaLabel,
  displaySuffix,
  nullable = false,
  placeholder,
  className,
  valueWidthClass = "w-8",
  fill = false,
}: TimeTagMarkedPickerProps) {
  const [open, setOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<MenuRect | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const widestLabel = useMemo(() => {
    const candidates = options.map((o) => o.label);
    if (placeholder) candidates.push(placeholder);
    return candidates.reduce(
      (best, candidate) => (candidate.length >= best.length ? candidate : best),
      "",
    );
  }, [options, placeholder]);

  const updateMenuRect = useCallback(() => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuRect({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setMenuRect(null);
  }, []);

  const toggleMenu = () => {
    if (open) {
      closeMenu();
      return;
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    updateMenuRect();
    const onScrollOrResize = () => updateMenuRect();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, updateMenuRect, widestLabel]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target) || menuRef.current?.contains(target))
        return;
      closeMenu();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, closeMenu]);

  const pick = (next: number) => {
    onValueChange(next);
    closeMenu();
  };

  const handleInputChange = (n: number | null) => {
    if (nullable) {
      onValueChange(n);
      return;
    }
    onValueChange(n ?? fallback);
  };

  const menu =
    open && menuRect && typeof document !== "undefined"
      ? createPortal(
          <ul
            ref={menuRef}
            className="fixed z-[60] max-h-48 overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-md"
            style={{
              top: menuRect.top,
              left: menuRect.left,
              minWidth: menuRect.width,
            }}
          >
            {options.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-xs hover:bg-muted",
                    value !== null && opt.value === value && "bg-muted",
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(opt.value);
                  }}
                >
                  <span className="whitespace-nowrap">{opt.label}</span>
                  {opt.marked ? (
                    <span
                      className="size-1.5 shrink-0 rounded-full bg-primary"
                      aria-hidden
                    />
                  ) : (
                    <span className="size-1.5 shrink-0" aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5",
        fill ? "min-w-0 flex-1" : "shrink-0",
        className,
      )}
    >
      <Label className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div
        ref={wrapRef}
        className={cn("relative", fill ? "min-w-0 flex-1" : "shrink-0")}
      >
        <div
          className={cn(
            "flex h-8 items-center rounded-md border border-input bg-background",
            fill && "w-full",
          )}
        >
          <EditableNumberInput
            min={min}
            max={max}
            fallback={fallback}
            nullable={nullable}
            placeholder={placeholder}
            value={value}
            onValueChange={handleInputChange}
            className={cn(
              compactNumericInputClass,
              displaySuffix ? "w-8" : valueWidthClass,
            )}
          />
          {displaySuffix ? (
            <span
              className={cn(
                "text-foreground",
                gridOverlayClass,
                fill && "min-w-0 flex-1",
              )}
            >
              <span className="invisible whitespace-nowrap" aria-hidden>
                {widestLabel}
              </span>
              <span className="truncate">{displaySuffix}</span>
            </span>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "size-8 shrink-0 rounded-l-none",
              fill && !displaySuffix && "ml-auto",
            )}
            aria-label={listAriaLabel}
            title={listAriaLabel}
            aria-expanded={open}
            onClick={toggleMenu}
          >
            <ChevronDown className="size-3.5" />
          </Button>
        </div>
      </div>
      {menu}
    </div>
  );
}
