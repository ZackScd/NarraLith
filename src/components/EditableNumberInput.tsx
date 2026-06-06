import {
  useState,
  type ComponentProps,
  type FocusEvent,
  type KeyboardEvent,
} from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const INTEGER_PATTERN = /^-?\d*$/;
const DECIMAL_PATTERN = /^-?\d*\.?\d*$/;

export interface EditableNumberInputProps extends Omit<
  ComponentProps<typeof Input>,
  "value" | "onChange" | "type" | "inputMode"
> {
  value: number | null;
  onValueChange: (value: number | null) => void;
  min?: number;
  max?: number;
  /** Valor al confirmar (blur) si el campo quedó vacío. Por defecto: `value` actual o 0. */
  fallback?: number;
  /** Si true, vacío → `null` en lugar de `fallback`. */
  nullable?: boolean;
  /** Si false, permite decimales. Por defecto enteros. */
  integer?: boolean;
}

function parseDraft(
  raw: string,
  integer: boolean,
  fallback: number,
  nullable: boolean,
): number | null {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "-" || trimmed === ".") {
    return nullable ? null : fallback;
  }
  const n = integer ? parseInt(trimmed, 10) : parseFloat(trimmed);
  return Number.isFinite(n) ? n : nullable ? null : fallback;
}

function clampNumber(n: number, min?: number, max?: number): number {
  let out = n;
  if (min !== undefined) out = Math.max(min, out);
  if (max !== undefined) out = Math.min(max, out);
  return out;
}

function formatValue(value: number | null): string {
  return value == null ? "" : String(value);
}

/**
 * Campo numérico que permite vaciar el texto mientras se edita;
 * confirma y aplica min/max al perder el foco o pulsar Enter.
 */
export function EditableNumberInput({
  value,
  onValueChange,
  min,
  max,
  fallback,
  nullable = false,
  integer = true,
  className,
  onFocus,
  onBlur,
  onKeyDown,
  disabled,
  ...props
}: EditableNumberInputProps) {
  const resolvedFallback = fallback ?? value ?? 0;
  const [draft, setDraft] = useState<string | null>(null);
  const editing = draft !== null;
  const shown = editing ? draft : formatValue(value);

  const commit = (raw: string) => {
    const parsed = parseDraft(raw, integer, resolvedFallback, nullable);
    if (parsed === null) {
      onValueChange(null);
      return;
    }
    const next = clampNumber(parsed, min, max);
    onValueChange(next);
  };

  const pattern = integer ? INTEGER_PATTERN : DECIMAL_PATTERN;

  return (
    <Input
      {...props}
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      disabled={disabled}
      className={cn(className)}
      value={shown}
      onChange={(e) => {
        const next = e.target.value;
        if (pattern.test(next)) {
          setDraft(next);
        }
      }}
      onFocus={(e: FocusEvent<HTMLInputElement>) => {
        setDraft(formatValue(value));
        onFocus?.(e);
      }}
      onBlur={(e: FocusEvent<HTMLInputElement>) => {
        commit(draft ?? shown);
        setDraft(null);
        onBlur?.(e);
      }}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
        onKeyDown?.(e);
      }}
    />
  );
}
