import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";

import {
  $removeEventAtSegment,
  $removeEventEndAtSegment,
} from "@/lib/editor/documentSync";
import { useEditorStore } from "@/stores/useEditorStore";
import { useEventFramePendingStore } from "@/stores/useEventFramePendingStore";

/** Borrado two-step de evento (chip) y cierre (esquinas overlay). */
export function EventFrameDeletePlugin() {
  const [editor] = useLexicalComposerContext();
  const setRemoveEventFn = useEditorStore((s) => s.setRemoveEventFn);
  const setRemoveEventEndFn = useEditorStore((s) => s.setRemoveEventEndFn);
  const clearPending = useEventFramePendingStore((s) => s.clearPending);

  useEffect(() => {
    setRemoveEventFn((segmentId) => {
      let ok = false;
      editor.update(
        () => {
          ok = $removeEventAtSegment(segmentId);
        },
        { discrete: true },
      );
      if (ok) {
        useEditorStore.getState().markDirty();
        useEditorStore.getState().reconcileManuscriptFromEditor();
      }
      return ok;
    });

    setRemoveEventEndFn((segmentId) => {
      let ok = false;
      editor.update(
        () => {
          ok = $removeEventEndAtSegment(segmentId);
        },
        { discrete: true },
      );
      if (ok) {
        useEditorStore.getState().markDirty();
        useEditorStore.getState().reconcileManuscriptFromEditor();
        clearPending();
      }
      return ok;
    });

    return () => {
      setRemoveEventFn(null);
      setRemoveEventEndFn(null);
    };
  }, [editor, setRemoveEventFn, setRemoveEventEndFn, clearPending]);

  return null;
}

/** Limpia estado pending al pulsar fuera de chip/esquinas. */
export function EventFramePendingClearPlugin() {
  const clearPending = useEventFramePendingStore((s) => s.clearPending);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      if (target.closest("[data-event-pending-target]")) {
        return;
      }
      clearPending();
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [clearPending]);

  return null;
}
