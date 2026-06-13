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

type ClearTarget = "system" | "render" | "renderVerbose" | null;

export function DebugNavMenu({ navBtnClassName }: DebugNavMenuProps) {
  const { t } = useTranslation("debug");
  const [menuOpen, setMenuOpen] = useState(false);
  const [clearTarget, setClearTarget] = useState<ClearTarget>(null);

  const bootstrapped = useAuditStore((s) => s.bootstrapped);
  const bootstrapping = useAuditStore((s) => s.bootstrapping);
  const settings = useAuditStore((s) => s.settings);
  const enabled = settings?.enabled ?? false;
  const renderLogEnabled = settings?.renderLogEnabled ?? false;
  const renderVerboseEnabled = settings?.renderVerboseEnabled ?? false;
  const singleSessionNextBoot = settings?.clearLogsOnNextBoot ?? false;
  const renderSingleSessionNextBoot = settings?.renderClearLogsOnNextBoot ?? false;
  const renderVerboseSingleSessionNextBoot =
    settings?.renderVerboseClearLogsOnNextBoot ?? false;

  const setEnabled = useAuditStore((s) => s.setEnabled);
  const setRenderLogEnabled = useAuditStore((s) => s.setRenderLogEnabled);
  const setRenderVerboseEnabled = useAuditStore((s) => s.setRenderVerboseEnabled);
  const patchSettings = useAuditStore((s) => s.patchSettings);
  const clearLogs = useAuditStore((s) => s.clearLogs);
  const clearRenderLogs = useAuditStore((s) => s.clearRenderLogs);
  const setViewerOpen = useAuditStore((s) => s.setViewerOpen);
  const setViewerTab = useAuditStore((s) => s.setViewerTab);

  const ready = bootstrapped && !bootstrapping;
  const anyLogging = enabled || renderLogEnabled || renderVerboseEnabled;

  const handleOpenFolder = async (kind: "logs" | "render") => {
    setMenuOpen(false);
    try {
      const { logsDir, renderLogsDir } = await auditGetLogPath();
      await openPath(kind === "logs" ? logsDir : renderLogsDir);
    } catch (error) {
      console.debug("[audit] open folder failed", error);
      window.alert(t("openFolderFailed"));
    }
  };

  const handleConfirmClear = () => {
    const target = clearTarget;
    setClearTarget(null);
    setMenuOpen(false);
    if (target === "system") {
      void clearLogs();
    } else if (target === "render") {
      void clearRenderLogs("standard");
    } else if (target === "renderVerbose") {
      void clearRenderLogs("verbose");
    }
  };

  const clearDialogCopy =
    clearTarget === "system"
      ? { title: t("clearLogsConfirmTitle"), body: t("clearLogsConfirm") }
      : clearTarget === "render"
        ? { title: t("clearRenderLogsConfirmTitle"), body: t("clearRenderLogsConfirm") }
        : clearTarget === "renderVerbose"
          ? {
              title: t("clearRenderVerboseLogsConfirmTitle"),
              body: t("clearRenderVerboseLogsConfirm"),
            }
          : null;

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
          <span className="absolute right-0.5 top-0.5 flex gap-0.5" aria-hidden>
            {enabled ? <span className="size-1.5 rounded-full bg-emerald-500" /> : null}
            {renderLogEnabled ? <span className="size-1.5 rounded-full bg-sky-500" /> : null}
            {renderVerboseEnabled ? <span className="size-1.5 rounded-full bg-amber-500" /> : null}
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
              className="absolute bottom-0 left-full z-50 ml-2 max-h-[min(32rem,calc(100vh-4rem))] w-80 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg"
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

              <div className="my-1 border-t border-border" role="separator" />

              <MenuAction
                icon={Trash2}
                label={t("clearLogs")}
                onClick={() => {
                  setMenuOpen(false);
                  setClearTarget("system");
                }}
              />
              <MenuAction
                icon={Trash2}
                label={t("clearRenderLogs")}
                onClick={() => {
                  setMenuOpen(false);
                  setClearTarget("render");
                }}
              />
              <MenuAction
                icon={Trash2}
                label={t("clearRenderVerboseLogs")}
                onClick={() => {
                  setMenuOpen(false);
                  setClearTarget("renderVerbose");
                }}
              />

              <ToggleRow
                checked={singleSessionNextBoot}
                title={t("singleSessionNextBoot")}
                subtitle={t("singleSessionHint")}
                onClick={() =>
                  void patchSettings({ clearLogsOnNextBoot: !singleSessionNextBoot })
                }
              />
              <ToggleRow
                checked={renderSingleSessionNextBoot}
                title={t("renderSingleSessionNextBoot")}
                subtitle={t("renderSingleSessionHint")}
                onClick={() =>
                  void patchSettings({
                    renderClearLogsOnNextBoot: !renderSingleSessionNextBoot,
                  })
                }
              />
              <ToggleRow
                checked={renderVerboseSingleSessionNextBoot}
                title={t("renderVerboseSingleSessionNextBoot")}
                subtitle={t("renderVerboseSingleSessionHint")}
                onClick={() =>
                  void patchSettings({
                    renderVerboseClearLogsOnNextBoot: !renderVerboseSingleSessionNextBoot,
                  })
                }
              />

              <div className="my-1 border-t border-border" role="separator" />

              <MenuAction
                icon={ScrollText}
                label={t("viewLog")}
                hint={t("viewerShortcutHint")}
                onClick={() => {
                  setMenuOpen(false);
                  setViewerOpen(true);
                }}
              />
              <MenuAction
                icon={ScrollText}
                label={t("viewerTabUi")}
                onClick={() => {
                  setMenuOpen(false);
                  setViewerTab("ui");
                  setViewerOpen(true);
                }}
              />
              <MenuAction
                icon={ScrollText}
                label={t("viewerTabUiVerbose")}
                onClick={() => {
                  setMenuOpen(false);
                  setViewerTab("uiVerbose");
                  setViewerOpen(true);
                }}
              />

              <MenuAction
                icon={FolderOpen}
                label={t("openFolder")}
                onClick={() => void handleOpenFolder("logs")}
              />
              <MenuAction
                icon={FolderOpen}
                label={t("openRenderFolder")}
                onClick={() => void handleOpenFolder("render")}
              />
            </div>
          </>
        ) : null}

        {!ready && bootstrapping ? (
          <span className="sr-only">{t("bootstrapping")}</span>
        ) : null}
      </div>

      <Dialog open={clearTarget !== null} onOpenChange={(open) => !open && setClearTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{clearDialogCopy?.title}</DialogTitle>
            <DialogDescription>{clearDialogCopy?.body}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setClearTarget(null)}>
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
