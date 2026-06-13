import { cn } from "@/lib/utils";

interface PanelFilterCheckboxProps {
  checked: boolean;
  label: string;
  onCheckedChange: () => void;
  indent?: boolean;
  className?: string;
}

export function PanelFilterCheckbox({
  checked,
  label,
  onCheckedChange,
  indent,
  className,
}: PanelFilterCheckboxProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/60",
        indent && "pl-6",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onCheckedChange}
        className="size-3.5 rounded border-border accent-primary"
      />
      <span>{label}</span>
    </label>
  );
}
