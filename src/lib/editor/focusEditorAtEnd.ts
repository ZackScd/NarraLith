import { $createParagraphNode, $getRoot, $isParagraphNode } from "lexical";

/** Coloca la selección al final del último párrafo de prosa, o crea uno vacío. */
export function $focusAtLastParagraph(): void {
  const root = $getRoot();
  let last: ReturnType<typeof $createParagraphNode> | null = null;

  for (const child of root.getChildren()) {
    if ($isParagraphNode(child)) {
      last = child;
    }
  }

  if (last) {
    last.selectEnd();
    return;
  }

  const paragraph = $createParagraphNode();
  root.append(paragraph);
  paragraph.select();
}
