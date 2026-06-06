import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PanelIconToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  "aria-label": string;
}

export function PanelIconToggle({
  checked,
  onChange,
  "aria-label": ariaLabel,
}: PanelIconToggleProps) {
  return (
    <Button
      type="button"
      variant={checked ? "secondary" : "outline"}
      size="icon"
      className="size-8 shrink-0"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
    >
      {checked ? <Check className="size-3.5" /> : null}
    </Button>
  );
}
