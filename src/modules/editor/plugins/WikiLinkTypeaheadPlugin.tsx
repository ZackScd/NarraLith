import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
} from "lexical";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { isEditorHydrating, LEXICAL_HYDRATE_TAG } from "@/lib/editor/editorSyncGuard";
import {
  $getWikiTriggerMatch,
  insertWikiLinkFromHit,
  type WikiTriggerMatch,
} from "@/lib/editor/wikiLinkTrigger";
import type { EntitySearchHit } from "@/lib/types/entitySearch";
import { useEntitySearch } from "@/hooks/useEntitySearch";
import { WikiLinkMenu } from "@/modules/editor/WikiLinkMenu";

const MENU_LIMIT = 8;

function getCaretRect(): DOMRect | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    return null;
  }
  return sel.getRangeAt(0).getBoundingClientRect();
}

export function WikiLinkTypeaheadPlugin() {
  const [editor] = useLexicalComposerContext();
  const { isReady, searchDebounced } = useEntitySearch();
  const [match, setMatch] = useState<WikiTriggerMatch | null>(null);
  const [hits, setHits] = useState<EntitySearchHit[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const closeMenu = useCallback(() => {
    setMatch(null);
    setHits([]);
    setSelectedIndex(0);
    setAnchorRect(null);
  }, []);

  const confirmHit = useCallback(
    (hit: EntitySearchHit) => {
      if (!match) {
        return;
      }
      const replaceableLength = match.replaceableLength;
      closeMenu();
      insertWikiLinkFromHit(editor, hit, replaceableLength);
    },
    [closeMenu, editor, match],
  );

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState, tags }) => {
      if (tags.has(LEXICAL_HYDRATE_TAG) || isEditorHydrating()) {
        closeMenu();
        return;
      }

      editorState.read(() => {
        const next = $getWikiTriggerMatch();
        setMatch(next);
        if (next) {
          setSelectedIndex(0);
          setAnchorRect(getCaretRect());
          if (isReady) {
            searchDebounced(next.query, MENU_LIMIT, setHits);
          }
        } else {
          closeMenu();
        }
      });
    });
  }, [closeMenu, editor, isReady, searchDebounced]);

  useEffect(() => {
    if (!match) {
      return;
    }

    return mergeRegister(
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        (event) => {
          if (hits.length === 0) {
            return false;
          }
          event?.preventDefault();
          setSelectedIndex((i) => (i + 1) % hits.length);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        (event) => {
          if (hits.length === 0) {
            return false;
          }
          event?.preventDefault();
          setSelectedIndex((i) => (i - 1 + hits.length) % hits.length);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          if (!match || hits.length === 0) {
            return false;
          }
          event?.preventDefault();
          const hit = hits[selectedIndex];
          if (hit) {
            confirmHit(hit);
          }
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        KEY_TAB_COMMAND,
        (event) => {
          if (!match || hits.length === 0) {
            return false;
          }
          event?.preventDefault();
          const hit = hits[selectedIndex];
          if (hit) {
            confirmHit(hit);
          }
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          if (!match) {
            return false;
          }
          closeMenu();
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [closeMenu, confirmHit, editor, hits, match, selectedIndex]);

  if (!match) {
    return null;
  }

  return createPortal(
    <WikiLinkMenu
      hits={hits}
      selectedIndex={selectedIndex}
      query={match.query}
      isReady={isReady}
      anchorRect={anchorRect}
      onSelect={confirmHit}
      onHoverIndex={setSelectedIndex}
    />,
    document.body,
  );
}
