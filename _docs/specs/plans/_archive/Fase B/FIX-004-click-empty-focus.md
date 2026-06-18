# FIX-004 — Clic en zona vacía inferior enfoca el editor

> Plan de implementación detallado. Spec origen: [`fix-backlog.md` §8.A](../fix-backlog.md).  
> **Estado:** ✅ Implementado (capas A–B) · **Esfuerzo:** Medio · **Riesgo:** Bajo–medio

---

## 1. Problema y objetivo

**Problema:** En el manuscrito, si el contenido no llena el panel de scroll, un clic en el **espacio vacío debajo del último párrafo** no hace nada: el editor no recibe foco y el cursor no se coloca al final para seguir escribiendo.

**Objetivo FIX-004 (solo 8.A):**

1. Clic en zona vacía **debajo del último bloque de prosa** → `editor.focus()` + selección al **final del último párrafo** editable.
2. Si el documento no tiene párrafos → crear un párrafo vacío y enfocarlo.
3. El cursor debe quedar en **prosa** (`ParagraphNode`), nunca «dentro» de decoradores de evento (`EventTagBar`, `EventFrameBottom`).

**Fuera de alcance de FIX-004 (otras tareas):**

| ID | Tema | Por qué no aquí |
|----|------|-----------------|
| **FIX-005** | Guardado sin `trim`, `isDirty` con saltos vacíos | [`fix-backlog.md` §8.B](../fix-backlog.md) — cadena `documentSync` + Rust |
| **FIX-006** | Rediseño marco evento | Solo UI del marco |
| **FIX-007** | Borrador sucio al cerrar app | Persistencia sesión |
| **EntityWorkspace** | Editor de fichas WB | No usa `EditorShell` / Lexical manuscrito |

> **Nota:** El backlog agrupa 8.A y 8.B en «Tarea 8»; `implementation-plan.md` las separa. **Este plan cubre únicamente FIX-004.** No tocar `documentSync.ts`, `useEditorStore.markDirty` ni Rust en este PR.

---

## 2. Auditoría del código (estado actual)

### 2.1 Cadena de layout — causa raíz

```text
EditorCanvas (flex col, overflow hidden)
  └── section.scroll-panel (overflow-y: auto, flex-1)   ← SCROLL AQUÍ
        └── EditorShell / LexicalComposer
              └── div.narra-editor (flex flex-col, flex-1, min-h-0)
                    └── ContentEditable.narra-editor-input (min-h-[280px], flex-1)
```

| Pieza | Archivo | Comportamiento hoy |
|-------|---------|-------------------|
| Contenedor scroll | [`EditorCanvas.tsx`](../../src/modules/editor/EditorCanvas.tsx) L73 | `scroll-panel relative min-h-0 flex-1` |
| Shell editor | [`EditorShell.tsx`](../../src/modules/editor/EditorShell.tsx) L96–112 | `narra-editor` + `ContentEditable` |
| Estilos scroll | [`globals.css`](../../src/styles/globals.css) L152–159 | Solo `overflow-y: auto`; **sin** `display: flex` |

**Hallazgo crítico:** `.scroll-panel` **no es** contenedor flex. El `flex-1` en `.narra-editor` **no expande** la altura al viewport del panel: el árbol del editor crece solo con el contenido (mínimo `280px` en el `contenteditable`). El hueco inferior del viewport es **área del `scroll-panel`**, no del `contenteditable` → Lexical no recibe el clic.

```text
┌─ scroll-panel (altura = viewport) ─────────────┐
│  ┌─ contenteditable (altura = contenido) ─┐  │
│  │  párrafo 1…                             │  │
│  │  párrafo N…                             │  │
│  └─────────────────────────────────────────┘  │
│  ░░░ zona vacía: clic → scroll-panel ░░░░░░░  │  ← bug
└───────────────────────────────────────────────┘
```

### 2.2 Plugins montados en `EditorShell.tsx`

| Plugin | Rol | Interacción con FIX-004 |
|--------|-----|-------------------------|
| `RichTextPlugin` | `ContentEditable` | Objetivo del foco |
| `HistoryPlugin` | Undo/redo | Sin conflicto |
| `HydrateDocumentPlugin` | Carga manuscrito | Sin conflicto |
| `ActiveEventContextPlugin` | Contexto evento bajo cursor | Se actualizará al mover selección al final |
| `DirtyStatePlugin` | `markDirty` en cambio texto | **No** debe dispararse solo por foco (`ignoreSelectionChange` ya activo) |
| `ExtractBlocksPlugin` | Registra extract para guardado | Sin conflicto |
| `ManuscriptEventCommandsPlugin` | Cerrar/expandir evento | Sin conflicto |
| `InsertInlineTagPlugin` | Etiquetas desde panel | Sin conflicto |
| `WikiLinkTypeaheadPlugin` | Menú `[[` | Sin conflicto |
| `WikiLinkNormalizeTailPlugin` | Normaliza cola wikilink | Sin conflicto |
| `WikiLinkClickPlugin` | Clic en `[[enlace]]` | Usa `registerRootListener` + `click` — **mismo patrón**, no intercepta clics fuera de enlaces |

**No existe** hoy ningún plugin de «clic en vacío» ni listener en `.scroll-panel`.

### 2.3 Tipos de nodo en la raíz Lexical

Registrados en [`EditorShell.tsx`](../../src/modules/editor/EditorShell.tsx) L58–78:

| Tipo | Clase | Editable | En extract |
|------|-------|----------|------------|
| `ParagraphNode` | Lexical | ✅ Sí | ✅ `serializeParagraphContent` |
| `EventTagBarNode` | `DecoratorNode` | ❌ No | Metadatos evento |
| `EventFrameBottomNode` | `DecoratorNode` | ❌ No | Cierra evento |
| `InlineTimeTagNode` | Decorator inline | Dentro de párrafo | Inline |
| `WikiLinkNode` | TextNode especial | Dentro de párrafo | Inline |
| `BlockSeparatorNode` | `ElementNode` | — | **No usado** en hidratar manuscrito v2 |
| `BlockMetadataNode` | — | — | **No registrado** en `EditorShell` |

Orden típico en disco → árbol ( [`hydrateLexicalManuscript`](../../src/lib/editor/documentSync.ts) L66–107 ):

```text
[ párrafos cabecera ]
[ EventTagBar → párrafos cuerpo → EventFrameBottom? ]
[ párrafos libres ]
```

Documento vacío: un `ParagraphNode` vacío (L99–104).

### 2.4 Lógica «último párrafo» — regla de negocio

Al enfocar al final, recorrer `root.getChildren()` y tomar el **último** hijo que sea `$isParagraphNode`:

- Ignorar `EventTagBarNode` y `EventFrameBottomNode` (decoradores).
- **No** saltar al párrafo del evento si hay prosa libre después del cierre `└ ┘`.
- Si no hay párrafos: `$createParagraphNode()` + `root.append` + `select()`.

**No** usar `$getRoot().selectEnd()` a ciegas: podría colocar la selección en un nodo no deseado.

Función propuesta (exportable para tests futuros):

```typescript
// src/lib/editor/focusEditorAtEnd.ts
export function $focusAtLastParagraph(): void
```

### 2.5 `WikiLinkClickPlugin` — patrón a reutilizar

Archivo: [`WikiLinkClickPlugin.tsx`](../../src/modules/editor/plugins/WikiLinkClickPlugin.tsx)

```typescript
editor.registerRootListener((rootElement) => {
  rootElement.addEventListener("click", onClick);
  return () => rootElement.removeEventListener("click", onClick);
});
```

FIX-004 usará el mismo hook **más** un listener en el ancestro `.scroll-panel` (vía `rootElement.closest(".scroll-panel")`).

### 2.6 Clics que NO deben mover el cursor al final

| Origen | Motivo |
|--------|--------|
| Clic en texto / párrafo / chip inline | Comportamiento Lexical normal — **no interceptar** |
| Clic en `[[wikilink]]` | `WikiLinkClickPlugin` — navegación |
| Botones en `EventTagBar` (`🏷️+`) | `stopPropagation` en [`EventTagBar.tsx`](../../src/modules/editor/components/EventTagBar.tsx) L55 |
| Panel lateral / explorador / pestañas | Fuera del editor |
| `TimeTagDialog` (portal `body`) | Fuera del árbol |

**Condición segura para activar focus-at-end:**

```typescript
// Clic en padding del contenteditable
target === rootElement

// Clic en scroll-panel pero fuera del contenteditable
scrollPanel.contains(target) && !rootElement.contains(target)
```

Usar `mousedown` vs `click`: preferir **`pointerdown`** o **`click`** en fase burbuja; si el foco falla en WebView2, probar `mousedown` + `preventDefault` solo en vacío (documentar en QA).

### 2.7 Advertencia Lexical existente (consola)

En desarrollo puede aparecer:

> *When using "display: flex" on an element containing content editable, Chrome may have unwanted focusing behavior…*

**Origen:** `.narra-editor` ya tiene `display: flex` envolviendo el `contenteditable` ([`EditorShell.tsx`](../../src/modules/editor/EditorShell.tsx) L98). **Preexistente** a FIX-004.

**Mitigación en plan:** priorizar listener en `.scroll-panel` (no depende de estirar el `contenteditable`). La capa CSS `min-h-full` es **opcional** y se prueba en QA; si empeora el foco, dejarla fuera.

### 2.8 Archivos relacionados pero **sin cambio** en FIX-004

| Archivo | Relación |
|---------|----------|
| [`documentSync.ts`](../../src/lib/editor/documentSync.ts) | Extract/hidratar — FIX-005 |
| [`useEditorStore.ts`](../../src/stores/useEditorStore.ts) `markDirty` | FIX-005 |
| [`DirtyStatePlugin.tsx`](../../src/modules/editor/plugins/DirtyStatePlugin.tsx) | Ya ignora cambios de selección |
| [`EditorSidePanel.tsx`](../../src/modules/editor/EditorSidePanel.tsx) | Panel evento/tiempo |
| `src-tauri/**` | Sin IPC nuevo |
| [`EntityWorkspace.tsx`](../../src/modules/worldbuilding/EntityWorkspace.tsx) | Otro editor |

### 2.9 Tests automatizados hoy

| Ámbito | Estado |
|--------|--------|
| Vitest `documentSync` | **No existe** archivo `documentSync.test.ts` |
| `@lexical/headless` | **No** en dependencias |
| E2E editor | **No** |

**FIX-004:** QA manual obligatoria; test unitario de `$focusAtLastParagraph` solo si se añade `@lexical/headless` o helper puro — **opcional**, no bloquea el PR.

---

## 3. Estrategia (tres capas)

| Capa | Qué | Prioridad |
|------|-----|-----------|
| **A** | Plugin `ClickToFocusPlugin` — listener en `.scroll-panel` (clics fuera del `contenteditable`) | **Obligatoria** — corrige el bug real |
| **B** | Mismo plugin — `target === rootElement` (padding interno del `contenteditable`) | **Obligatoria** |
| **C** | CSS: `.scroll-panel` → `flex flex-col`; cadena `min-h-full` en editor | **Opcional** — solo si A+B no bastan en QA |

**Orden:** implementar A+B → QA → C solo si hace falta.

---

## 4. Cambios por archivo

### 4.1 Nuevo — `src/lib/editor/focusEditorAtEnd.ts`

```typescript
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
```

Sin efectos secundarios fuera de `editor.update`.

### 4.2 Nuevo — `src/modules/editor/plugins/ClickToFocusPlugin.tsx`

```typescript
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";

import { $focusAtLastParagraph } from "@/lib/editor/focusEditorAtEnd";

function focusEditorAtEnd(editor: LexicalEditor) {
  editor.focus();
  editor.update(() => {
    $focusAtLastParagraph();
  });
}

export function ClickToFocusPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerRootListener((rootElement) => {
      const scrollPanel = rootElement.closest<HTMLElement>(".scroll-panel");

      const onPointerDown = (event: PointerEvent) => {
        const target = event.target;
        if (!(target instanceof Node)) return;

        const onRootPadding = target === rootElement;
        const onScrollGutter =
          scrollPanel?.contains(target) && !rootElement.contains(target);

        if (!onRootPadding && !onScrollGutter) return;

        event.preventDefault();
        focusEditorAtEnd(editor);
      };

      scrollPanel?.addEventListener("pointerdown", onPointerDown);
      rootElement.addEventListener("pointerdown", onPointerDown);

      return () => {
        scrollPanel?.removeEventListener("pointerdown", onPointerDown);
        rootElement.removeEventListener("pointerdown", onPointerDown);
      };
    });
  }, [editor]);

  return null;
}
```

**Ajustes posibles tras QA:**

- Si `preventDefault` en vacío impide scroll del panel → usar solo `click` en gutter y no en root.
- Si doble listener dispara dos veces → unificar con un solo listener en `scrollPanel` que cubra ambos casos.

**Orden de registro en `EditorShell`:** después de `WikiLinkClickPlugin` (los enlaces se resuelven en hijos antes de burbujear al vacío).

### 4.3 Editar — `EditorShell.tsx`

Añadir:

```tsx
import { ClickToFocusPlugin } from "@/modules/editor/plugins/ClickToFocusPlugin";

// … dentro del composer, tras WikiLinkClickPlugin:
<ClickToFocusPlugin />
```

**Sin cambiar** clases CSS en el primer PR salvo capa C.

### 4.4 Capa C opcional — CSS / layout

Solo si QA falla con A+B:

| Archivo | Cambio |
|---------|--------|
| [`EditorCanvas.tsx`](../../src/modules/editor/EditorCanvas.tsx) L73 | `scroll-panel` + `flex flex-col` |
| [`EditorShell.tsx`](../../src/modules/editor/EditorShell.tsx) L98 | `narra-editor` + `min-h-full` |
| [`EditorShell.tsx`](../../src/modules/editor/EditorShell.tsx) L106 | `narra-editor-input` + `min-h-full` (mantener `min-h-[280px]` como piso si hace falta) |

Verificar que documentos **muy largos** no duplican altura (solo `min-height`, no `height` fija).

---

## 5. Qué NO hacer (evitar regresiones)

| Acción prohibida | Por qué |
|------------------|---------|
| Tocar `flushFree` / `.trim()` en extract | Es FIX-005 |
| Modificar `markDirty` / fingerprint | Es FIX-005 |
| Cambiar Rust parser/guardado | Es FIX-005 |
| Interceptar **todos** los clics del root | Rompe selección con ratón en mitad del texto |
| `stopPropagation` global en scroll-panel | Puede bloquear scroll o DnD futuro |
| Enfocar dentro de `EventTagBarNode` | No es prosa editable |
| Aplicar el plugin en `EntityWorkspace` | Fuera de alcance |
| Añadir `display:flex` al `contenteditable` | Empeora advertencia Lexical |

---

## 6. Pasos de implementación (checklist)

```
[x] 1. Crear focusEditorAtEnd.ts
[x] 2. Crear ClickToFocusPlugin.tsx
[x] 3. Registrar plugin en EditorShell.tsx
[x] 4. npm run build
[ ] 5. QA manual §7 (escenarios 1–12) — pendiente usuario
[ ] 6. Si falla → capa C CSS; reprobar
[x] 7. Marcar FIX-004 ✅ en implementation-plan.md + fix-backlog §8.A
```

---

## 7. Verificación manual (obligatoria)

En **`npm run tauri dev`**, manuscrito con panel de scroll más alto que el contenido.

| # | Escenario | Acción | Esperado |
|---|-----------|--------|----------|
| 1 | Prosa corta | Clic en vacío **debajo** del último párrafo (zona gris del scroll) | Foco en editor; cursor al **final** del último párrafo; se puede escribir |
| 2 | Mismo | Escribir sin clic adicional | Caracteres aparecen al final |
| 3 | Documento vacío (un párrafo vacío) | Clic en vacío inferior | Foco en el párrafo vacío |
| 4 | Varios párrafos en cabecera | Clic en vacío | Cursor al final del **último** párrafo de cabecera |
| 5 | Evento cerrado + prosa libre debajo | Clic en vacío | Cursor en último párrafo **libre** (no dentro del evento) |
| 6 | Evento **abierto** (sin `└ ┘`) | Clic en vacío | Cursor al final del párrafo **dentro** del evento |
| 7 | Clic en mitad de un párrafo | Clic normal en texto | Cursor donde se clicó — **sin** saltar al final |
| 8 | `[[wikilink]]` resuelto | Clic en enlace | Navega a entidad — sin regresión |
| 9 | Botón `🏷️+` en barra evento | Clic | Abre flujo etiqueta — cursor no salta al final del doc |
| 10 | Panel lateral evento/tiempo | Clic en inputs | No afecta foco del editor |
| 11 | Tras foco por vacío | `ActiveEventContextPlugin` | Panel lateral refleja contexto del **final** del doc (evento libre o cabecera) |
| 12 | Documento largo (scroll) | Scroll + clic en vacío visible | Mismo comportamiento que #1 |

**Regresión:** `DirtyStatePlugin` — clic en vacío **no** debe marcar `isDirty` ni habilitar «Guardar todo» sin cambio de texto.

---

## 8. Criterio de salida

- Escenarios §7.1–7.6 y 7.12 pasan en Tauri.
- Sin regresiones en §7.7–7.11.
- Build verde.
- FIX-004 marcado ✅ en [`implementation-plan.md`](../implementation-plan.md).
- **FIX-005** sigue pendiente (trim / guardado).

---

## 9. Riesgos y mitigación

| Riesgo | Mitigación |
|--------|------------|
| `preventDefault` en pointerdown bloquea scroll | Probar sin preventDefault en gutter; o solo `click` |
| Doble disparo root + scrollPanel | Un listener en scrollPanel únicamente |
| Lexical flex warning | No empeorar; capa C opcional |
| WebView2 vs Chrome distinto | QA en Tauri obligatorio |
| Confusión con FIX-005 | Plan y PR acotados a focus; no mezclar trim |

---

## 10. Diff estimado

| Tipo | Cantidad |
|------|----------|
| Archivos nuevos | 2 (`focusEditorAtEnd.ts`, `ClickToFocusPlugin.tsx`) |
| Archivos editados | 1–3 (`EditorShell`; opcional `EditorCanvas` + CSS) |
| Rust | 0 |
| Líneas netas | ~80–120 |

---

## 11. Relación con FIX-005

Tras FIX-004, el usuario podrá hacer clic abajo y pulsar Enter varias veces; **guardado** de esas líneas vacías sigue roto hasta FIX-005. Documentar en PR: *«focus arreglado; persistencia de trailing newlines en FIX-005»*.

---

**Última actualización:** 2026-06-06
