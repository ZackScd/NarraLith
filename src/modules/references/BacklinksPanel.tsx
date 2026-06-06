import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useReferencesData } from "@/hooks/useReferencesData";
import { invokeCommand, parseAppError } from "@/lib/ipc";
import { normalizeReferencesErrorKey } from "@/lib/references/referenceErrors";
import { basename } from "@/lib/pathUtils";
import type { UnlinkedMentionRow } from "@/lib/types/references";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/useEditorStore";

export function BacklinksPanel() {
  const { t } = useTranslation("references");
  const { entityPath, entityName, backlinks, unlinked, isLoading, errorKey, reload } =
    useReferencesData();

  const navigateToDocument = useEditorStore((s) => s.navigateToDocument);
  const setActiveBlockIndex = useEditorStore((s) => s.setActiveBlockIndex);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [convertErrorKey, setConvertErrorKey] = useState<string | null>(null);

  if (!entityPath || !entityName) {
    return <p className="text-xs text-muted-foreground">{t("panel.noEntity")}</p>;
  }

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">{t("panel.loading")}</p>;
  }

  if (errorKey) {
    return (
      <p className="text-xs text-destructive">
        {t(normalizeReferencesErrorKey(errorKey), {
          defaultValue: errorKey,
        })}
      </p>
    );
  }

  const openBacklink = async (sourcePath: string, blockIndex: number) => {
    await navigateToDocument(sourcePath);
    setActiveBlockIndex(blockIndex);
  };

  const convertMention = async (row: UnlinkedMentionRow) => {
    const id = mentionKey(row);
    setConvertingId(id);
    setConvertErrorKey(null);
    try {
      await invokeCommand("convert_unlinked_mention", {
        sourcePath: row.sourcePath,
        blockIndex: row.blockIndex,
        start: row.start,
        end: row.end,
        entityName,
      });
      const { activeFilePath, reloadDocumentFromDisk } = useEditorStore.getState();
      if (activeFilePath === row.sourcePath) {
        await reloadDocumentFromDisk();
      }
      reload();
    } catch (err) {
      setConvertErrorKey(parseAppError(err)?.key ?? "error.references.unknown");
    } finally {
      setConvertingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-sm">
      <section>
        <h3 className="mb-2 text-xs font-medium text-foreground">
          {t("panel.backlinksTitle", { name: entityName })}
        </h3>
        {backlinks.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("panel.backlinksEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {backlinks.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="w-full rounded-md border border-border px-2 py-1.5 text-left hover:bg-accent"
                  onClick={() => void openBacklink(row.sourcePath, row.blockIndex)}
                >
                  <span className="block truncate text-xs font-medium text-foreground">
                    {basename(row.sourcePath)}
                    {row.blockIndex >= 0 && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {t("panel.blockShort", { index: row.blockIndex + 1 })}
                      </span>
                    )}
                  </span>
                  {row.snippet && (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {row.snippet}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {convertErrorKey && (
        <p className="text-xs text-destructive">
          {t(normalizeReferencesErrorKey(convertErrorKey), {
            defaultValue: convertErrorKey,
          })}
        </p>
      )}

      <section>
        <h3 className="mb-2 text-xs font-medium text-foreground">
          {t("panel.unlinkedTitle")}
        </h3>
        {unlinked.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("panel.unlinkedEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {unlinked.map((row) => {
              const id = mentionKey(row);
              return (
                <li key={id} className="rounded-md border border-border px-2 py-1.5">
                  <button
                    type="button"
                    className="mb-1 w-full text-left"
                    onClick={() => void openBacklink(row.sourcePath, row.blockIndex)}
                  >
                    <span className="block truncate text-xs font-medium">
                      {basename(row.sourcePath)}
                      <span className="text-muted-foreground">
                        {" "}
                        · {t("panel.blockShort", { index: row.blockIndex + 1 })}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {row.snippet}
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className={cn("h-7 w-full text-xs")}
                    disabled={convertingId === id}
                    onClick={() => void convertMention(row)}
                  >
                    {convertingId === id
                      ? t("panel.converting")
                      : t("panel.convertToLink")}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function mentionKey(row: UnlinkedMentionRow): string {
  return `${row.sourcePath}:${row.blockIndex}:${row.start}`;
}
