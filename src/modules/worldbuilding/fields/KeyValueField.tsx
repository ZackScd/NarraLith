import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TemplateField } from "@/lib/types/entityTemplate";

type Row = { key: string; value: string };

function toRows(raw: unknown): Row[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter(
        (item): item is Record<string, unknown> =>
          item != null && typeof item === "object",
      )
      .map((item) => ({
        key: String(item.key ?? item.name ?? ""),
        value: String(item.value ?? ""),
      }));
  }
  if (typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>).map(([key, value]) => ({
      key,
      value: value == null ? "" : String(value),
    }));
  }
  return [];
}

function fromRows(rows: Row[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    const k = row.key.trim();
    if (!k) continue;
    out[k] = row.value;
  }
  return out;
}

interface KeyValueFieldProps {
  field: TemplateField;
  label: string;
  value: unknown;
  onChange: (value: Record<string, string>) => void;
}

export function KeyValueField({ field, label, value, onChange }: KeyValueFieldProps) {
  const { t } = useTranslation("worldbuilding");
  const rows = toRows(value);

  function update(next: Row[]) {
    onChange(fromRows(next));
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={`${field.key}-${index}`} className="flex gap-2">
            <Input
              className="flex-1"
              placeholder={t("form.keyPlaceholder")}
              value={row.key}
              onChange={(e) => {
                const next = [...rows];
                next[index] = { ...row, key: e.target.value };
                update(next);
              }}
            />
            <Input
              className="flex-[2]"
              placeholder={t("form.valuePlaceholder")}
              value={row.value}
              onChange={(e) => {
                const next = [...rows];
                next[index] = { ...row, value: e.target.value };
                update(next);
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={t("form.removeRow")}
              onClick={() => update(rows.filter((_, i) => i !== index))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => update([...rows, { key: "", value: "" }])}
      >
        <Plus className="mr-1 size-4" />
        {t("form.addRow")}
      </Button>
    </div>
  );
}
