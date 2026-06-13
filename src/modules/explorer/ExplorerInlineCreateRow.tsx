import { useTranslation } from "react-i18next";

import { ExplorerInlineNameRow } from "@/modules/explorer/ExplorerInlineNameRow";
import { useFileTreeStore } from "@/stores/useFileTreeStore";

export interface ExplorerInlineCreateRowProps {
  kind: "file" | "folder";
  parentPath: string;
  depth: number;
  compact?: boolean;
}

export function ExplorerInlineCreateRow({
  kind,
  parentPath: _parentPath,
  depth,
  compact = false,
}: ExplorerInlineCreateRowProps) {
  const { t } = useTranslation("explorer");
  const commitInlineCreate = useFileTreeStore((s) => s.commitInlineCreate);
  const cancelInlineCreate = useFileTreeStore((s) => s.cancelInlineCreate);

  const ariaLabel =
    kind === "file" ? t("inlineCreate.file") : t("inlineCreate.folder");

  return (
    <ExplorerInlineNameRow
      kind={kind}
      depth={depth}
      compact={compact}
      initialValue=""
      onCommit={(value) => void commitInlineCreate(value)}
      onCancel={cancelInlineCreate}
      ariaLabel={ariaLabel}
    />
  );
}
