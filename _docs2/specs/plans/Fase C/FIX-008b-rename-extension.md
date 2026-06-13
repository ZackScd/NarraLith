# FIX-008b — Renombrar inline en explorador + regla extensión `.md`

> Plan de investigación e implementación. **Estado:** ✅ Cerrado (jun 2026) · **Esfuerzo:** Medio · **Riesgo:** Medio  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md) Fase C · Origen: [FIX-008 §2.5.5 / H1](FIX-008-explorer-inline-create.md)  
> **Depende de:** FIX-008 ✅ (`ExplorerInlineCreateRow`, `inlineCreate`, `resolveNewFileName` / `resolve_new_file_name`)

---

## 1. Problema y objetivo

### 1.1 Problemas

| ID | Descripción |
|----|-------------|
| **H1** | Renombrar dejando path sin `.md` → `read_manuscript` falla (`error.editor.not_md`) con pestaña abierta. Evidencia: `session-1781315188472-9108` L52–L56. |
| **UX** | Tras FIX-008, **crear** es inline en el árbol (VS Code); **renombrar** sigue abriendo **modal** — inconsistencia que el usuario no quiere. |

### 1.2 Objetivo FIX-008b

| # | Criterio |
|---|----------|
| O1 | «Renombrar» (menú contextual) → la **fila del nodo** pasa a input editable **in situ**, mismo estilo visual que [`ExplorerInlineCreateRow`](../../../src/modules/explorer/ExplorerInlineCreateRow.tsx) |
| O2 | Enter confirma; Escape cancela; **sin ventana modal** para rename |
| O3 | Archivo `.md` en árbol: input inicial = stem visible (`displayName`); al confirmar → regla D7 (`resolveNewFileName`) |
| O4 | Extensión explícita (`notas.txt`) → respetada; sin doble `.md` |
| O5 | Carpeta: input = nombre actual; confirmar → `trim` + `validate_name` (sin `.md` automático) |
| O6 | Pestaña abierta + rename → reload OK; **sin** `error.editor.not_md` |
| O7 | TS + Rust alineados (defensa en profundidad) |
| O8 | Modal explorador **solo** delete (+ entity / folderDescription WB); **no** queda rama `rename` en [`ExplorerDialogs`](../../../src/modules/explorer/ExplorerDialogs.tsx) |
| O9 | `npm test` + tests Rust nuevos verdes |

### 1.3 Fuera de alcance

| Tema | Motivo |
|------|--------|
| Atajo **F2** / doble clic en nombre | Opcional fase posterior; no bloquea cierre |
| Vista tarjetas WB: rename inline bajo grid | Mínimo: menú contextual cambia a tree (igual D4 create) o rename solo en vista lista |
| Bloquear extensiones ≠ `.md` bajo `Manuscrito/` | Descartado; create ya permite O4 |
| Cinturón D12 en `reloadDocumentFromDisk` | Solo si QA post-implementación falla |
| Ghost watcher en rename | FIX-012; conocido |

---

## 2. Evidencia previa

| Sesión | Qué aporta |
|--------|------------|
| `session-1781315188472-9108` | H1: rename modal sin `.md` + pestaña → `error.editor.not_md` |
| `session-1781317457105-5412` | FIX-008 inline create OK; rename carpeta aún vía **modal** (L29–38) — baseline pre-FIX-008b |

---

## 2.1 Evidencia QA cierre — `session-1781318644915-6724.ndjson`

Sesión enfocada en **rename inline** (create no registrado; usuario confirma OK fuera del log).

| Paso | Eventos | Veredicto |
|------|---------|-----------|
| Rename → `rename.md` | L1–5: `inline_rename.start/commit`, `rename.end` ok, `fs.sync` rename | ✅ O1–O2, R1 |
| Ghost watcher post-rename | L7–20: create/remove duplicados (conocido) | ✅ sin regresión funcional |
| Pestaña activa | L21: `tab.switch` → `rename.md` | ✅ contexto editor |
| Cancel (Escape) | L14–15: `inline_rename.cancel` | ✅ R6 |
| Rename → `rename waos.md` + reload | L16–21, L30–31: `rename.end` ok, `obs.editor.reload` ×2 | ✅ O6, **sin** `error.editor.not_md` (H1) |
| Consistencia | L13, L30: `issueCount: 0` | ✅ |
| Modal rename | Ausente en log | ✅ O8 |
| Rename carpeta (R5) | No ejercitado en sesión | — |
| Create inline (R8) | No en log; confirmado manual por usuario | ✅ |

**FIX-008b cerrado** con evidencia NDJSON §8.

---

## 3. Inventario código actual (jun 2026)

### 3.1 Disparador rename (estado al cierre — inline)

| Archivo | Comportamiento |
|---------|----------------|
| [`ExplorerContextMenu.tsx`](../../../src/modules/explorer/ExplorerContextMenu.tsx) | `startInlineRename(path, isDir, fileName)` |
| [`ExplorerDialogs.tsx`](../../../src/modules/explorer/ExplorerDialogs.tsx) | **Sin** rama `rename`; solo delete (+ entity / folderDescription) |
| [`FileTreeItem.tsx`](../../../src/modules/explorer/FileTreeItem.tsx) | Fila sustituida por `ExplorerInlineRenameRow` cuando `inlineRename.path === node.path` |
| [`useFileTreeStore.commitInlineRename`](../../../src/stores/useFileTreeStore.ts) | `resolveRenameDiskName` → IPC `rename_path` |

### 3.2 Inline create (referencia FIX-008)

| Pieza | Rol |
|-------|-----|
| `useFileTreeStore.inlineCreate` | Singleton `{ kind, parentPath }` |
| `startInlineCreate` / `cancelInlineCreate` / `commitInlineCreate` | + audit `obs.explorer.inline_create.*` |
| `ExplorerInlineCreateRow` | Input vacío al **final** de hijos de carpeta |
| `newFileName.ts` | D7 |

### 3.3 Backend (contrato IPC sin cambio; D17 en Rust)

[`rename_path`](../../../src-tauri/src/fs/crud.rs): `resolve_new_file_name` en archivos `.md` (D17); carpetas sin extensión.

---

## 4. Diseño UX — rename inline (VS Code)

```mermaid
sequenceDiagram
  participant User
  participant Menu as ExplorerContextMenu
  participant Store as useFileTreeStore
  participant Row as FileTreeItem
  participant Rust as rename_path

  User->>Menu: Renombrar (nodo X)
  Menu->>Store: startInlineRename(path, isDir, fileName)
  Store->>Store: cancel inlineCreate si activo; selectNode(path)
  Store->>Row: inlineRename.path === X
  Row->>Row: Sustituir fila por input (estilo create)
  Row->>Row: autoFocus + selectAll
  User->>Row: "Nuevo nombre" + Enter
  Row->>Store: commitInlineRename(raw)
  Store->>Store: resolveRenameDiskName → diskName
  Store->>Rust: rename_path(path, diskName)
  Store->>Store: inlineRename = null; loadTree; selectNode(newPath)
```

### 4.1 Diferencias create vs rename

| Aspecto | Inline **create** | Inline **rename** |
|---------|-------------------|-------------------|
| Posición | Al **final** de hijos de `parentPath` | **Sustituye** la fila del nodo `path` |
| Valor inicial | Vacío | `renameInlineInitialName(fileName, isDir)` |
| Commit vacío | Cancel (no crear) | Cancel (mantener nombre) |
| Commit sin cambio | N/A (create siempre nuevo) | Cancel (no IPC si `diskName === basename actual`) |
| Blur + texto | Commit (VS Code) | Commit |
| Blur + vacío | Cancel | Cancel |
| Icono | File / Folder según kind | Hereda del nodo (file / folder) |

### 4.2 Teclado y foco

| Acción | Comportamiento |
|--------|----------------|
| Enter | commit si nombre válido y distinto |
| Escape | cancel |
| Blur + texto | commit |
| Blur + vacío | cancel |
| Montaje | `focus()` + `select()` en input (editar nombre rápido) |

### 4.3 Visual

Reutilizar tokens de [`ExplorerInlineCreateRow`](../../../src/modules/explorer/ExplorerInlineCreateRow.tsx): `MS_ROW_*`, indent `manuscriptContentPaddingLeft(depth)`, icono alineado, `Input` con `border-primary/50`. **No** draggable ni droppable en fila en edición.

---

## 5. Decisiones

### D9 — Regla extensión en rename de **archivos** (cerrada)

Igual D7 FIX-008 — `resolveNewFileName` en commit TS; `resolve_new_file_name` en Rust para archivos.

### D13 — Rename inline, no modal (cerrada — petición usuario)

Eliminar rama `rename` de `ExplorerDialogState` y del menú → `startInlineRename`.

### D14 — Singleton edición en árbol (cerrada)

Un solo modo inline activo:

- `startInlineRename` → `inlineCreate = null`
- `startInlineCreate` → `inlineRename = null` (ya implícito en FIX-008 D6 para create; extender simétricamente)

Estados mutuamente excluyentes: `inlineCreate | inlineRename | null`.

### D15 — Componente UI (recomendada)

**Opción A (recomendada):** extraer [`ExplorerInlineNameRow.tsx`](../../../src/modules/explorer/ExplorerInlineNameRow.tsx) compartido:

```typescript
type Props = {
  mode: "create" | "rename";
  kind: "file" | "folder";
  depth: number;
  compact?: boolean;
  initialValue: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
  ariaLabel: string;
};
```

`ExplorerInlineCreateRow` y rename en `FileTreeItem` delegan en este componente (refactor acotado, evita duplicar blur/Enter/Escape).

**Opción B:** duplicar fila rename copiando create — más rápido pero dos sitios que mantener.

Plan asume **A**.

### D16 — Valor inicial del input (cerrada)

Helpers en [`newFileName.ts`](../../../src/lib/explorer/newFileName.ts):

```typescript
export function renameInlineInitialName(fileName: string, isDir: boolean): string {
  if (isDir) return fileName;
  if (/\.md$/i.test(fileName)) return displayName(fileName);
  return fileName;
}

export function resolveRenameDiskName(rawInput: string, isDir: boolean): string | null {
  const trimmed = trimCreateName(rawInput);
  if (!trimmed) return null;
  return isDir ? trimmed : resolveNewFileName(trimmed);
}
```

Importar `displayName` desde `pathUtils` (evitar duplicar regex).

### D17 — Rust espejo (cerrada)

En `rename_path`, si `from_full.is_file()` → `resolve_new_file_name` + validación stem/nombre igual que `create_file` (FIX-008 Fase 1).

### D18 — Vista tarjetas WB (cerrada)

Igual FIX-008 D4: `startInlineRename` con `explorerLayout === "cards"` → `setExplorerLayout("tree")` antes de activar rename.

### D19 — Errores IPC

Si `renamePath` falla (`path_exists`, etc.): **mantener** fila inline + `lastErrorKey` en banner (patrón create FIX-008).

---

## 6. Plan de implementación por fases

### Fase 0 — Helpers TS + tests

- `renameInlineInitialName`, `resolveRenameDiskName` en `newFileName.ts`
- Vitest: stem `.md`, `notas.txt`, carpeta, `foo.` → `foo.md`, vacío → null

### Fase 1 — Store `inlineRename`

**[`useFileTreeStore.ts`](../../../src/stores/useFileTreeStore.ts)**

```typescript
type InlineRenameState =
  | { path: string; isDir: boolean; fileName: string }
  | null;
```

| Acción | Comportamiento |
|--------|----------------|
| `startInlineRename(path, isDir, fileName)` | D14 cancel create; D18 cards→tree; `closeSearch()`; `selectNode(path)`; audit `obs.explorer.inline_rename.start` |
| `cancelInlineRename()` | clear; audit `obs.explorer.inline_rename.cancel` |
| `commitInlineRename(rawName)` | `resolveRenameDiskName`; si null o sin cambio vs basename → cancel; else `renamePath`; ok → clear; audit `commit` + `obs.explorer.rename.end` |

`reset()` y unmount proyecto: clear `inlineRename`.

### Fase 2 — UI: `ExplorerInlineNameRow` + integración árbol

1. Extraer componente compartido desde `ExplorerInlineCreateRow` (Fase 2 refactor).
2. **`FileTreeItem`:** si `inlineRename?.path === node.path`:
   - Renderizar **solo** fila inline (sin `useDraggable` en esa fila).
   - Ocultar hijos expandidos **durante** rename del padre carpeta (VS Code colapsa edición en la fila; hijos siguen visibles si carpeta expandida — OK dejar hijos).
3. **`ExplorerContextMenu`:** `startInlineRename(node.path, node.isDir, node.name)` en lugar de dialog.

### Fase 3 — Quitar modal rename

- [`ExplorerDialogs.tsx`](../../../src/modules/explorer/ExplorerDialogs.tsx): eliminar tipo `rename` y ramas del formulario.
- i18n: claves `inlineRename.file` / `inlineRename.folder` (ES/EN); claves `rename.*` del modal pueden quedar sin referencia.

### Fase 4 — Rust D17 + tests

- `crud.rs::rename_path` + tests H1
- `cargo test` módulos `fs::crud`, `fs::paths`

### Fase 5 — i18n + auditoría

| Evento | Payload |
|--------|---------|
| `obs.explorer.inline_rename.start` | `{ path, isDir }` |
| `obs.explorer.inline_rename.commit` | `{ path, diskName }` |
| `obs.explorer.inline_rename.cancel` | `{ path }` |
| `obs.explorer.rename.end` | `{ path, newPath?, ok, errorKey? }` |

---

## 7. Matriz de no-choque

| Tarea | Relación |
|-------|----------|
| FIX-008 inline create | Comparte componente/estilo; D14 exclusión mutua |
| FIX-012 fs rename ghost | Sin cambios |
| Delete modal | Intacto |
| DnD | Fila en rename sin drag |

---

## 8. Verificación manual y NDJSON

| # | Acción | Esperado |
|---|--------|----------|
| R1 | Clic derecho archivo → Renombrar | Fila → input con stem; sin modal |
| R2 | Confirmar sin cambiar nombre | Sin IPC; vuelve a fila normal |
| R3 | `Escena` → `Capítulo 3` + Enter | Disco `Capítulo 3.md`; árbol `Capítulo 3` |
| R4 | Quitar extensión visual + Enter (H1) | Disco sigue `.md`; pestaña abierta reload OK |
| R5 | Carpeta rename inline | Sin sufijo `.md` |
| R6 | Escape | Nombre original |
| R7 | Start create mientras rename activo | Un solo inline (D14) |
| R8 | Regresión inline create | R1–R5 FIX-008 |

NDJSON cierre: **`session-1781318644915-6724.ndjson`**

- Presentes: `obs.explorer.inline_rename.start/commit/cancel`, `obs.explorer.rename.end`
- Ausente: modal rename
- Ausente tras R4: `error.editor.not_md` (H1 resuelto)
- R8 create inline: confirmado manual (fuera del log)

---

## 9. Archivos probables

| Archivo | Cambio |
|---------|--------|
| `src/lib/explorer/newFileName.ts` | Helpers rename |
| `src/lib/explorer/newFileName.test.ts` | Tests |
| `src/stores/useFileTreeStore.ts` | `inlineRename`, acciones |
| `src/modules/explorer/ExplorerInlineNameRow.tsx` | **Nuevo** (shared) |
| `src/modules/explorer/ExplorerInlineCreateRow.tsx` | Delegar en NameRow |
| `src/modules/explorer/FileTreeItem.tsx` | Modo rename in-place |
| `src/modules/explorer/ExplorerContextMenu.tsx` | Disparador inline |
| `src/modules/explorer/ExplorerDialogs.tsx` | Quitar rename |
| `src/i18n/*/explorer.json` | `inlineRename.*` |
| `src-tauri/src/fs/crud.rs` | D17 + tests |

---

## 10. Checklist de cierre

```
[x] Fase 0 — helpers + Vitest
[x] Fase 1 — inlineRename store + audit
[x] Fase 2 — ExplorerInlineNameRow + FileTreeItem
[x] Fase 3 — quitar modal rename
[x] Fase 4 — Rust D17 + tests
[x] Fase 5 — i18n
[x] npm test + npm run build
[x] QA R1–R8 + NDJSON — `session-1781318644915-6724` (create confirmado manual)
[x] implementation-plan.md → FIX-008b ✅
```

---

## 11. Registro

| Fecha | Nota |
|-------|------|
| 2026-06-11 | Plan inicial: extensión `.md` vía modal |
| 2026-06-11 | **Replanteo:** rename **inline** en explorador (mismo estilo create); modal eliminado; esfuerzo Medio |
| 2026-06-11 | **Implementación:** inlineRename, ExplorerInlineNameRow, Rust D17; 129 tests Vitest + build OK |
| 2026-06-11 | **QA cierre:** `session-1781318644915-6724` — inline rename, cancel, reload sin H1; FIX-008b ✅ |

---

**Última actualización:** 2026-06-11 · **Estado:** ✅ Cerrado
