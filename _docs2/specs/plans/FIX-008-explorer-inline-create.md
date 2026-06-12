# FIX-008 — Crear archivo/carpeta inline en explorador + fix `create_file` Rust

> Plan de investigación e implementación. **Estado:** 📋 Planificado (jun 2026) · **Esfuerzo:** Medio · **Riesgo:** Medio  
> **Lista maestra:** [`implementation-plan.md`](../implementation-plan.md) Fase C · Spec origen: [`fix-backlog.md` §2](../fix-backlog.md)  
> **Convención:** este documento refleja el **código real** al planificar; actualizar §2–§4 si el árbol cambia antes de implementar.

---

## 1. Problema y objetivo

### 1.1 Problema

Crear archivo o carpeta desde el explorador abre hoy un **diálogo modal** (`ExplorerDialogs` → `Dialog` con Cancelar/Crear). El usuario quiere el patrón **VS Code / Cursor**: una **fila editable inline** en el árbol, indentada bajo la carpeta destino, input vacío con foco, **Enter** confirma y **Escape** cancela — sin ventana emergente.

Además, la lógica Rust de `create_file` tiene un **bug de extensión**: solo comprueba sufijo `.md` (case-insensitive), no «tiene extensión explícita». Ejemplo: `notas.txt` → `notas.txt.md` en disco.

### 1.2 Objetivo FIX-008

| # | Criterio |
|---|----------|
| O1 | «Nuevo archivo» / «Nueva carpeta» (menú contextual + toolbar) → fila inline en el árbol, carpeta destino expandida, foco en input vacío |
| O2 | Enter confirma; Escape cancela; nombre vacío o solo espacios → cancelar sin IPC |
| O3 | Archivo sin extensión explícita → `nombre.md` en disco; en árbol se muestra `nombre` (`displayName`) |
| O4 | Extensión explícita del usuario (`notas.txt`, `Escena.md`) → respetada; **no** doble `.md` |
| O5 | Misma regla de extensión en **TS** (commit) y **Rust** (`create_file`) |
| O6 | No queda modal para create file/folder (rename/delete/entity siguen en modal) |
| O7 | `cargo test` + `npm test` verdes; QA manual documentado en §9 |

### 1.3 Fuera de alcance

| Tema | Motivo |
|------|--------|
| `createEntity` (`CreateEntityDialog`) | Backlog §2 explícito |
| Renombrar inline | Tarea futura; rename sigue en modal |
| Eliminar / mover / DnD | Sin cambios salvo no interferir con fila inline |
| FIX-012 save batch / `fs-changed` remove | Perímetro distinto; solo coordinar doble `create` (§4.3) |
| Auto-abrir pestaña al crear archivo | Comportamiento **actual** es solo `selectNode` (§4.4); no es regresión FIX-008 |

---

## 2. Evidencia QA — NDJSON `session-1781307012322-6388.ndjson`

Sesión capturada con audit ON (`tauri dev`), repro del flujo **modal actual** (pre-FIX-008).

### 2.1 Contexto previo (L1–L10)

- Bootstrap audit OK.
- Restauración de sesión: 6 pestañas bajo `Manuscrito/Volumen 1/Capitulo 1/` (`shushah`, `sas`, `meow`, `eventoTest`, `skanlnsklnals`, `escena`).
- `obs.consistency.updated` → `issueCount: 0`.

### 2.2 Crear archivo «archivo pe.md» (L11–L21)

| t (ms) | Evento | Hallazgo |
|--------|--------|----------|
| +20455 | `reconcile.emit` **`kind=create`** | `Manuscrito/Volumen 1/Capitulo 1/archivo pe.md` |
| +20457 | `obs.editor.fs.sync` + `obs.fs.changed` | Frontend recibe create (1ª vez) |
| +20668 | `watcher.raw` **`modify`** | Mismo path (write post-create) |
| +20702 | `reconcile.emit` **`kind=create`** | **Duplicado** — misma ruta |
| +20704–07 | `fs.sync` + `fs.changed` | 2ª ronda → **`notifyFsChange` ×2** → `loadTree` ×2 |
| +22958 | `obs.editor.tab.open` | Usuario **abrió manualmente** el archivo (~2,3 s después) |

**Conclusiones:**

1. Creación funcional; nombre con **espacio** válido.
2. **`create_file` emite `fs-changed` desde IPC** y el **watcher vuelve a emitir create** → doble refresh del árbo (§4.3). No bloquea FIX-008 pero conviene anotar en implementación.
3. **`createFile` no abre pestaña** — solo selecciona nodo; coherente con código actual (`useFileTreeStore.createFile`).

### 2.3 Crear carpeta + archivo en subcarpeta (L22–L32)

| t (ms) | Evento | Hallazgo |
|--------|--------|----------|
| +29238–55 | `watcher.raw` **`modify`** | `Manuscrito/carpeta`, `Manuscrito` (mkdir vía OS/watcher) |
| +38381 | `reconcile.emit` **`kind=create`** | `Manuscrito/carpeta/meh.md` |
| +38627–668 | Duplicado create | Igual patrón que §2.2 |
| +41358 | `consistency.updated` | `issueCount: 0` |

**Conclusiones:**

1. `create_folder` **no** emite IPC `fs-changed` (solo watcher `modify` en padres) — árbol se refresca vía `loadTree()` post-IPC en store.
2. Flujo carpeta nueva → archivo dentro funciona con modal actual.

### 2.4 Eventos audit **ausentes** hoy (oportunidad FIX-008)

No hay `obs.explorer.inline_create.*` ni `obs.explorer.create.*`. Añadir en implementación (§7.6) para QA post-inline.

---

## 3. Inventario del código actual (jun 2026)

### 3.1 Frontend — disparadores (modal)

| Archivo | Rol actual |
|---------|------------|
| [`ExplorerContextMenu.tsx`](../../../src/modules/explorer/ExplorerContextMenu.tsx) L63–84 | `onOpenDialog({ type: "createFile" \| "createFolder", parentPath })` |
| [`WorkspaceTopBar.tsx`](../../../src/modules/layout/WorkspaceTopBar.tsx) L358–387 | Toolbar `FilePlus` / `FolderPlus` → mismo diálogo con `createParentPath` de [`resolveLastOpenedParentPath`](../../../src/lib/explorer/explorerParentPath.ts) |
| [`ExplorerDialogs.tsx`](../../../src/modules/explorer/ExplorerDialogs.tsx) | Modal único para create/rename/delete; L121–125 llama `createFile` / `createFolder` |
| [`FileExplorer.tsx`](../../../src/modules/explorer/FileExplorer.tsx) L571–578 | Monta `ExplorerContextMenu` + `ExplorerDialogs` |

**Resolución de `parentPath`:**

- Contexto: [`resolveContextMenuParentPath`](../../../src/lib/explorer/explorerParentPath.ts) — nodo carpeta, padre de archivo, `cardPath` en tarjetas WB, o `listParentForView`.
- Toolbar: [`resolveLastOpenedParentPath`](../../../src/lib/explorer/explorerParentPath.ts) — `selectedPath` (carpeta o padre), else carpeta del tab activo manuscrito, else raíz de vista (`Manuscrito` / `Worldbuilding`).

### 3.2 Frontend — store

[`useFileTreeStore.ts`](../../../src/stores/useFileTreeStore.ts):

```typescript
// createFile (L370–395) — flujo post-creación
invokeCommand("create_file", { parentPath, name })
→ appendToParentOrderInMap + persistExplorerOrder
→ expandPath(parentPath)
→ loadTree()
→ selectNode(newPath)   // NO requestOpenDocument
```

```typescript
// createFolder (L339–368) — extra: expandPath del padre del newPath si aplica
```

Estado relevante: `expandedPaths`, `explorerDialog`, `lastErrorKey`, `selectedPath`. **No existe** `inlineCreate`.

### 3.3 Frontend — árbol

[`FileTreeItem.tsx`](../../../src/modules/explorer/FileTreeItem.tsx):

- Etiquetas archivo: `displayName(node.name)` (L105).
- Hijos renderizados **solo si** `node.isDir && isExpanded && **hasChildren**` (L200, L252).
- **Bug de integración inline:** carpeta **vacía expandida** no entra en el bloque de hijos → **no hay sitio** para montar `ExplorerInlineCreateRow` sin cambiar la condición.
- [`FileTreeRootList`](../../../src/modules/explorer/FileTreeItem.tsx) L278–315: lista raíz + `ExplorerListEndDrop`; punto de montaje para creación en `listParentForView` (`Manuscrito`, etc.).

Layouts:

- Vista **lista** (manuscrito + WB tree): DnD activo (`@dnd-kit`).
- Vista **tarjetas** WB: [`CardView.tsx`](../../../src/modules/explorer/CardView.tsx) — sin filas de árbol; contexto vacío usa `cardPath`.
- **Búsqueda activa:** `FileExplorer` renderiza árbol filtrado con `dropIntent={null}` (sin DnD).

### 3.4 Frontend — display de nombres

[`pathUtils.ts`](../../../src/lib/pathUtils.ts) L21–25:

```typescript
export function displayName(pathOrName: string): string {
  const base = basename(pathOrName);
  return base.replace(/\.md$/i, "");
}
```

Solo oculta `.md`; otras extensiones se muestran completas — correcto para O3/O4.

### 3.5 Backend — Rust

| Archivo | Comportamiento |
|---------|----------------|
| [`commands/fs_ops.rs`](../../../src-tauri/src/commands/fs_ops.rs) L55–64 | `create_file`: CRUD + **`emit_fs_changed("create", …)`** |
| [`commands/fs_ops.rs`](../../../src-tauri/src/commands/fs_ops.rs) L46–52 | `create_folder`: solo CRUD, **sin emit** |
| [`fs/crud.rs`](../../../src-tauri/src/fs/crud.rs) L52–90 | **`create_file`**: trim; si `!file_name.to_lowercase().ends_with(".md")` → push `.md`; `validate_name` sobre stem sin `.md` |
| [`fs/crud.rs`](../../../src-tauri/src/fs/crud.rs) L76–85 | Manuscrito: `manuscript_initial_file_content(title_from_stem(stem))`; WB/otros: `EMPTY_MD_TEMPLATE` |
| [`fs/paths.rs`](../../../src-tauri/src/fs/paths.rs) L62–74 | `validate_name`: no vacío, sin `/` `\`, no `.` / `..` |
| [`fs/reconcile.rs`](../../../src-tauri/src/fs/reconcile.rs) L58–157 | Watcher → `apply_changes` → emit `create` para `.md` upserted |

**Tests Rust existentes en `crud.rs`:** `create_manuscript_file_uses_event_segment_format` (sin extensión → `.md` + frontmatter); **no** hay test `foo.txt` no debe ser `foo.txt.md`.

### 3.6 i18n

[`src/i18n/es/explorer.json`](../../../src/i18n/es/explorer.json) — claves `createFile.*`, `createFolder.*` usadas solo por modal. Tras FIX-008: deprecar o reutilizar para `aria-label` inline (§7.5).

### 3.7 Autofill (FIX-001)

[`Input`](../../../src/components/ui/input.tsx) ya lleva `autoComplete="off"`. La fila inline debe usar `Input` (no `<input>` suelto).

---

## 4. Hallazgos de investigación (bloqueantes / decisiones)

### 4.1 Bug Rust — extensión (confirmado en código)

```58:61:src-tauri/src/fs/crud.rs
    let mut file_name = name.trim().to_string();
    if !file_name.to_lowercase().ends_with(".md") {
        file_name.push_str(".md");
    }
```

| Entrada | Disco hoy | Disco deseado |
|---------|-----------|---------------|
| `Escena` | `Escena.md` | `Escena.md` ✓ |
| `Escena.md` | `Escena.md` | `Escena.md` ✓ |
| `notas.txt` | **`notas.txt.md`** | `notas.txt` ✗ |
| `readme.md.bak` | **`readme.md.bak.md`** | `readme.md.bak` ✗ |

### 4.2 Carpeta vacía — no hay slot para fila inline

Condición actual en `FileTreeItem`:

```200:201:src/modules/explorer/FileTreeItem.tsx
        {node.isDir && isExpanded && hasChildren ? (
```

**Decisión D2 (cerrada para implementación):** renderizar bloque hijos cuando `isExpanded && (hasChildren || inlineCreateActiveHere)`. La fila inline va **al final** de hijos (o sola si carpeta vacía), **antes** de `ExplorerListEndDrop`.

### 4.3 Doble evento `fs-changed` kind=create

Cadena observada en NDJSON:

1. IPC `create_file` → `reconcile::emit_fs_changed` ([`fs_ops.rs`](../../../src-tauri/src/commands/fs_ops.rs) L62).
2. Watcher detecta write → `apply_changes` → otro emit create ([`reconcile.rs`](../../../src-tauri/src/fs/reconcile.rs) L136–138).

Efecto: `useFsWatcher` → `notifyFsChange` → **`loadTree` dos veces** por cada archivo nuevo.

**Decisión D3 (recomendada, sub-tarea acotada):** en implementación, **eliminar emit explícito** en `create_file` IPC y confiar en watcher + `loadTree()` del store (igual que `create_folder`), **o** marcar path en guard self-save estilo FIX-012 para deduplicar en frontend. Elegir **una** vía; documentar en PR. Mínimo viable FIX-008: aceptar doble refresh si no hay regresión UX; ideal: una sola ronda.

### 4.4 ¿Abrir pestaña al crear archivo?

Código actual: solo `selectNode(newPath)`. NDJSON: usuario abrió manualmente `archivo pe.md`.

**Decisión D1 (recomendada):** **mantener** solo selección en explorador (menos intrusivo; coherente con modal actual). Opcional producto: `requestOpenDocument(newPath)` si path termina en `.md` y vista manuscrito — anotar en changelog si se activa.

### 4.5 Vista tarjetas WB

Sin árbol visible. **Decisión D4 (backlog §2.7):** mínimo viable — inline en **vista lista**; desde tarjetas/toolbar:

- **Opción A (recomendada):** `startInlineCreate` + `setExplorerLayout("tree")` temporalmente (o permanente hasta cancel/commit).
- **Opción B:** mini-fila inline al pie de `CardView` bajo breadcrumb (más trabajo).

Implementación debe **no romper** toolbar en tarjetas: al menos cambiar a tree y expandir `parentPath`.

### 4.6 Búsqueda activa

Con `searchQuery` non-empty, el árbol está filtrado. **Decisión D5:** al `startInlineCreate`, **cerrar búsqueda** (`closeSearch()`) o rechazar start si búsqueda abierta — preferir **cerrar búsqueda** y expandir carpeta real (VS Code sale del filtro al renombrar/crear).

### 4.7 Una sola fila inline

**Decisión D6:** `inlineCreate` es singleton en store; nuevo start cancela el anterior (VS Code).

### 4.8 Regla de extensión compartida

**Decisión D7 — algoritmo acordado (TS + Rust):**

```text
hasFileExtension(name):
  trimmed = trim(name)
  lastDot = last index of '.' in trimmed
  if lastDot <= 0: return false          // ".hidden" → false (sin extensión «real»)
  if lastDot == len-1: return false      // "foo." trailing dot
  return true

resolveNewFileName(input):
  trimmed = trim(input)
  if empty: return null
  if hasFileExtension(trimmed): return trimmed
  return trimmed + ".md"
```

Casos borde:

| Entrada | Resultado | Notas |
|---------|-----------|-------|
| `.gitignore` | `.gitignore.md` | Sin extensión por D7; raro en manuscrito |
| `foo.` | cancelar o `foo.md` | Trailing dot → tratar como sin extensión → `foo.md` |
| `CON` / nombres reservados Windows | error Rust `validate_name` o OS | No ampliar scope; error existente |

Rust: extraer `fn resolve_new_file_name(name: &str) -> Result<String, AppError>` en `paths.rs` o `crud.rs`; usar en `create_file`. Validar **stem** para `.md` (parte antes del último `.md` solo si extensión es `.md`); si extensión ≠ `.md`, validar nombre completo con `validate_name`.

---

## 5. Diseño UX (referencia VS Code)

```mermaid
sequenceDiagram
  participant User
  participant UI as FileTreeItem / Toolbar
  participant Store as useFileTreeStore
  participant Rust as create_file

  User->>UI: Nuevo archivo (parentPath X)
  UI->>Store: startInlineCreate("file", X)
  Store->>Store: expandPath(X); inlineCreate = { kind, parentPath }
  Store->>UI: Re-render fila ExplorerInlineCreateRow
  UI->>UI: autoFocus + scrollIntoView
  User->>UI: "Capítulo 3" + Enter
  UI->>Store: commitInlineCreate("Capítulo 3")
  Store->>Store: resolveNewFileName → "Capítulo 3.md"
  Store->>Rust: create_file(X, "Capítulo 3.md")
  Rust-->>Store: newPath
  Store->>Store: order + loadTree + selectNode; inlineCreate = null
```

**Teclado y blur (fila inline):**

| Acción | Comportamiento |
|--------|----------------|
| Enter | commit si nombre válido |
| Escape | cancel |
| Blur + texto | commit (VS Code) |
| Blur + vacío | cancel |
| Enter + vacío | cancel |

**Visual:** mismo indent que [`manuscriptContentPaddingLeft(depth)`](../../../src/modules/explorer/manuscriptTreeLayout.ts) / padding WB; icono archivo o carpeta alineado con filas normales; input ancho flexible (`min-w-0 flex-1`).

---

## 6. Plan de implementación por fases

> Ejecutar en orden. Tras cada fase, actualizar checklist §10 con rutas reales tocadas.

### Fase 0 — Utilidad de nombre + tests (TS)

**Nuevo:** [`src/lib/explorer/newFileName.ts`](../../../src/lib/explorer/newFileName.ts)

- Exportar `hasFileExtension`, `resolveNewFileName`, opcional `trimCreateName`.
- **Nuevo:** [`src/lib/explorer/newFileName.test.ts`](../../../src/lib/explorer/newFileName.test.ts) — tabla §4.8 + casos `Escena_1`, `notas.txt`, `""`, `"   "`.

**No** importar desde Rust; duplicar regla mínima en Rust (Fase 1).

### Fase 1 — Alinear Rust `create_file`

**Archivo:** [`src-tauri/src/fs/crud.rs`](../../../src-tauri/src/fs/crud.rs)

1. Sustituir bloque `ends_with(".md")` por `resolve_new_file_name` (§4.8).
2. `validate_name`:
   - Si destino termina en `.md` (case-insensitive): validar stem sin extensión `.md`.
   - Else: validar nombre completo.
3. Tests nuevos en `mod tests`:
   - `create_file_respects_txt_extension`
   - `create_file_adds_md_when_no_extension`
   - `create_file_explicit_md_unchanged`

**Opcional misma fase:** D3 — quitar `emit_fs_changed` de [`fs_ops.rs`](../../../src-tauri/src/commands/fs_ops.rs) `create_file` si QA confirma watcher suficiente.

### Fase 2 — Estado store `inlineCreate`

**Archivo:** [`useFileTreeStore.ts`](../../../src/stores/useFileTreeStore.ts)

```typescript
type InlineCreateState =
  | { kind: "file"; parentPath: string }
  | { kind: "folder"; parentPath: string }
  | null;
```

Acciones:

| Acción | Comportamiento |
|--------|----------------|
| `startInlineCreate(kind, parentPath)` | D6 singleton; D5 `closeSearch()`; `expandPath(parentPath)` + expandir ancestros si hace falta; `lastErrorKey = null`; audit `inline_create.start` |
| `cancelInlineCreate()` | `inlineCreate = null`; audit `inline_create.cancel` |
| `commitInlineCreate(rawName)` | Normalizar; file → `resolveNewFileName`; folder → trim; null → cancel; llamar `createFile` / `createFolder` existentes; clear inline; audit `inline_create.commit` + resultado |

**Tras éxito:** reutilizar flujo actual de `createFile` / `createFolder` (order, loadTree, selectNode). **D1:** no añadir `requestOpenDocument` salvo decisión contraria.

**Errores:** si IPC falla (`path_exists`, etc.), **mantener fila inline** con texto + `lastErrorKey` visible en `FileExplorer` (ya hay banner L487–491).

### Fase 3 — Componente `ExplorerInlineCreateRow`

**Nuevo:** [`src/modules/explorer/ExplorerInlineCreateRow.tsx`](../../../src/modules/explorer/ExplorerInlineCreateRow.tsx)

Props: `kind: "file" | "folder"`, `parentPath`, `depth`, `compact?: boolean` (manuscrito).

- `Input` con `autoFocus`, `ref` + `useEffect` → `scrollIntoView({ block: "nearest" })`.
- `onKeyDown`: Enter / Escape según §5.
- `onBlur`: commit/cancel según §5 (usar `relatedTarget` guard si el blur viene de un botón de error — patrón estándar `mousedown` prevent en botones adyacentes si hace falta).
- Estilos: reutilizar tokens `MS_ROW_*` en manuscrito; WB rounded row.
- `aria-label`: `t("inlineCreate.file")` / `t("inlineCreate.folder")` (nuevas claves).

**DnD:** fila **no** draggable; envolver sin `useDraggable`; no registrar droppable en la fila (solo hermanos normales).

### Fase 4 — Integración árbol (D2)

**Archivo:** [`FileTreeItem.tsx`](../../../src/modules/explorer/FileTreeItem.tsx)

1. Selector `inlineCreate` del store.
2. `showInlineHere = inlineCreate?.parentPath === node.path && node.isDir`.
3. Cambiar condición hijos a `isExpanded && (hasChildren || showInlineHere)`.
4. Tras `node.children.map`, insertar `<ExplorerInlineCreateRow />` si `showInlineHere`.
5. Mantener `ExplorerListEndDrop` después de hijos + inline.

**Archivo:** [`FileTreeRootList`](../../../src/modules/explorer/FileTreeItem.tsx)

- Si `inlineCreate?.parentPath === parentPath` (raíz `Manuscrito` / `Worldbuilding` / `""`), renderizar fila inline **después** de `nodes.map`, **antes** de `ExplorerListEndDrop`.

Helper opcional: `isInlineCreateParent(inlineCreate, parentPath)` en `newFileName.ts` o `explorerParentPath.ts`.

### Fase 5 — Disparadores (quitar modal create)

| Archivo | Cambio |
|---------|--------|
| [`ExplorerContextMenu.tsx`](../../../src/modules/explorer/ExplorerContextMenu.tsx) | `startInlineCreate("file"\|"folder", parentPath)` en lugar de `onOpenDialog` |
| [`WorkspaceTopBar.tsx`](../../../src/modules/layout/WorkspaceTopBar.tsx) | Igual; **D4:** si `explorerLayout === "cards"` → `setExplorerLayout("tree")` antes de start |
| [`ExplorerDialogs.tsx`](../../../src/modules/explorer/ExplorerDialogs.tsx) | Quitar ramas `createFile` / `createFolder` de `ExplorerDialogForm` y tipo `ExplorerDialogState` |
| [`FileExplorer.tsx`](../../../src/modules/explorer/FileExplorer.tsx) | Pasar `startInlineCreate` al menú si hace falta; cancel inline en unmount proyecto |

### Fase 6 — Vista tarjetas (D4)

**Archivo:** [`CardView.tsx`](../../../src/modules/explorer/CardView.tsx) — opcional fase 2:

- Si `inlineCreate?.parentPath === cardPath`, fila inline bajo grid **o** confiar solo en switch a tree desde Fase 5.

**Criterio mínimo:** toolbar + menú contextual no abren modal; usuario ve input en tree.

### Fase 7 — i18n + auditoría

**i18n** (`explorer.json` es/en):

```json
"inlineCreate": {
  "file": "Nombre del nuevo archivo",
  "folder": "Nombre de la nueva carpeta"
}
```

Deprecar títulos modal create (pueden quedar sin referencia).

**Auditoría** ([`audit.ts`](../../../src/lib/audit.ts) domain `explorer`):

| Evento | Payload |
|--------|---------|
| `obs.explorer.inline_create.start` | `{ kind, parentPath }` |
| `obs.explorer.inline_create.commit` | `{ kind, parentPath, diskName }` |
| `obs.explorer.inline_create.cancel` | `{ kind, parentPath }` |
| `obs.explorer.create.end` | `{ kind, path, ok, errorKey? }` — opcional wrap en store |

---

## 7. Matriz de no-choque

| Tarea | Relación con FIX-008 |
|-------|----------------------|
| **FIX-012** save / fs remove | Sin archivos en común; D3 solo si se reutiliza patrón dedup watcher |
| **OBS-001** | Reutilizar dominio `explorer`; NDJSON §9 |
| **FIX-001** autofill | Input base ya off |
| **FIX-007** borrador sucio | Sin interacción |
| **FIX-009** timeline | Sin interacción |
| DnD explorador | Fila inline fuera de `@dnd-kit` draggable |

---

## 8. Archivos probables a tocar (checklist implementación)

| Archivo | Cambio |
|---------|--------|
| `src/lib/explorer/newFileName.ts` | **Nuevo** |
| `src/lib/explorer/newFileName.test.ts` | **Nuevo** |
| `src/stores/useFileTreeStore.ts` | `inlineCreate`, start/cancel/commit |
| `src/modules/explorer/ExplorerInlineCreateRow.tsx` | **Nuevo** |
| `src/modules/explorer/FileTreeItem.tsx` | Montaje + D2 |
| `src/modules/explorer/ExplorerContextMenu.tsx` | Disparador |
| `src/modules/layout/WorkspaceTopBar.tsx` | Disparador + D4 |
| `src/modules/explorer/ExplorerDialogs.tsx` | Quitar create modal |
| `src/modules/explorer/CardView.tsx` | Opcional D4 |
| `src/i18n/es/explorer.json`, `en/explorer.json` | inlineCreate |
| `src-tauri/src/fs/crud.rs` | Regla extensión + tests |
| `src-tauri/src/fs/paths.rs` | Opcional helper Rust |
| `src-tauri/src/commands/fs_ops.rs` | Opcional D3 quitar emit |

**Sin tocar:** `reconcile.rs` (salvo D3), editor store, FIX-007 hooks, `CreateEntityDialog`.

---

## 9. Verificación manual y NDJSON

### 9.1 Casos funcionales

| # | Acción | Esperado |
|---|--------|----------|
| R1 | Clic derecho carpeta con hijos → Nuevo archivo | Fila inline al **final** de hijos, carpeta expandida, foco vacío |
| R2 | Carpeta **vacía** → Nuevo archivo | Fila inline visible al expandir (D2) |
| R3 | Escribir `Prueba` + Enter | Disco `Prueba.md`; árbol muestra `Prueba`; nodo seleccionado |
| R4 | Escribir `apuntes.txt` + Enter | Disco `apuntes.txt` (no `.md` extra) |
| R5 | Escape / Enter vacío | Fila desaparece; sin archivo |
| R6 | Toolbar nuevo archivo (tab activo en subcarpeta) | Inline en `createParentPath` correcto |
| R7 | Nueva carpeta inline | Sin extensión; carpeta creada y seleccionada |
| R8 | Raíz `Manuscrito/` → nuevo `.md` | Contenido manuscrito inicial (`title` en frontmatter, sin `+++`) |
| R9 | Nombre duplicado + Enter | Error `path_exists`; fila conserva texto |
| R10 | WB vista tarjetas → toolbar nuevo archivo | Cambia a tree (D4) o inline visible — según fase implementada |
| R11 | Con búsqueda abierta → nuevo archivo | Búsqueda se cierra (D5); inline en carpeta real |
| R12 | Arrastrar otro nodo mientras inline activo | DnD no roto; inline cancel o persiste (D6: nuevo start cancela) |

### 9.2 Regresión

| # | Verificar |
|---|-----------|
| G1 | Renombrar / eliminar modal siguen OK |
| G2 | `createEntity` modal WB intacto |
| G3 | DnD reordenar / mover carpetas |
| G4 | Abrir `.md` existente desde árbol |
| G5 | `npm test` + `cargo test` |

### 9.3 NDJSON post-implementación

Archivo esperado: `_debug/logs/session-*.ndjson`

| Buscar | Esperado |
|--------|----------|
| `obs.explorer.inline_create.start` | 1 por cada intento de creación |
| `obs.explorer.inline_create.commit` | Con `diskName` correcto |
| Sin modal | No eventos UI de diálogo create |
| `obs.fs.reconcile.emit` create | Idealmente **1×** por archivo si D3 aplicado; si no, documentar 2× sin bug funcional |
| `obs.editor.tab.open` | Solo si usuario abre archivo (D1) |

---

## 10. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Fila inline invisible en carpeta vacía | D2 obligatorio |
| Doble `loadTree` | D3 opcional |
| Blur/commit compite con clic en error banner | `onMouseDown` preventDefault en banner o delay blur |
| `@dnd-kit` captura pointer | Fila sin listeners drag |
| OneDrive / watcher ruido | Fuera de scope; igual que hoy |
| Extensión no `.md` en manuscrito | Permitida por O4; parser puede no indexar igual — documentar |

---

## 11. Checklist de cierre FIX-008

```
[ ] Fase 0 — newFileName.ts + Vitest
[ ] Fase 1 — Rust create_file + tests
[ ] Fase 2 — inlineCreate store + audit
[ ] Fase 3 — ExplorerInlineCreateRow
[ ] Fase 4 — FileTreeItem + FileTreeRootList (D2)
[ ] Fase 5 — Context menu + toolbar + quitar modal create
[ ] Fase 6 — Vista tarjetas (D4 mínimo)
[ ] Fase 7 — i18n
[ ] npm test + cargo test
[ ] QA manual R1–R12
[ ] NDJSON §9.3
[ ] implementation-plan.md → FIX-008 ✅
[ ] Actualizar §3–§4 de este plan si el código divergió durante la implementación
```

---

## 12. Registro

| Fecha | Nota |
|-------|------|
| 2026-06-11 | Plan creado tras investigación de código + NDJSON `session-1781307012322-6388.ndjson` (flujo modal pre-fix) |

---

**Última actualización:** 2026-06-11
