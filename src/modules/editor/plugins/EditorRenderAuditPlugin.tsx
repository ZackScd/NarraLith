import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  type LexicalEditor,
} from "lexical";
import { useEffect } from "react";

import { patchEditorRenderAudit } from "@/lib/render-audit/editorRenderAuditBridge";
import { renderAudit } from "@/lib/render-audit";

function measureViewport(rootElement: HTMLElement, scrollPanel: HTMLElement | null) {
  const scrollTop = scrollPanel?.scrollTop ?? 0;
  const viewportTop = scrollTop;
  const viewportBottom = scrollTop + (scrollPanel?.clientHeight ?? rootElement.clientHeight);

  const paragraphs = rootElement.querySelectorAll(".narra-editor-input p, .narra-editor-input [data-lexical-text]");
  const host = rootElement.querySelector<HTMLElement>(".narra-editor-input") ?? rootElement;
  const lineNodes = host.querySelectorAll("p");
  let firstVisible: number | null = null;
  let lastVisible: number | null = null;
  const lineHeights: number[] = [];

  lineNodes.forEach((node, index) => {
    const rect = node.getBoundingClientRect();
    const hostRect = (scrollPanel ?? host).getBoundingClientRect();
    const top = rect.top - hostRect.top + scrollTop;
    const bottom = top + rect.height;
    lineHeights.push(Math.round(rect.height));

    if (bottom >= viewportTop && top <= viewportBottom) {
      if (firstVisible === null) {
        firstVisible = index;
      }
      lastVisible = index;
    }
  });

  return {
    scrollTop: Math.round(scrollTop),
    visibleLineRange:
      firstVisible !== null && lastVisible !== null
        ? ([firstVisible, lastVisible] as [number, number])
        : null,
    lineHeights: lineHeights.slice(
      Math.max(0, (firstVisible ?? 0) - 2),
      Math.min(lineHeights.length, (lastVisible ?? 0) + 3),
    ),
    gutterMarkerCount: paragraphs.length > 0 ? lineNodes.length : 0,
  };
}

function readCaretLine(editor: LexicalEditor): number | null {
  let caretLine: number | null = null;
  editor.getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return;
    }
    const top = selection.anchor.getNode().getTopLevelElementOrThrow();
    let line = 0;
    for (const child of $getRoot().getChildren()) {
      if ($isParagraphNode(child)) {
        if (child.getKey() === top.getKey()) {
          caretLine = line;
          break;
        }
        line += 1;
      }
    }
  });
  return caretLine;
}

/** Viewport, focus y gutter para OBS-002 (solo cuando audit UI activo). */
export function EditorRenderAuditPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!renderAudit.isStandardEnabled() && !renderAudit.isVerboseEnabled()) {
      return;
    }

    return editor.registerRootListener((rootElement) => {
      if (!rootElement) {
        patchEditorRenderAudit({
          scrollTop: 0,
          visibleLineRange: null,
          caretLine: null,
          lineHeights: [],
          gutterMarkerCount: 0,
          hasFocus: false,
        });
        return;
      }

      const scrollPanel = rootElement.closest<HTMLElement>(".scroll-panel");
      let scrollTimer: number | null = null;

      const pushViewport = () => {
        const measured = measureViewport(rootElement, scrollPanel);
        patchEditorRenderAudit({
          ...measured,
          caretLine: readCaretLine(editor),
          hasFocus: editor.isEditable() && rootElement.contains(document.activeElement),
        });
      };

      const onScroll = () => {
        if (scrollTimer != null) {
          window.clearTimeout(scrollTimer);
        }
        scrollTimer = window.setTimeout(pushViewport, 120);
      };

      const onFocus = () => {
        patchEditorRenderAudit({ hasFocus: true, caretLine: readCaretLine(editor) });
      };
      const onBlur = () => {
        patchEditorRenderAudit({ hasFocus: false });
      };

      scrollPanel?.addEventListener("scroll", onScroll, { passive: true });
      rootElement.addEventListener("focusin", onFocus);
      rootElement.addEventListener("focusout", onBlur);
      window.addEventListener("resize", onScroll, { passive: true });
      pushViewport();

      return () => {
        if (scrollTimer != null) {
          window.clearTimeout(scrollTimer);
        }
        scrollPanel?.removeEventListener("scroll", onScroll);
        rootElement.removeEventListener("focusin", onFocus);
        rootElement.removeEventListener("focusout", onBlur);
        window.removeEventListener("resize", onScroll);
      };
    });
  }, [editor]);

  useEffect(() => {
    if (!renderAudit.isStandardEnabled() && !renderAudit.isVerboseEnabled()) {
      return;
    }
    return editor.registerUpdateListener(() => {
      const root = editor.getRootElement();
      if (!root) {
        return;
      }
      const scrollPanel = root.closest<HTMLElement>(".scroll-panel");
      patchEditorRenderAudit({
        ...measureViewport(root, scrollPanel),
        caretLine: readCaretLine(editor),
      });
    });
  }, [editor]);

  return null;
}
