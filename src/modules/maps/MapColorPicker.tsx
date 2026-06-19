import { useTranslation } from "react-i18next";

import { MAP_STUDIO_PALETTE } from "@/lib/maps/mapBrushes";
import { cn } from "@/lib/utils";

interface MapColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return null;
}

export function MapColorPicker({ color, onChange, disabled = false }: MapColorPickerProps) {
  const { t } = useTranslation("maps");

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {MAP_STUDIO_PALETTE.map((swatch) => (
        <button
          key={swatch}
          type="button"
          disabled={disabled}
          className={cn(
            "size-6 shrink-0 rounded-full border border-border/80 transition-shadow",
            color.toLowerCase() === swatch.toLowerCase() && "ring-2 ring-primary ring-offset-1 ring-offset-background",
          )}
          style={{ backgroundColor: swatch }}
          aria-label={t("studio.colorSwatch", { color: swatch })}
          aria-pressed={color.toLowerCase() === swatch.toLowerCase()}
          onClick={() => onChange(swatch)}
        />
      ))}
      <label className="relative size-6 shrink-0 cursor-pointer overflow-hidden rounded-full border border-border/80">
        <span
          className="absolute inset-0"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <input
          type="color"
          value={color}
          disabled={disabled}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          aria-label={t("studio.customColor")}
          onChange={(e) => {
            const next = normalizeHex(e.target.value);
            if (next) onChange(next);
          }}
        />
      </label>
    </div>
  );
}
