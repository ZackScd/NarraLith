import { Bug, Check, FolderOpen, ScrollText, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { openPath } from "@tauri-apps/plugin-opener";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { auditGetLogPath } from "@/lib/audit/ipc";
import { cn } from "@/lib/utils";
import { useAuditStore } from "@/stores/useAuditStore";

import { AuditLogViewer } from "@/modules/debug/AuditLogViewer";

interface DebugNavMenuProps {
  navBtnClassName: string;
}

export function DebugNavMenu({ navBtnClassName }: DebugNavMenuProps) {
  const { t } = useTranslation("debug");
  const [menuOpen, setMenuOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const bootstrapped = useAuditStore((s) => s.bootstrapped);
  const bootstrapping = useAuditStore((s) => s.bootstrapping);
  const enabled = useAuditStore((s) => s.settings?.enabled ?? false);
  const singleSessionNextBoot = useAuditStore(
    (s) => s.settings?.clearLogsOnNextBoot ?? false,
  );
  const setEnabled = useAuditStore((s) => s.setEnabled);
  const patchSettings = useAuditStore((s) => s.patchSettings);
  const clearLogs = useAuditStore((s) => s.clearLogs);
  const setViewerOpen = useAuditStore((s) => s.setViewerOpen);

  const ready = bootstrapped && !bootstrapping;
  const loggingLabel = enabled ? t("loggingEnabled") : t("loggingDisabled");

  const handleToggleLogging = () => {
    void setEnabled(!enabled);
  };

  const handleToggleSingleSession = () => {
    void patchSettings({ clearLogsOnNextBoot: !singleSessionNextBoot });
  };

  const handleOpenFolder = async () => {
    setMenuOpen(false);
    try {
      const { logsDir } = await auditGetLogPath();
      await openPath(logsDir);
    } catch (error) {
      console.debug("[audit] open folder failed", error);
      window.alert(t("openFolderFailed"));
    }
  };

  const handleConfirmClear = () => {
    setClearConfirmOpen(false);
    setMenuOpen(false);
    void clearLogs();
  };

  return (
    <>
      <div className="relative">
        <button
          type="button"
          title={t("menuTitle")}
          aria-label={t("menuTitle")}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          disabled={!ready}
          className={cn(
            navBtnClassName,
            "relative",
            menuOpen && "bg-muted text-foreground",
            !ready && "opacity-50",
          )}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Bug className="size-4" />
          <span
            className={cn(
              "absolute right-1 top-1 size-1.5 rounded-full",
              enabled ? "bg-emerald-500" : "bg-muted-foreground/40",
            )}
            aria-hidden
          />
        </button>

        {menuOpen && ready ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default"
              aria-label={t("cancel")}
              onClick={() => setMenuOpen(false)}
            />
            <div
              role="menu"
              className="absolute bottom-0 left-full z-50 ml-2 w-72 rounded-lg border border-border bg-card p-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={enabled}
                className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                onClick={handleToggleLogging}
              >
                <Check
                  className={cn("mt-0.5 size-4 shrink-0", enabled ? "opacity-100" : "opacity-0")}
                />
                <span>
                  <span className="block font-medium">{t("toggleLogging")}</span>
                  <span className="block text-xs text-muted-foreground">{loggingLabel}</span>
                </span>
              </button>

              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setMenuOpen(false);
                  setClearConfirmOpen(true);
                }}
              >
                <Trash2 className="size-4 shrink-0 text-muted-foreground" />
                {t("clearLogs")}
              </button>

              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={singleSessionNextBoot}
                className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                onClick={handleToggleSingleSession}
              >
                <Check
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    singleSessionNextBoot ? "opacity-100" : "opacity-0",
                  )}
                />
                <span>
                  <span className="block font-medium">{t("singleSessionNextBoot")}</span>
                  <span className="block text-xs text-muted-foreground">
                    {t("singleSessionHint")}
                  </span>
                </span>
              </button>

              <div className="my-1 border-t border-border" role="separator" />

              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  setMenuOpen(false);
                  setViewerOpen(true);
                }}
              >
                <ScrollText className="size-4 shrink-0 text-muted-foreground" />
                <span>
                  <span className="block font-medium">{t("viewLog")}</span>
                  <span className="block text-xs text-muted-foreground">
                    {t("viewerShortcutHint")}
                  </span>
                </span>
              </button>

              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                onClick={() => void handleOpenFolder()}
              >
                <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
                {t("openFolder")}
              </button>
            </div>
          </>
        ) : null}

        {!ready && bootstrapping ? (
          <span className="sr-only">{t("bootstrapping")}</span>
        ) : null}
      </div>

      <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("clearLogsConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("clearLogsConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setClearConfirmOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirmClear}>
              {t("clearLogsConfirmAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AuditLogViewer />
    </>
  );
}
