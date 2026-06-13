import { useTranslation } from "react-i18next";

import { renameInlineInitialName } from "@/lib/explorer/newFileName";
import { ExplorerInlineNameRow } from "@/modules/explorer/ExplorerInlineNameRow";
import { useFileTreeStore } from "@/stores/useFileTreeStore";

export interface ExplorerInlineRenameRowProps {
  path: string;
  isDir: boolean;
  fileName: string;
  depth: number;
  compact?: boolean;
  embedded?: boolean;
  showChevron?: boolean;
  isExpanded?: boolean;
}

export function ExplorerInlineRenameRow({
  path: _path,
  isDir,
  fileName,
  depth,
  compact = false,
  embedded = false,
  showChevron = false,
  isExpanded = false,
}: ExplorerInlineRenameRowProps) {
  const { t } = useTranslation("explorer");
  const commitInlineRename = useFileTreeStore((s) => s.commitInlineRename);
  const cancelInlineRename = useFileTreeStore((s) => s.cancelInlineRename);

  const kind = isDir ? "folder" : "file";
  const ariaLabel =
    kind === "file" ? t("inlineRename.file") : t("inlineRename.folder");

  return (
    <ExplorerInlineNameRow
      kind={kind}
      depth={depth}
      compact={compact}
      embedded={embedded}
      initialValue={renameInlineInitialName(fileName, isDir)}
      selectAllOnMount
      showChevron={showChevron}
      isExpanded={isExpanded}
      onCommit={(value) => void commitInlineRename(value)}
      onCancel={cancelInlineRename}
      ariaLabel={ariaLabel}
    />
  );
}
