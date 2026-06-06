import { Button } from "@/components/ui/button";

interface PanelDraftFooterProps {
  validationMessage?: string | null;
  saveLabel: string;
  discardLabel: string;
  deleteLabel: string;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onDelete: () => void;
}

export function PanelDraftFooter({
  validationMessage,
  saveLabel,
  discardLabel,
  deleteLabel,
  dirty,
  saving,
  onSave,
  onDiscard,
  onDelete,
}: PanelDraftFooterProps) {
  return (
    <div className="space-y-2 p-3">
      {validationMessage ? (
        <p className="text-[10px] text-destructive" role="alert">
          {validationMessage}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button
          type="button"
          className="h-8 flex-1 text-xs"
          disabled={!dirty || saving}
          onClick={onSave}
        >
          {saveLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-8 flex-1 text-xs"
          disabled={!dirty || saving}
          onClick={onDiscard}
        >
          {discardLabel}
        </Button>
      </div>
      <Button
        type="button"
        variant="ghost"
        className="h-8 w-full text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={onDelete}
      >
        {deleteLabel}
      </Button>
    </div>
  );
}
