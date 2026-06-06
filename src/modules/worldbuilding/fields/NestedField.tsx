import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TemplateField } from "@/lib/types/entityTemplate";

type NestedRow = Record<string, string>;

function toRows(raw: unknown, keys: string[]): NestedRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is Record<string, unknown> =>
        item != null && typeof item === "object",
    )
    .map((item) => {
      const row: NestedRow = {};
      for (const k of keys) {
        row[k] = item[k] == null ? "" : String(item[k]);
      }
      return row;
    });
}

interface NestedFieldProps {
  field: TemplateField;
  label: string;
  value: unknown;
  onChange: (value: NestedRow[]) => void;
}

export function NestedField({ field, label, value, onChange }: NestedFieldProps) {
  const { t } = useTranslation("worldbuilding");
  const subKeys = (field.nestedFields ?? []).map((f) => f.key);
  const rows = toRows(value, subKeys);

  function subLabel(labelKey: string): string {
    return t(labelKey.replace(/^worldbuilding\./, ""), { defaultValue: labelKey });
  }

  function update(next: NestedRow[]) {
    onChange(
      next
        .map((row) => {
          const out: NestedRow = {};
          for (const k of subKeys) {
            const v = (row[k] ?? "").trim();
            if (v) out[k] = v;
          }
          return out;
        })
        .filter((row) => Object.keys(row).length > 0),
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={`${field.key}-${index}`}
            className="space-y-2 rounded-md border border-border p-3"
          >
            {(field.nestedFields ?? []).map((sub) => (
              <div key={sub.key} className="space-y-1">
                <Label className="text-xs">{subLabel(sub.labelKey)}</Label>
                <Input
                  value={row[sub.key] ?? ""}
                  onChange={(e) => {
                    const next = [...rows];
                    next[index] = { ...row, [sub.key]: e.target.value };
                    update(next);
                  }}
                />
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => update(rows.filter((_, i) => i !== index))}
            >
              <Trash2 className="mr-1 size-4" />
              {t("form.removeRow")}
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          const blank: NestedRow = {};
          for (const k of subKeys) blank[k] = "";
          update([...rows, blank]);
        }}
      >
        <Plus className="mr-1 size-4" />
        {t("form.addRow")}
      </Button>
    </div>
  );
}
