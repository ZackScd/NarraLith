import { useCallback, useEffect, useMemo, useState } from "react";
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
import { invokeCommand, parseAppError } from "@/lib/ipc";
import type { SnapshotSummary } from "@/lib/types/versioning";
import { formatSnapshotDate } from "@/lib/versions/formatSnapshotDate";
import { versionErrorKey } from "@/lib/versions/versionErrors";
import { DiffViewer } from "@/modules/versions/DiffViewer";
import { SaveSnapshotDialog } from "@/modules/versions/SaveSnapshotDialog";
import { useEditorStore } from "@/stores/useEditorStore";

interface VersionHistoryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ListSnapshot {
  key: string;
  snapshots: SnapshotSummary[];
  errorKey: string | null;
}

export function VersionHistoryPanel({ open, onOpenChange }: VersionHistoryPanelProps) {
  const { t, i18n } = useTranslation("versions");
  const activeFilePath = useEditorStore((s) => s.activeFilePath);
  const [listSnapshot, setListSnapshot] = useState<ListSnapshot | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [includeAuto, setIncludeAuto] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<SnapshotSummary | null>(null);
  const [compareTarget, setCompareTarget] = useState<SnapshotSummary | null>(null);
  const [compareHint, setCompareHint] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreErrorKey, setRestoreErrorKey] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  const fetchKey = useMemo(() => {
    if (!open) {
      return "";
    }
    return `versions:${includeAuto}:${reloadToken}`;
  }, [open, includeAuto, reloadToken]);

  useEffect(() => {
    if (!fetchKey) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const list = await invokeCommand<SnapshotSummary[]>("list_snapshots", {
          includeAuto,
          limit: 100,
        });
        if (!cancelled) {
          setListSnapshot({ key: fetchKey, snapshots: list, errorKey: null });
        }
      } catch (err) {
        if (!cancelled) {
          setListSnapshot({
            key: fetchKey,
            snapshots: [],
            errorKey: parseAppError(err)?.key ?? "error.unknown",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchKey, includeAuto]);

  const refreshList = useCallback(() => {
    setReloadToken((n) => n + 1);
  }, []);

  const isLoading = Boolean(fetchKey) && listSnapshot?.key !== fetchKey;
  const snapshots = listSnapshot?.key === fetchKey ? listSnapshot.snapshots : [];
  const listErrorKey = listSnapshot?.key === fetchKey ? listSnapshot.errorKey : null;

  function handlePanelOpenChange(next: boolean) {
    if (next) {
      setRestoreSuccess(false);
      setRestoreErrorKey(null);
      setCompareHint(null);
    } else {
      setCompareTarget(null);
    }
    onOpenChange(next);
  }

  function handleCompare(snap: SnapshotSummary) {
    if (!activeFilePath) {
      setCompareHint(t("history.compareNeedsFile"));
      return;
    }
    setCompareHint(null);
    setCompareTarget(snap);
  }

  function handleRestoreFromDiff(snap: SnapshotSummary) {
    setCompareTarget(null);
    setRestoreTarget(snap);
  }

  async function handleRestore() {
    if (!restoreTarget) {
      return;
    }
    setIsRestoring(true);
    setRestoreErrorKey(null);
    setRestoreSuccess(false);
    try {
      await invokeCommand("restore_snapshot", { snapshotId: restoreTarget.id });
      setRestoreSuccess(true);
      setRestoreTarget(null);
      refreshList();
      setTimeout(() => handlePanelOpenChange(false), 500);
    } catch (err) {
      setRestoreErrorKey(parseAppError(err)?.key ?? "error.unknown");
    } finally {
      setIsRestoring(false);
    }
  }

  function displayMessage(snap: SnapshotSummary): string {
    if (snap.kind === "auto" && snap.message.startsWith("narralith:auto:")) {
      return t("autoBackupHint", {
        time: formatSnapshotDate(snap.createdAt, i18n.language),
      });
    }
    return snap.message;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handlePanelOpenChange}>
        <DialogContent className="flex max-h-[85vh] max-w-lg flex-col">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={includeAuto}
                onChange={(e) => setIncludeAuto(e.target.checked)}
                className="size-3.5 rounded border-border"
              />
              {t("history.showAuto")}
            </label>
            <Button type="button" size="sm" onClick={() => setSaveOpen(true)}>
              {t("saveVersion")}
            </Button>
          </div>

          {compareHint ? (
            <p className="text-xs text-amber-600 dark:text-amber-400" role="status">
              {compareHint}
            </p>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto py-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">{t("history.loading")}</p>
            ) : listErrorKey ? (
              <p className="text-sm text-destructive" role="alert">
                {t(versionErrorKey(listErrorKey))}
              </p>
            ) : snapshots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {includeAuto ? t("history.emptyWithAutos") : t("history.empty")}
              </p>
            ) : (
              <ul className="space-y-2">
                {snapshots.map((snap) => (
                  <li
                    key={snap.id}
                    className="flex flex-col gap-2 rounded-md border border-border px-3 py-2 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {displayMessage(snap)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatSnapshotDate(snap.createdAt, i18n.language)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCompare(snap)}
                      >
                        {t("history.compare")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setRestoreTarget(snap)}
                      >
                        {t("history.restore")}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {restoreSuccess ? (
            <p className="text-sm text-muted-foreground">
              {t("restoreDialog.success")}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handlePanelOpenChange(false)}
            >
              {t("saveDialog.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SaveSnapshotDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        onSaved={() => refreshList()}
      />

      {compareTarget && activeFilePath ? (
        <DiffViewer
          open={compareTarget !== null}
          onOpenChange={(next) => {
            if (!next) {
              setCompareTarget(null);
            }
          }}
          relativePath={activeFilePath}
          snapshot={compareTarget}
          onRestoreProject={handleRestoreFromDiff}
        />
      ) : null}

      <Dialog
        open={restoreTarget !== null}
        onOpenChange={(next) => {
          if (!next) {
            setRestoreTarget(null);
            setRestoreErrorKey(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("restoreDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("restoreDialog.description", {
                name: restoreTarget ? displayMessage(restoreTarget) : "",
              })}
            </DialogDescription>
          </DialogHeader>
          {restoreErrorKey ? (
            <p className="text-sm text-destructive" role="alert">
              {t(versionErrorKey(restoreErrorKey))}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRestoreTarget(null)}
              disabled={isRestoring}
            >
              {t("restoreDialog.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isRestoring}
              onClick={() => void handleRestore()}
            >
              {t("restoreDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
