import { LexicalComposer } from "@lexical/react/LexicalComposer";

import { ContentEditable } from "@lexical/react/LexicalContentEditable";

import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";

import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";

import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";

import { HeadingNode, QuoteNode } from "@lexical/rich-text";

import { ParagraphNode, TextNode } from "lexical";

import { cn } from "@/lib/utils";

import { editorTheme } from "@/modules/editor/editorTheme";

import { BlockMetadataNode } from "@/modules/editor/nodes/BlockMetadataNode";

import { BlockSeparatorNode } from "@/modules/editor/nodes/BlockSeparatorNode";

import { EventFrameBottomNode } from "@/modules/editor/nodes/EventFrameBottomNode";

import { EventTagBarNode } from "@/modules/editor/nodes/EventTagBarNode";

import { InlineTimeTagNode } from "@/modules/editor/nodes/InlineTimeTagNode";

import { WikiLinkNode } from "@/modules/editor/nodes/WikiLinkNode";

import { ActiveEventContextPlugin } from "@/modules/editor/plugins/ActiveEventContextPlugin";
import { ClickToFocusPlugin } from "@/modules/editor/plugins/ClickToFocusPlugin";

import { DirtyDiffHighlightPlugin } from "@/modules/editor/plugins/DirtyDiffHighlightPlugin";
import { EditorRenderAuditPlugin } from "@/modules/editor/plugins/EditorRenderAuditPlugin";
import { DirtyStatePlugin } from "@/modules/editor/plugins/DirtyStatePlugin";

import { ExtractBlocksPlugin } from "@/modules/editor/plugins/ExtractBlocksPlugin";

import { HydrateDocumentPlugin } from "@/modules/editor/plugins/HydrateDocumentPlugin";

import { InsertInlineTagPlugin } from "@/modules/editor/plugins/InsertInlineTagPlugin";

import { EventFrameDeletePlugin, EventFramePendingClearPlugin } from "@/modules/editor/plugins/EventFrameDeletePlugin";

import { EventFrameOverlayPlugin } from "@/modules/editor/plugins/EventFrameOverlayPlugin";

import { ManuscriptEventCommandsPlugin } from "@/modules/editor/plugins/ManuscriptEventCommandsPlugin";

import { WikiLinkClickPlugin } from "@/modules/editor/plugins/WikiLinkClickPlugin";

import { WikiLinkNormalizeTailPlugin } from "@/modules/editor/plugins/WikiLinkNormalizeTailPlugin";

import { WikiLinkTypeaheadPlugin } from "@/modules/editor/plugins/WikiLinkTypeaheadPlugin";

import type { ParsedManuscript } from "@/lib/types/manuscript";

import { useLayoutStore } from "@/stores/useLayoutStore";

const editorConfig = {
  namespace: "NarraLithEditor",

  theme: editorTheme,

  nodes: [
    ParagraphNode,

    TextNode,

    HeadingNode,

    QuoteNode,

    BlockSeparatorNode,

    BlockMetadataNode,

    EventTagBarNode,

    EventFrameBottomNode,

    InlineTimeTagNode,

    WikiLinkNode,
  ],

  onError(error: Error) {
    console.error("[Lexical]", error);
  },
};

interface EditorShellProps {
  manuscript: ParsedManuscript;

  syncKey: number;
}

export function EditorShell({ manuscript, syncKey }: EditorShellProps) {
  const tagsVisible = useLayoutStore((s) => s.inlineMetadataVisible);

  return (
    <LexicalComposer initialConfig={editorConfig}>
      <div
        className={cn(
          "narra-editor relative flex min-h-full min-h-0 flex-1 flex-col",

          !tagsVisible && "narra-tags-off",
        )}
      >
        <div className="narra-editor-surface relative min-h-full flex-1">
          <div className="narra-editor-input-host relative">
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className="narra-editor-input min-h-[max(17.5rem,100%)] resize-none px-1 py-2 text-base outline-none"
                  aria-label="Editor"
                />
              }
              placeholder={null}
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>

          <EventFrameOverlayPlugin />
        </div>

        <HistoryPlugin />

        <HydrateDocumentPlugin manuscript={manuscript} syncKey={syncKey} />

        <ActiveEventContextPlugin />

        <DirtyStatePlugin />

        <DirtyDiffHighlightPlugin />

        <EditorRenderAuditPlugin />

        <ExtractBlocksPlugin />

        <ManuscriptEventCommandsPlugin />

        <EventFrameDeletePlugin />

        <EventFramePendingClearPlugin />

        <InsertInlineTagPlugin />

        <WikiLinkTypeaheadPlugin />

        <WikiLinkNormalizeTailPlugin />

        <WikiLinkClickPlugin />

        <ClickToFocusPlugin />
      </div>
    </LexicalComposer>
  );
}
