import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import type { TemplateField } from "@/lib/types/entityTemplate";

interface SelectFieldProps {
  field: TemplateField;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function SelectField({ field, label, value, onChange }: SelectFieldProps) {
  const { t } = useTranslation("worldbuilding");

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.key}>{label}</Label>
      <select
        id={field.key}
        className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{t("form.selectEmpty")}</option>
        {(field.options ?? []).map((opt) => (
          <option key={opt.value} value={opt.value}>
            {t(opt.labelKey.replace(/^worldbuilding\./, ""), {
              defaultValue: opt.value,
            })}
          </option>
        ))}
      </select>
    </div>
  );
}
