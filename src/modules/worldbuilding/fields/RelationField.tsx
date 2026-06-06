import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEntitySearch } from "@/hooks/useEntitySearch";
import type { TemplateField } from "@/lib/types/entityTemplate";
import { cn } from "@/lib/utils";

interface RelationFieldProps {
  field: TemplateField;
  value: unknown;
  label: string;
  onChange: (value: string | string[]) => void;
}

function displayValue(value: unknown, multiple: boolean): string {
  if (multiple && Array.isArray(value)) {
    return value.map((v) => String(v)).join(", ");
  }
  if (value == null) return "";
  return String(value);
}

function parseMultiple(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function RelationFieldInner({ field, value, label, onChange }: RelationFieldProps) {
  const { t } = useTranslation("worldbuilding");
  const multiple = Boolean(field.multiple);
  const display = displayValue(value, multiple);
  const { isReady, searchDebounced } = useEntitySearch();
  const [query, setQuery] = useState(display);
  const [hits, setHits] = useState<{ name: string; path: string }[]>([]);

  const categories = useMemo(
    () => new Set(field.relationCategories ?? []),
    [field.relationCategories],
  );

  function runSearch(q: string) {
    if (!isReady) {
      setHits([]);
      return;
    }
    const term = multiple ? (q.split(",").pop()?.trim() ?? q) : q;
    searchDebounced(term, 8, (results) => {
      const filtered =
        categories.size === 0
          ? results
          : results.filter((h) => categories.has(h.category));
      setHits(filtered.map((h) => ({ name: h.name, path: h.path })));
    });
  }

  function commit(next: string) {
    setQuery(next);
    if (multiple) {
      onChange(parseMultiple(next));
    } else {
      onChange(next);
    }
  }

  function pickHit(name: string) {
    if (multiple) {
      const parts = parseMultiple(query);
      if (parts.includes(name)) return;
      const next = [...parts, name].join(", ");
      commit(next);
    } else {
      commit(name);
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.key}>{label}</Label>
      <Input
        id={field.key}
        list={`${field.key}-hits`}
        value={query}
        placeholder={multiple ? t("form.pickEntities") : t("form.pickEntity")}
        onChange={(e) => commit(e.target.value)}
        onFocus={() => runSearch(query)}
      />
      <datalist id={`${field.key}-hits`}>
        {hits.map((h) => (
          <option key={h.path} value={h.name} label={h.path} />
        ))}
      </datalist>
      {hits.length > 0 && (
        <ul className="rounded-md border border-border bg-popover p-1 shadow-sm">
          {hits.map((h) => (
            <li key={h.path}>
              <button
                type="button"
                className={cn(
                  "w-full rounded px-2 py-1 text-left text-sm hover:bg-accent",
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pickHit(h.name);
                }}
              >
                {h.name}
                <span className="ml-2 text-xs text-muted-foreground">{h.path}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {isReady && hits.length === 0 && query.length > 0 && (
        <p className={cn("text-xs text-muted-foreground")}>{t("form.noResults")}</p>
      )}
    </div>
  );
}

export function RelationField(props: RelationFieldProps) {
  const multiple = Boolean(props.field.multiple);
  const remountKey = `${props.field.key}:${displayValue(props.value, multiple)}`;
  return <RelationFieldInner key={remountKey} {...props} />;
}
