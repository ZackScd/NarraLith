import { useEffect, useRef, useState } from "react";

import {
  getEditorRenderAuditSnapshot,
  subscribeEditorRenderAudit,
} from "@/lib/render-audit/editorRenderAuditBridge";
import { renderAudit } from "@/lib/render-audit";
import { UI_EVENTS } from "@/lib/render-audit/events";
import { useEditorStore } from "@/stores/useEditorStore";

function useDebouncedEffect(
  effect: () => void,
  deps: readonly unknown[],
  delayMs: number,
): void {
  const effectRef = useRef(effect);
  effectRef.current = effect;

  useEffect(() => {
    if (!renderAudit.isStandardEnabled() && !renderAudit.isVerboseEnabled()) {
      return;
    }
    const timer = window.setTimeout(() => effectRef.current(), delayMs);
    return () => window.clearTimeout(timer);
  }, deps);
}

export function useEditorRenderAudit(): void {
  const activeFilePath = useEditorStore((s) => s.activeFilePath);
  const activeTabKind = useEditorStore((s) => s.activeTabKind);
  const tabCount = useEditorStore((s) => Object.keys(s.tabs).length);
  const dirtyDiffVisible = useEditorStore((s) => s.dirtyDiffVisible);
  const dirtyDiffBaselineVersion = useEditorStore((s) => s.dirtyDiffBaselineVersion);
  const [, bumpBridge] = useState(0);

  useEffect(() => {
    if (!renderAudit.isStandardEnabled() && !renderAudit.isVerboseEnabled()) {
      return;
    }
    return subscribeEditorRenderAudit(() => {
      bumpBridge((value) => value + 1);
    });
  }, []);

  useEffect(() => {
    if (!renderAudit.isStandardEnabled() || !activeFilePath) {
      return;
    }
    renderAudit.ui(UI_EVENTS.editor.activeDocument, {
      path: activeFilePath,
      kind: activeTabKind,
      tabCount,
    });
  }, [activeFilePath, activeTabKind, tabCount]);

  const bridge = getEditorRenderAuditSnapshot();

  useDebouncedEffect(
    () => {
      if (!activeFilePath) {
        return;
      }
      renderAudit.ui(
        UI_EVENTS.editor.viewport,
        {
          path: activeFilePath,
          scrollTop: bridge.scrollTop,
          visibleLineRange: bridge.visibleLineRange,
        },
        { channel: "standard" },
      );

      if (renderAudit.isVerboseEnabled()) {
        renderAudit.ui(
          UI_EVENTS.editor.viewport,
          {
            path: activeFilePath,
            scrollTop: bridge.scrollTop,
            visibleLineRange: bridge.visibleLineRange,
            caretLine: bridge.caretLine,
            lineHeights: bridge.lineHeights,
          },
          { channel: "verbose", level: "debug" },
        );
      }
    },
    [
      activeFilePath,
      bridge.scrollTop,
      bridge.visibleLineRange,
      bridge.caretLine,
      bridge.lineHeights,
    ],
    150,
  );

  useDebouncedEffect(
    () => {
      if (!activeFilePath || bridge.eventFrames.length === 0) {
        return;
      }
      renderAudit.ui(UI_EVENTS.editor.eventFrames, {
        path: activeFilePath,
        frames: bridge.eventFrames.slice(0, 20).map((frame) => ({
          segmentId: frame.segmentId,
          top: Math.round(frame.top),
          height: Math.round(frame.height),
          closed: frame.closed,
        })),
        total: bridge.eventFrames.length,
      });
    },
    [activeFilePath, bridge.eventFrames],
    150,
  );

  useEffect(() => {
    if (!renderAudit.isStandardEnabled()) {
      return;
    }
    renderAudit.ui(UI_EVENTS.editor.gutter, {
      path: activeFilePath,
      markerCount: bridge.gutterMarkerCount,
    });
  }, [activeFilePath, bridge.gutterMarkerCount]);

  useEffect(() => {
    if (!renderAudit.isStandardEnabled()) {
      return;
    }
    renderAudit.ui(UI_EVENTS.editor.dirtyDiff, {
      path: activeFilePath,
      visible: dirtyDiffVisible,
      regions: dirtyDiffVisible ? bridge.dirtyDiffRegions.slice(0, 30) : [],
      regionCount: bridge.dirtyDiffRegions.length,
      baselineVersion: dirtyDiffBaselineVersion,
    });
  }, [
    activeFilePath,
    dirtyDiffVisible,
    dirtyDiffBaselineVersion,
    bridge.dirtyDiffRegions,
  ]);

  useEffect(() => {
    if (!renderAudit.isStandardEnabled() || !activeFilePath) {
      return;
    }
    renderAudit.ui(UI_EVENTS.editor.focus, {
      path: activeFilePath,
      hasFocus: bridge.hasFocus,
    });
  }, [activeFilePath, bridge.hasFocus]);
}
