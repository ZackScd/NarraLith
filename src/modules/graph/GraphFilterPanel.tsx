import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

interface GraphFilterPanelProps {
  categories: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}

export function GraphFilterPanel({
  categories,
  selected,
  onChange,
}: GraphFilterPanelProps) {
  const { t } = useTranslation("graph");

  function toggle(category: string) {
    if (selected.length === 0) {
      onChange(categories.filter((c) => c !== category));
      return;
    }
    if (selected.includes(category)) {
      const next = selected.filter((c) => c !== category);
      onChange(next);
    } else {
      const next = [...selected, category];
      onChange(next.length >= categories.length ? [] : next);
    }
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-2 overflow-y-auto rounded-md border border-border bg-card/50 p-3">
      <h3 className="text-sm font-medium">{t("filters.title")}</h3>
      <p className="text-xs text-muted-foreground">{t("filters.hint")}</p>
      {categories.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("filters.none")}</p>
      ) : (
        <ul className="space-y-1">
          {categories.map((category) => (
            <li key={category}>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.length === 0 || selected.includes(category)}
                  onChange={() => toggle(category)}
                />
                <span>{t(`categories.${category}`, { defaultValue: category })}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {selected.length > 0 ? (
        <button
          type="button"
          className={cn(
            "text-left text-xs text-muted-foreground underline-offset-2 hover:underline",
          )}
          onClick={() => onChange([])}
        >
          {t("filters.clear")}
        </button>
      ) : null}
    </aside>
  );
}
