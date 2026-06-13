import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNodeByKey } from "lexical";
import { useCallback, useEffect, useState } from "react";

import type { BarTag } from "@/lib/types/manuscript";
import { EventTagBar } from "@/modules/editor/components/EventTagBar";
import { $isEventTagBarNode } from "@/modules/editor/nodes/EventTagBarNode";

interface EventTagBarSnapshot {
  segmentId: string;
  segmentIndex: number;
  eventName: string;
  barTags: BarTag[];
}

/** Sincroniza la barra de evento con mutaciones Lexical (barTags, reconciled). */
export function EventTagBarHost({ nodeKey }: { nodeKey: string }) {
  const [editor] = useLexicalComposerContext();
  const [snapshot, setSnapshot] = useState<EventTagBarSnapshot | null>(null);

  const syncFromEditor = useCallback(() => {
    editor.getEditorState().read(() => {
      const node = $getNodeByKey(nodeKey);
      if (!$isEventTagBarNode(node)) {
        return;
      }
      setSnapshot({
        segmentId: node.getSegmentId(),
        segmentIndex: node.getSegmentIndex(),
        eventName: node.getEventName(),
        barTags: node.getBarTags(),
      });
    });
  }, [editor, nodeKey]);

  useEffect(() => {
    syncFromEditor();
    return editor.registerUpdateListener(() => {
      syncFromEditor();
    });
  }, [editor, syncFromEditor]);

  if (!snapshot) {
    return null;
  }

  return <EventTagBar {...snapshot} />;
}
