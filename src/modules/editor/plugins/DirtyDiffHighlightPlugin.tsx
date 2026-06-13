import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useRef } from "react";

import { LEXICAL_HYDRATE_TAG } from "@/lib/editor/editorSyncGuard";
import {
  clearDirtyDiffHighlights,
  DIRTY_DIFF_TAG,
  refreshDirtyDiffHighlights,
} from "@/lib/editor/lexicalDirtyDiff";
import { audit } from "@/lib/audit";
import { invokeCommand } from "@/lib/ipc";
import { projectPathsEqual } from "@/lib/pathUtils";
import type { ParsedManuscript } from "@/lib/types/manuscript";
import { useEditorStore } from "@/stores/useEditorStore";

/** Resalta inline en Lexical los caracteres añadidos vs disco (FIX-013). */
export function DirtyDiffHighlightPlugin() {
  const [editor] = useLexicalComposerContext();
  const dirtyDiffVisible = useEditorStore((s) => s.dirtyDiffVisible);
  const dirtyDiffBaselineVersion = useEditorStore((s) => s.dirtyDiffBaselineVersion);
  const dirtyDiffSavedBaseline = useEditorStore((s) => s.dirtyDiffSavedBaseline);
  const activeFilePath = useEditorStore((s) => s.activeFilePath);
  const savedRef = useRef<ParsedManuscript | null>(null);
  const applyTimerRef = useRef<number | null>(null);
  const baselineVersionRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const prevVersion = baselineVersionRef.current;
    baselineVersionRef.current = dirtyDiffBaselineVersion;
    const isBaselineRefresh =
      dirtyDiffVisible && prevVersion !== dirtyDiffBaselineVersion && prevVersion >= 0;

    if (!activeFilePath) {
      savedRef.current = null;
      editor.update(() => clearDirtyDiffHighlights(), { tag: DIRTY_DIFF_TAG });
      return;
    }

    if (!dirtyDiffVisible) {
      savedRef.current = null;
      editor.update(() => clearDirtyDiffHighlights(), { tag: DIRTY_DIFF_TAG });
      return;
    }

    const applyBaseline = (saved: ParsedManuscript) => {
      savedRef.current = saved;
      refreshDirtyDiffHighlights(editor, saved);
      audit.info(
        "editor",
        isBaselineRefresh ? "obs.editor.diff.refresh" : "obs.editor.diff.open",
        {
          path: activeFilePath,
          mode: "inline",
          baselineVersion: dirtyDiffBaselineVersion,
          source: isBaselineRefresh ? "save_snapshot" : "read_manuscript",
        },
      );
    };

    if (
      isBaselineRefresh &&
      dirtyDiffSavedBaseline &&
      projectPathsEqual(dirtyDiffSavedBaseline.filePath, activeFilePath)
    ) {
      applyBaseline(dirtyDiffSavedBaseline);
      return;
    }

    void (async () => {
      try {
        const saved = await invokeCommand<ParsedManuscript>("read_manuscript", {
          filePath: activeFilePath,
        });
        if (cancelled) {
          return;
        }
        applyBaseline(saved);
      } catch {
        if (!cancelled) {
          useEditorStore.getState().clearDirtyDiffHighlight();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    dirtyDiffVisible,
    activeFilePath,
    dirtyDiffBaselineVersion,
    dirtyDiffSavedBaseline,
    editor,
  ]);

  useEffect(() => {
    if (dirtyDiffVisible || dirtyDiffBaselineVersion === 0) {
      return;
    }

    editor.update(() => clearDirtyDiffHighlights(), { tag: DIRTY_DIFF_TAG });
  }, [dirtyDiffBaselineVersion, dirtyDiffVisible, editor]);

  useEffect(() => {
    if (!dirtyDiffVisible) {
      return;
    }

    return editor.registerUpdateListener(({ tags }) => {
      if (
        tags.has(DIRTY_DIFF_TAG) ||
        tags.has(LEXICAL_HYDRATE_TAG) ||
        !savedRef.current
      ) {
        return;
      }

      if (applyTimerRef.current != null) {
        window.clearTimeout(applyTimerRef.current);
      }

      applyTimerRef.current = window.setTimeout(() => {
        applyTimerRef.current = null;
        const saved = savedRef.current;
        if (!saved || !useEditorStore.getState().dirtyDiffVisible) {
          return;
        }
        refreshDirtyDiffHighlights(editor, saved);
      }, 120);
    });
  }, [dirtyDiffVisible, editor]);

  useEffect(
    () => () => {
      if (applyTimerRef.current != null) {
        window.clearTimeout(applyTimerRef.current);
      }
    },
    [],
  );

  return null;
}
