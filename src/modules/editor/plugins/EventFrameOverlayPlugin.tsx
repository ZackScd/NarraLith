import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  measureEventFrames,
  type EventFrameRect,
} from "@/lib/editor/measureEventFrames";
import { EventFrameOverlayLayer } from "@/modules/editor/components/EventFrameOverlayLayer";
import { patchEditorRenderAudit } from "@/lib/render-audit/editorRenderAuditBridge";
import { renderAudit } from "@/lib/render-audit";
import { useEditorStore } from "@/stores/useEditorStore";
import { useEventFramePendingStore } from "@/stores/useEventFramePendingStore";
import { useLayoutStore } from "@/stores/useLayoutStore";

/** Esquinas del marco de evento sobre el editor (fuera del árbol Lexical). */
export function EventFrameOverlayPlugin() {
  const [editor] = useLexicalComposerContext();
  const [frames, setFrames] = useState<EventFrameRect[]>([]);
  const rafRef = useRef<number | null>(null);
  const inlineMetadataVisible = useLayoutStore((s) => s.inlineMetadataVisible);
  const pendingEndDelete = useEventFramePendingStore((s) => s.pendingEndDelete);
  const setPendingEndDelete = useEventFramePendingStore((s) => s.setPendingEndDelete);
  const removeEventEndFromEditor = useEditorStore((s) => s.removeEventEndFromEditor);

  const handleBottomCornerClick = useCallback(
    (segmentId: string) => {
      if (pendingEndDelete === segmentId) {
        removeEventEndFromEditor(segmentId);
        return;
      }
      setPendingEndDelete(segmentId);
    },
    [pendingEndDelete, removeEventEndFromEditor, setPendingEndDelete],
  );

  const scheduleMeasure = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (!editor.getRootElement()) {
          return;
        }
        const nextFrames = measureEventFrames(editor);
        setFrames(nextFrames);
        if (renderAudit.isStandardEnabled() || renderAudit.isVerboseEnabled()) {
          patchEditorRenderAudit({ eventFrames: nextFrames });
        }
      });
    });
  }, [editor]);

  useEffect(() => {
    scheduleMeasure();
  }, [inlineMetadataVisible, scheduleMeasure]);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      scheduleMeasure();
    });
  }, [editor, scheduleMeasure]);

  useEffect(() => {
    return editor.registerRootListener((rootElement) => {
      if (!rootElement) {
        setFrames([]);
        patchEditorRenderAudit({ eventFrames: [] });
        return;
      }

      const scrollPanel = rootElement.closest<HTMLElement>(".scroll-panel");

      const resizeObserver = new ResizeObserver(() => {
        scheduleMeasure();
      });
      resizeObserver.observe(rootElement);

      scrollPanel?.addEventListener("scroll", scheduleMeasure, { passive: true });
      window.addEventListener("resize", scheduleMeasure, { passive: true });
      scheduleMeasure();

      return () => {
        resizeObserver.disconnect();
        scrollPanel?.removeEventListener("scroll", scheduleMeasure);
        window.removeEventListener("resize", scheduleMeasure);
        setFrames([]);
      };
    });
  }, [editor, scheduleMeasure]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <EventFrameOverlayLayer
      frames={frames}
      pendingEndDelete={pendingEndDelete}
      onBottomCornerClick={handleBottomCornerClick}
    />
  );
}
