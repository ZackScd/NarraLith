import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import type { PendingNavChildZone } from "@/lib/maps/mapNavChildZone";

interface CreateNavChildDialogProps {
  open: boolean;
  zone: PendingNavChildZone | null;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => Promise<void>;
}

export function CreateNavChildDialog({
  open,
  zone,
  busy = false,
  onOpenChange,
  onCreate,
}: CreateNavChildDialogProps) {
  const { t } = useTranslation("maps");
  const [name, setName] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
  }, [open]);

  const description = useMemo(() => {
    if (!zone) return "";
    if (zone.kind === "rect") {
      return t("hotspot.navChild.descriptionRect", {
        width: Math.round(zone.bounds.width),
        height: Math.round(zone.bounds.height),
      });
    }
    if (zone.kind === "circle") {
      return t("hotspot.navChild.descriptionCircle", {
        radius: Math.round(zone.circle.radius),
      });
    }
    return t("hotspot.navChild.description", { count: zone.points.length });
  }, [t, zone]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("hotspot.navChild.title")}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="nav-child-name">{t("nav.nameLabel")}</Label>
          <Input
            id="nav-child-name"
            value={name}
            disabled={busy}
            placeholder={t("nav.namePlaceholder")}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && name.trim()) {
                void onCreate(name.trim()).then(() => onOpenChange(false));
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("hotspot.cancel")}
          </Button>
          <Button
            type="button"
            disabled={busy || !name.trim() || !zone}
            onClick={async () => {
              await onCreate(name.trim());
              onOpenChange(false);
            }}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : t("hotspot.navChild.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
