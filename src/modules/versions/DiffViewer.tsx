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
import type { FileDiffResult, SnapshotSummary } from "@/lib/types/versioning";
import { versionErrorKey } from "@/lib/versions/versionErrors";

interface DiffViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relativePath: string;
  snapshot: SnapshotSummary;
  onRestoreProject?: (snapshot: SnapshotSummary) => void;
}

interface DiffSnapshot {
  key: string;
  result: FileDiffResult | null;
  errorKey: string | null;
}

export function DiffViewer({
  open,
  onOpenChange,
  relativePath,
  snapshot,
  onRestoreProject,
}: DiffViewerProps) {
  const { t } = useTranslation("versions");
  const [diffSnapshot, setDiffSnapshot] = useState<DiffSnapshot | null>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  const fetchKey = useMemo(() => {
    if (!open || !relativePath) {
      return "";
    }
    return `${snapshot.id}:${relativePath}`;
  }, [open, relativePath, snapshot.id]);

  useEffect(() => {
    if (!fetchKey) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const result = await invokeCommand<FileDiffResult>("get_file_diff", {
          relativePath,
          snapshotIdA: snapshot.id,
          snapshotIdB: null,
        });
        if (!cancelled) {
          setDiffSnapshot({ key: fetchKey, result, errorKey: null });
        }
      } catch (err) {
        if (!cancelled) {
          setDiffSnapshot({
            key: fetchKey,
            result: null,
            errorKey: parseAppError(err)?.key ?? "error.unknown",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchKey, relativePath, snapshot.id]);

  const isLoading = Boolean(fetchKey) && diffSnapshot?.key !== fetchKey;
  const diff = diffSnapshot?.key === fetchKey ? diffSnapshot.result : null;
  const errorKey = diffSnapshot?.key === fetchKey ? diffSnapshot.errorKey : null;

  const handleCopyRemoved = useCallback(async () => {
    const selection = window.getSelection()?.toString() ?? "";
    const removedText = diff?.chunks
      .filter((c) => c.kind === "remove")
      .map((c) => c.text)
      .join("");

    const text = selection.trim() || removedText;
    if (!text) {
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopyHint(t("diff.copySuccess"));
      setTimeout(() => setCopyHint(null), 2000);
    } catch {
      setCopyHint(t("diff.copyFailed"));
    }
  }, [diff, t]);

  const isEmpty =
    diff !== null &&
    diff.chunks.length > 0 &&
    diff.chunks.every((c) => c.kind === "equal");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle>{t("diff.title")}</DialogTitle>
          <DialogDescription>
            {t("diff.description", {
              name: snapshot.message,
              path: relativePath,
            })}
          </DialogDescription>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">{t("diff.legend")}</p>

        <div
          className="min-h-0 flex-1 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-sm leading-relaxed"
          role="document"
          aria-label={t("diff.contentLabel")}
        >
          {isLoading ? (
            <p className="text-muted-foreground">{t("diff.loading")}</p>
          ) : errorKey ? (
            <p className="text-destructive" role="alert">
              {t(versionErrorKey(errorKey))}
            </p>
          ) : isEmpty ? (
            <p className="text-muted-foreground">{t("diff.empty")}</p>
          ) : (
            diff?.chunks.map((chunk, index) => (
              <span
                key={`${chunk.kind}-${index}`}
                className={
                  chunk.kind === "add"
                    ? "rounded-sm bg-emerald-500/20 text-emerald-900 dark:text-emerald-100"
                    : chunk.kind === "remove"
                      ? "rounded-sm bg-red-500/20 text-red-900 line-through dark:text-red-100"
                      : undefined
                }
                aria-label={
                  chunk.kind === "add"
                    ? t("diff.added")
                    : chunk.kind === "remove"
                      ? t("diff.removed")
                      : undefined
                }
              >
                {chunk.text}
              </span>
            ))
          )}
        </div>

        {copyHint ? <p className="text-xs text-muted-foreground">{copyHint}</p> : null}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleCopyRemoved()}
            >
              {t("diff.copyRemoved")}
            </Button>
            {onRestoreProject ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => onRestoreProject(snapshot)}
              >
                {t("diff.restoreProject")}
              </Button>
            ) : null}
          </div>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("saveDialog.cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
