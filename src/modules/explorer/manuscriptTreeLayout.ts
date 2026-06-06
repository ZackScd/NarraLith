/** Layout del árbol de manuscrito (alineado con ResizableLeftPanel px-2). */

export const MS_PANEL_INSET_PX = 8;
export const MS_INDENT_PX = 12;
/** Altura de fila: +25 % respecto a h-5 (20px → 25px). */
export const MS_ROW_CLASS = "h-[25px]";
export const MS_ROW_PX = "px-2";
/** Espacio vertical entre pastillas de resaltado en filas adyacentes. */
export const MS_ROW_SLOT_CLASS = "py-0.5";
/** Radio alineado con tokens shadcn (--radius → rounded-md). */
export const MS_ROW_HIGHLIGHT_SHAPE = "rounded-md";
export const MS_ROW_BG_HOVER = "rounded-md bg-[var(--ms-tree-row-hover)]";
export const MS_ROW_BG_ACTIVE = "rounded-md bg-[var(--ms-tree-row-active)]";
export const MS_ROW_BG_DRAG_INTO = "rounded-md bg-[var(--ms-tree-row-hover)]";
export const MS_ROW_HOVER_CLASS = "rounded-md hover:bg-[var(--ms-tree-row-hover)]";

/** Padding izquierdo del contenido (chevron + nombre) por profundidad. */
export function manuscriptContentPaddingLeft(depth: number): number {
  return MS_PANEL_INSET_PX + depth * MS_INDENT_PX;
}

/**
 * Márgenes negativos para que el fondo de fila llegue al borde interno del panel
 * (compensa px-2 del aside), independiente de la profundidad del nodo.
 */
export function manuscriptRowBleedStyle(): {
  marginLeft: number;
  marginRight: number;
  width: string;
} {
  return {
    marginLeft: -MS_PANEL_INSET_PX,
    marginRight: -MS_PANEL_INSET_PX,
    width: `calc(100% + ${MS_PANEL_INSET_PX * 2}px)`,
  };
}
