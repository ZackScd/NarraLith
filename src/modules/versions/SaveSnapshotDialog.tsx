import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { invokeCommand, parseAppError } from "@/lib/ipc";
import { versionErrorKey } from "@/lib/versions/versionErrors";

interface SaveSnapshotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function SaveSnapshotDialog({
  open,
  onOpenChange,
  onSaved,
}: SaveSnapshotDialogProps) {
  const { t } = useTranslation("versions");
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setErrorKey(null);
    try {
      await invokeCommand("create_snapshot", { name: name.trim() });
      setName("");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setErrorKey(parseAppError(err)?.key ?? "error.unknown");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("saveDialog.title")}</DialogTitle>
          <DialogDescription>{t("saveDialog.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="snapshot-name">{t("saveDialog.nameLabel")}</Label>
          <Input
            id="snapshot-name"
            value={name}
            placeholder={t("saveDialog.namePlaceholder")}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        {errorKey ? (
          <p className="text-xs text-destructive">{t(versionErrorKey(errorKey))}</p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("saveDialog.cancel")}
          </Button>
          <Button
            type="button"
            disabled={isSaving || !name.trim()}
            onClick={() => void handleSave()}
          >
            {t("saveDialog.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
