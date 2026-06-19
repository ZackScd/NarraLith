import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
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

interface CreateNavDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy?: boolean;
  onCreate: (name: string) => Promise<void>;
}

export function CreateNavDialog({
  open,
  onOpenChange,
  busy = false,
  onCreate,
}: CreateNavDialogProps) {
  const { t } = useTranslation("maps");
  const [name, setName] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
  }, [open]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await onCreate(trimmed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("nav.createTitle")}</DialogTitle>
          <DialogDescription>{t("nav.createDescription")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="nav-name">{t("nav.nameLabel")}</Label>
          <Input
            id="nav-name"
            value={name}
            disabled={busy}
            placeholder={t("nav.namePlaceholder")}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleSubmit();
            }}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("nav.cancel")}
          </Button>
          <Button type="button" disabled={busy || !name.trim()} onClick={() => void handleSubmit()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("nav.createSubmit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
