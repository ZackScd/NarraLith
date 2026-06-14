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
import {
  isAllSingleSessionNextBoot,
  patchAllSingleSessionNextBoot,
  useAuditStore,
  type AuditViewerTab,
} from "@/stores/useAuditStore";

interface DebugNavMenuProps {
  navBtnClassName: string;
  menuPlacement?: "nav" | "floating";
}

export function DebugNavMenu({
  navBtnClassName,
  menuPlacement = "nav",
}: DebugNavMenuProps) {
  const { t } = useTranslation("debug");
  const [menuOpen, setMenuOpen] = useState(false);
  const [clearAllOpen, setClearAllOpen] = useState(false);

  const bootstrapped = useAuditStore((s) => s.bootstrapped);
  const bootstrapping = useAuditStore((s) => s.bootstrapping);
  const settings = useAuditStore((s) => s.settings);
  const enabled = settings?.enabled ?? false;
  const renderLogEnabled = settings?.renderLogEnabled ?? false;
  const renderVerboseEnabled = settings?.renderVerboseEnabled ?? false;
  const actionLogEnabled = settings?.actionLogEnabled ?? false;
  const actionVerboseEnabled = settings?.actionVerboseEnabled ?? false;
  const singleSessionNextBoot = isAllSingleSessionNextBoot(settings);

  const setEnabled = useAuditStore((s) => s.setEnabled);
  const setRenderLogEnabled = useAuditStore((s) => s.setRenderLogEnabled);
  const setRenderVerboseEnabled = useAuditStore((s) => s.setRenderVerboseEnabled);
  const setActionLogEnabled = useAuditStore((s) => s.setActionLogEnabled);
  const setActionVerboseEnabled = useAuditStore((s) => s.setActionVerboseEnabled);
  const patchSettings = useAuditStore((s) => s.patchSettings);
  const clearAllLogs = useAuditStore((s) => s.clearAllLogs);
  const setViewerOpen = useAuditStore((s) => s.setViewerOpen);
  const setViewerTab = useAuditStore((s) => s.setViewerTab);

  const ready = bootstrapped && !bootstrapping;
  const anyLogging =
    enabled ||
    renderLogEnabled ||
    renderVerboseEnabled ||
    actionLogEnabled ||
    actionVerboseEnabled;

  const handleOpenDebugRoot = async () => {
    setMenuOpen(false);
    try {
      const { repoDebugRoot } = await auditGetLogPath();
      await openPath(repoDebugRoot);
    } catch (error) {
      console.debug("[audit] open folder failed", error);
      window.alert(t("openFolderFailed"));
    }
  };

  const handleConfirmClearAll = () => {
    setClearAllOpen(false);
    setMenuOpen(false);
    void clearAllLogs();
  };

  const openViewer = (tab: AuditViewerTab) => {
    setMenuOpen(false);
    setViewerTab(tab);
    setViewerOpen(true);
  };

  const menuPositionClass =
    menuPlacement === "floating"
      ? "fixed bottom-14 left-4 z-50 w-80"
      : "absolute bottom-0 left-full z-50 ml-2 w-80";

  return (
    <>
      <div className={menuPlacement === "floating" ? "fixed bottom-4 left-4 z-50" : "relative"}>
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
          <span className="absolute right-0.5 top-0.5 flex max-w-[14px] flex-wrap gap-0.5" aria-hidden>
            {enabled ? <span className="size-1.5 rounded-full bg-emerald-500" /> : null}
            {renderLogEnabled ? <span className="size-1.5 rounded-full bg-sky-500" /> : null}
            {renderVerboseEnabled ? <span className="size-1.5 rounded-full bg-amber-500" /> : null}
            {actionLogEnabled ? <span className="size-1.5 rounded-full bg-violet-500" /> : null}
            {actionVerboseEnabled ? <span className="size-1.5 rounded-full bg-pink-500" /> : null}
            {!anyLogging ? (
              <span className="size-1.5 rounded-full bg-muted-foreground/40" />
            ) : null}
          </span>
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
              className={cn(
                menuPositionClass,
                "max-h-[min(32rem,calc(100vh-4rem))] overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg",
              )}
            >
              <ToggleRow
                checked={enabled}
                title={t("toggleLogging")}
                subtitle={enabled ? t("loggingEnabled") : t("loggingDisabled")}
                onClick={() => void setEnabled(!enabled)}
              />
              <ToggleRow
                checked={renderLogEnabled}
                title={t("toggleRenderLogging")}
                subtitle={
                  renderLogEnabled ? t("renderLoggingEnabled") : t("renderLoggingDisabled")
                }
                onClick={() => void setRenderLogEnabled(!renderLogEnabled)}
              />
              <ToggleRow
                checked={renderVerboseEnabled}
                title={t("toggleRenderVerboseLogging")}
                subtitle={
                  renderVerboseEnabled
                    ? t("renderVerboseLoggingEnabled")
                    : t("renderVerboseLoggingDisabled")
                }
                hint={t("renderVerboseHint")}
                onClick={() => void setRenderVerboseEnabled(!renderVerboseEnabled)}
              />
              <ToggleRow
                checked={actionLogEnabled}
                title={t("toggleActionLogging")}
                subtitle={
                  actionLogEnabled ? t("actionLoggingEnabled") : t("actionLoggingDisabled")
                }
                onClick={() => void setActionLogEnabled(!actionLogEnabled)}
              />
              <ToggleRow
                checked={actionVerboseEnabled}
                title={t("toggleActionVerboseLogging")}
                subtitle={
                  actionVerboseEnabled
                    ? t("actionVerboseLoggingEnabled")
                    : t("actionVerboseLoggingDisabled")
                }
                hint={t("actionVerboseHint")}
                onClick={() => void setActionVerboseEnabled(!actionVerboseEnabled)}
              />

              <div className="my-1 border-t border-border" role="separator" />

              <MenuAction
                icon={Trash2}
                label={t("clearAllLogs")}
                onClick={() => {
                  setMenuOpen(false);
                  setClearAllOpen(true);
                }}
              />

              <ToggleRow
                checked={singleSessionNextBoot}
                title={t("singleSessionNextBoot")}
                subtitle={t("singleSessionHint")}
                onClick={() =>
                  void patchSettings(patchAllSingleSessionNextBoot(!singleSessionNextBoot))
                }
              />

              <div className="my-1 border-t border-border" role="separator" />

              <MenuAction
                icon={ScrollText}
                label={t("viewLog")}
                hint={t("viewerShortcutHint")}
                onClick={() => openViewer("system")}
              />
              <MenuAction
                icon={ScrollText}
                label={t("viewerTabUi")}
                onClick={() => openViewer("ui")}
              />
              <MenuAction
                icon={ScrollText}
                label={t("viewerTabUiVerbose")}
                onClick={() => openViewer("uiVerbose")}
              />
              <MenuAction
                icon={ScrollText}
                label={t("viewerTabAction")}
                onClick={() => openViewer("action")}
              />
              <MenuAction
                icon={ScrollText}
                label={t("viewerTabActionVerbose")}
                onClick={() => openViewer("actionVerbose")}
              />

              <MenuAction
                icon={FolderOpen}
                label={t("openDebugRootFolder")}
                onClick={() => void handleOpenDebugRoot()}
              />
            </div>
          </>
        ) : null}

        {!ready && bootstrapping ? (
          <span className="sr-only">{t("bootstrapping")}</span>
        ) : null}
      </div>

      <Dialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("clearAllLogsConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("clearAllLogsConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setClearAllOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirmClearAll}>
              {t("clearLogsConfirmAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ToggleRow({
  checked,
  title,
  subtitle,
  hint,
  onClick,
}: {
  checked: boolean;
  title: string;
  subtitle: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
      onClick={onClick}
    >
      <Check className={cn("mt-0.5 size-4 shrink-0", checked ? "opacity-100" : "opacity-0")} />
      <span>
        <span className="block font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
        {hint ? <span className="mt-0.5 block text-[10px] text-muted-foreground">{hint}</span> : null}
      </span>
    </button>
  );
}

function MenuAction({
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  icon: typeof Trash2;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
      onClick={onClick}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span>
        <span className="block">{label}</span>
        {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
    </button>
  );
}
