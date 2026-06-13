import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useRef } from "react";

import {
  $restoreInlineCalendarReconciledFromKeys,
  bodyFingerprintFromExtractedManuscript,
  extractManuscriptFromEditor,
  hydrateLexicalManuscript,
} from "@/lib/editor/documentSync";
import { LEXICAL_HYDRATE_TAG } from "@/lib/editor/editorSyncGuard";
import { runEditorHydration } from "@/lib/editor/editorSyncGuard";
import type { ParsedManuscript } from "@/lib/types/manuscript";
import { useEditorStore } from "@/stores/useEditorStore";

interface HydrateDocumentPluginProps {
  manuscript: ParsedManuscript | null;
  syncKey: number;
}

/** Sincroniza Lexical al abrir otro archivo o al recargar desde disco (`syncKey`). */
export function HydrateDocumentPlugin({
  manuscript,
  syncKey,
}: HydrateDocumentPluginProps) {
  const [editor] = useLexicalComposerContext();
  const lastSyncRef = useRef<{ path: string | null; syncKey: number }>({
    path: null,
    syncKey: -1,
  });

  useEffect(() => {
    if (!manuscript) {
      lastSyncRef.current = { path: null, syncKey: -1 };
      return;
    }

    const prev = lastSyncRef.current;
    if (prev.path === manuscript.filePath && prev.syncKey === syncKey) {
      return;
    }

    lastSyncRef.current = { path: manuscript.filePath, syncKey };

    runEditorHydration(() => {
      hydrateLexicalManuscript(editor, manuscript);
      const { reconciledTimeTagKeys } = useEditorStore.getState();
      editor.update(
        () => {
          $restoreInlineCalendarReconciledFromKeys(
            manuscript.filePath,
            reconciledTimeTagKeys,
          );
        },
        { discrete: true, tag: LEXICAL_HYDRATE_TAG },
      );
    });

    queueMicrotask(() => {
      const state = useEditorStore.getState();
      if (state.activeFilePath !== manuscript.filePath) {
        return;
      }
      const tab = state.tabs[manuscript.filePath];
      if (tab?.isDirty || state.isDirty) {
        return;
      }
      editor.getEditorState().read(() => {
        const extracted = extractManuscriptFromEditor(
          manuscript.filePath,
          manuscript.fileHeader.title,
        );
        useEditorStore
          .getState()
          .commitSavedBaseline(
            bodyFingerprintFromExtractedManuscript(
              extracted.fileHeader.body,
              extracted.segments,
            ),
          );
      });
    });
  }, [manuscript, syncKey, editor]);

  return null;
}
