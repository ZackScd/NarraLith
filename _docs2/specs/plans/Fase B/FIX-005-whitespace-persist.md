# FIX-005 — Guardado fiel a espacios y saltos de línea

> Plan de implementación detallado. Spec origen: [`fix-backlog.md` §8.B](../fix-backlog.md).  
> **Estado:** 🔄 Implementado (capas A–E) · QA manual §8 pendiente · **Esfuerzo:** Medio · **Riesgo:** Medio

---

## 1. Problema y objetivo

**Problema:** Tras FIX-004 el usuario puede enfocar el editor y pulsar Enter en la zona vacía inferior, pero al guardar (Ctrl+S) desaparecen los saltos finales; añadir solo líneas vacías no habilita «Guardar todo»; un espacio final tampoco persiste tras reabrir.

**Causa raíz:** Normalización `.trim()` (y filtros `!text.trim()`) en **varias capas** de la cadena extract → IPC → Rust → disco → re-parse → hydrate. El fingerprint de `markDirty` usa el extract ya recortado, por lo que cambios solo-whitespace no marcan sucio.

**Objetivo FIX-005 (solo §8.B):**

1. **Extract TS:** cabecera, segmentos `freeText` y cuerpos de evento reflejan el árbol Lexical **sin** `.trim()` que elimine espacios/saltos significativos.
2. **Hydrate TS:** reabrir conserva párrafos vacíos y saltos finales (incl. cuerpos solo-`\n`).
3. **Guardado Rust:** `build_manuscript_from_save` y `parse_manuscript_str` no recortan cuerpos de manuscrito §1.4.
4. **Split/parse Rust:** `block_splitter` y `frontmatter` no descartan whitespace estructural del autor al leer disco.
5. **`isDirty`:** coherente con cualquier cambio de texto visible (Enter vacío, espacio final) **sin** tocar `markDirty` salvo que QA demuestre un caso residual.
6. **Round-trip:** editor → `save_manuscript` → disco → `read_manuscript` → hydrate preserva trailing newlines y espacios en línea.

**Fuera de alcance de FIX-005 (otras tareas):**

| ID | Tema | Por qué no aquí |
|----|------|-----------------|
| **FIX-004** | Clic en vacío / foco | ✅ Cerrado |
| **FIX-006** | Rediseño marco evento | Solo UI |
| **FIX-007** | Borrador sucio al cerrar app | Persistencia sesión / localStorage |
| **EntityWorkspace** | Fichas WB | Otro pipeline (`save_entity`) |
| **Formato legacy `+++`** | Bloques genéricos | Sin proyectos legacy; no tocar `parse_legacy_document_str` salvo accidental |
| **Inline `{{time:…}}`** | Valores de token | `inline_scanner` sigue trim en **valores** de tag — correcto |
| **Metadatos evento** | Nombre, descripción | `commitManuscriptLabel` sigue `.trim()` en campos YAML — correcto |

> **Nota:** El backlog agrupa 8.A y 8.B en «Tarea 8»; `implementation-plan.md` las separa. **Este plan cubre únicamente FIX-005.** No mezclar con FIX-006/007 en el mismo PR.

---

## 2. Auditoría del código (cadena completa)

### 2.1 Flujo activo manuscrito

```text
Lexical (ParagraphNode / LineBreakNode)
  → extractManuscriptFromEditor          [documentSync.ts]
  → bodyFingerprintFromExtracted…        [markDirty en useEditorStore.ts]
  → IPC save_manuscript                  [commands/editor.rs]
  → build_manuscript_from_save           [editor.rs]
  → serialize_manuscript                 [serializer.rs]
  → disco .md
  → split_manuscript                     [block_splitter.rs]
  → parse_manuscript_str                 [document.rs]
  → parse_segment / parse_event_opening  [frontmatter.rs]
  → IPC read_manuscript
  → hydrateLexicalManuscript             [documentSync.ts]
  → Lexical
```

**Re-parse obligatorio tras guardar:** `write_manuscript_and_persist` serializa, escribe y vuelve a parsear (`document.rs` L607). Cualquier trim en parse **anula** el fix en extract aunque el `.md` en disco fuera correcto.

### 2.2 Puntos que recortan hoy (inventario verificado)

#### Frontend — `src/lib/editor/documentSync.ts`

| Línea | Código | Efecto |
|-------|--------|--------|
| 151 | `freeLines.join("\n").trim()` | Quita saltos/espacios al **inicio y final** del segmento libre |
| 152 | `if (body.length > 0)` | No emite segmento si tras trim queda vacío |
| 111 | `if (!text.trim()) return` | No hidrata cuerpos solo-whitespace (`"\n\n"`, `"   "`) |
| 100 | `fileHeader.body.trim().length === 0` | Solo heurística doc vacío — **OK mantener** (no afecta guardado) |
| 231 | `headerLines.join("\n")` | Cabecera extract **sin trim** ✅ |
| 174 | `eventLines.join("\n")` | Evento extract **sin trim** ✅ |

#### Frontend — `src/lib/editor/paragraphContent.ts`

| Pieza | Comportamiento |
|-------|----------------|
| `serializeParagraphContent` | Preserva `LineBreakNode` → `\n` y texto tal cual ✅ |
| `appendParagraphContent("")` | No-op; párrafo vacío se crea igual en `appendMultilineBody` ✅ |

#### Frontend — `src/stores/useEditorStore.ts`

| Pieza | Comportamiento |
|-------|----------------|
| `markDirty` L478–490 | Compara fingerprint del **extract** vs `savedBodyFingerprint`; early-return si igual |
| `bodyFingerprintFromExtractedManuscript` | JSON de `header.body` + segment bodies — fiel si extract es fiel ✅ |

**Conclusión:** Arreglar extract + parse Rust debería arreglar `isDirty` sin editar `markDirty`.

#### Backend — `src-tauri/src/commands/editor.rs`

| Línea | Código | Efecto |
|-------|--------|--------|
| 320–322 | `body.trim()` + skip si empty | Descarta trailing newlines en `FreeText` del payload IPC |

Eventos L346: `body` sin trim ✅

#### Backend — `src-tauri/src/parser/document.rs`

| Línea | Código | Efecto |
|-------|--------|--------|
| 63–65 | `body.trim()` + skip | Mismo filtro al **leer** segmentos libres |
| 254–256 | `block.body.trim()` | Adaptador `document_to_manuscript` (ruta legacy IPC) |
| 31 | `barTags` value trim | Solo metadata tiempo — **no tocar** |

#### Backend — `src-tauri/src/parser/block_splitter.rs`

| Línea | Código | Efecto |
|-------|--------|--------|
| 65, 68 | `header_raw` / `raw` con `.trim_end()` | Pierde saltos finales de cabecera antes del primer `+++event` (o EOF) |
| 113 | `if !free.trim().is_empty()` | Descarta prosa libre solo-whitespace **entre** eventos |
| 75 | `if !rest.trim().is_empty()` | Detección primer evento — revisar; no recortar cuerpos ya extraídos |

#### Backend — `src-tauri/src/parser/frontmatter.rs`

| Línea | Código | Efecto |
|-------|--------|--------|
| 41 | `after_open[body_start..].trim()` | Pierde trailing (y leading) en cuerpo tras `---` — afecta **cabecera** y **apertura de evento** |
| 21, 35 | `segment.trim()` | Rutas sin frontmatter válido — impacto menor en manuscrito §1.4 |

#### Backend — `src-tauri/src/parser/serializer.rs`

| Pieza | Comportamiento |
|-------|----------------|
| `serialize_manuscript` | Concatena `seg.body` sin trim ✅ |
| Separadores `\n\n` entre segmentos | Puede **añadir** saltos entre bloques además del cuerpo — ver §2.4 |

**No requiere cambio** salvo que tests de round-trip fallen por glue entre segmentos.

### 2.3 Modelo Lexical ↔ líneas

| Acción usuario | Árbol Lexical | Extract (por fase) |
|----------------|---------------|-------------------|
| Enter entre párrafos | Nuevo `ParagraphNode` vacío | Línea `""` en `freeLines` / `eventLines` |
| Shift+Enter en párrafo | `LineBreakNode` | `\n` dentro de la misma línea serializada |
| Espacio final en línea | `TextNode` con espacio | Preservado en `serializeParagraphContent` |
| 3× Enter tras última palabra | 3 párrafos vacíos tras el texto | `join("\n")` → `"texto\n\n\n"` sin trim |

### 2.4 Riesgo: glue del serializer

`serialize_manuscript` inserta `\n` / `\n\n` **entre** cabecera y segmentos cuando no termina en `\n\n`. Interacción con cuerpos que ya traen saltos finales:

- Cabecera `"prosa\n\n"` + evento: no debe duplicar de forma que el re-parse cambie el conteo de `\n`.
- **Mitigación:** tests Rust explícitos; ajustar solo condiciones de separador si QA lo exige — **no** reintroducir trim.

### 2.5 Archivos relacionados sin cambio previsto

| Archivo | Motivo |
|---------|--------|
| `commitManuscriptLabel.ts` | Trim en nombres/descripciones evento — metadata |
| `inlineTagSyntax.ts` / `inline_scanner.rs` | Trim en valores de tokens inline |
| `wikiLinkSyntax.ts` | Trim en targets wikilink |
| `manuscriptBlocks.ts` | Trim en títulos / barTags — metadata |
| `DirtyStatePlugin.tsx` | Ya ignora selección; sin cambio |
| `ExtractBlocksPlugin.tsx` | Solo registra extract |
| `entity/document.rs` | Fichas WB — otro pipeline |

---

## 3. Política de whitespace (decisión de diseño)

| Regla | Aplicación |
|-------|------------|
| **No `.trim()` en cuerpos** | Cabecera (`fileHeader.body`), `freeText.body`, `event.body` en extract, save, parse §1.4 |
| **Emitir segmento libre** | Si `freeLines.length > 0` tras recorrer párrafos en fase libre — aunque `body === ""` (párrafo vacío explícito al final) |
| **Omitir segmento libre** | Solo si no hubo ningún párrafo en esa fase (`freeLines` vacío) |
| **Rust omitir FreeText** | Solo si `body.is_empty()` (longitud 0 exacta), **no** si es solo `\n` o espacios |
| **Tras cierre YAML `---`** | Quitar **como máximo** un `\n` / `\r\n` estructural inmediato tras la valla; **preservar** el resto (incl. trailing) |
| **Cabecera split** | No usar `.trim_end()` en `header_raw` — el marcador `+++event` ya delimita |
| **Prosa entre eventos** | Preservar segmentos `FreeText` aunque sean solo `\n\n` (`!free.is_empty()`) |
| **Legacy / metadata** | Mantener trim en títulos, barTags, inline tag values, plothole |

---

## 4. Estrategia (cuatro capas)

| Capa | Qué | Prioridad |
|------|-----|-----------|
| **A** | Extract + hydrate TS (`documentSync.ts`) | **Obligatoria** |
| **B** | Guardado IPC (`editor.rs` `build_manuscript_from_save`) | **Obligatoria** |
| **C** | Parse + split Rust (`document.rs`, `block_splitter.rs`, `frontmatter.rs`) | **Obligatoria** — sin esto el round-trip post-save falla |
| **D** | Adaptador legacy `document_to_manuscript` + tests | **Recomendada** — evita regresión en rutas IPC dormidas |
| **E** | Ajuste fino serializer glue | **Solo si tests/QA lo exigen** |

**Orden:** A → B → C → D → `npm test` + `cargo test` → QA manual §7.

---

## 5. Cambios por archivo

### 5.1 Capa A — `src/lib/editor/documentSync.ts`

#### `flushFree` (aprox. L150–161)

**Antes:**

```typescript
const body = freeLines.join("\n").trim();
if (body.length > 0) {
  segments.push({ kind: "freeText", segmentIndex: nextSegmentIndex, body });
  nextSegmentIndex += 1;
}
```

**Después:**

```typescript
if (freeLines.length === 0) {
  freeLines = [];
  return;
}
const body = freeLines.join("\n");
segments.push({
  kind: "freeText",
  segmentIndex: nextSegmentIndex,
  body,
});
nextSegmentIndex += 1;
freeLines = [];
```

#### `appendMultilineBody` (aprox. L110–119)

**Antes:** `if (!text.trim()) return;`

**Después:**

```typescript
if (text.length === 0) {
  return;
}
const lines = text.split("\n");
for (const line of lines) {
  const paragraph = $createParagraphNode();
  appendParagraphContent(paragraph, line);
  root.append(paragraph);
}
```

Permite hidratar `"\n"`, `"\n\n"`, `"   \n"`, etc.

#### Helper opcional (tests)

Exportar función pura para Vitest:

```typescript
/** Une líneas de párrafos top-level sin normalizar whitespace. */
export function joinManuscriptParagraphLines(lines: string[]): string {
  return lines.join("\n");
}
```

Usar en `flushFree` y en tests.

---

### 5.2 Capa B — `src-tauri/src/commands/editor.rs`

En `build_manuscript_from_save`, rama `FreeText`:

**Antes:**

```rust
let trimmed = body.trim().to_string();
if trimmed.is_empty() {
    continue;
}
segments.push(ManuscriptSegment::FreeText(FreeTextSegment::new(
    file_path, segment_index, trimmed,
)));
```

**Después:**

```rust
if body.is_empty() {
    continue;
}
segments.push(ManuscriptSegment::FreeText(FreeTextSegment::new(
    file_path, segment_index, body,
)));
```

---

### 5.3 Capa C — Parse y split

#### `src-tauri/src/parser/document.rs`

**`parse_manuscript_str`** — rama `FreeText` (L62–72): misma regla que §5.2 (`is_empty()` en lugar de `trim().is_empty()`).

#### `src-tauri/src/parser/block_splitter.rs`

| Ubicación | Cambio |
|-----------|--------|
| L65 | `raw[..m.start()].to_string()` — quitar `.trim_end()` |
| L68 | `raw.to_string()` — quitar `.trim_end()` en rama sin eventos |
| L113 | `if !free.is_empty()` en lugar de `!free.trim().is_empty()` |

Añadir tests:

- Cabecera con `"prosa\n\n"` antes de `+++event` → `file_header.body` conserva trailing.
- `"+++end-event\n\n\n+++event"` → segmento `FreeText` con `"\n\n"`.

#### `src-tauri/src/parser/frontmatter.rs`

Sustituir `.trim()` del cuerpo post-valla por preservación de trailing:

```rust
fn body_after_yaml_fence(raw: &str) -> String {
    let mut body = raw.to_string();
    if body.starts_with("\r\n") {
        body = body[2..].to_string();
    } else if body.starts_with('\n') {
        body = body[1..].to_string();
    }
    body
}
```

Usar en `parse_segment` L41 (y evaluar L21/35 solo si afectan manuscrito §1.4 en tests).

Añadir tests:

- `---\ntitle: T\n---\nprosa\n\n` → body `"prosa\n\n"`.
- Apertura evento con cuerpo `cuerpo\n\n` → body preservado.

---

### 5.4 Capa D — Adaptador legacy + tests TS

#### `document.rs` — `document_to_manuscript` (L254–256)

Misma regla: no `trim()` en cuerpos libres; skip solo si `body.is_empty()`.

#### Tests Vitest — nuevo `src/lib/editor/documentSync.test.ts`

| Test | Assert |
|------|--------|
| Fingerprint distinto | `bodyFingerprintFromExtractedManuscript("a", [{ freeText, body: "a" }])` ≠ `… body: "a\n" …` |
| Fingerprint con espacio final | `"a "` vs `"a"` difieren |
| `joinManuscriptParagraphLines` | `["texto","","",""]` → `"texto\n\n\n"` |

#### Tests Rust — `document.rs`, `block_splitter.rs`, `frontmatter.rs`, `serializer.rs`

| Test | Escenario |
|------|-----------|
| `parse_manuscript_trailing_newlines_in_header` | Cabecera + `\n\n` |
| `parse_manuscript_trailing_in_free_segment` | Prosa libre final con Enter extra |
| `parse_manuscript_trailing_in_event_body` | Cuerpo evento con `\n\n` final |
| `save_manuscript_round_trip_trailing_newlines` | `save_manuscript_and_persist` con payload TS-like |
| `serializer_manuscript_preserves_trailing` | serialize → parse igualdad byte-a-byte de bodies |

Ejecutar suite existente `manuscript_round_trip_plan_example` — debe seguir verde.

---

### 5.5 Capa E — Serializer (condicional)

Archivo: [`serializer.rs`](../../src-tauri/src/parser/serializer.rs)

Solo modificar la lógica de separación entre segmentos (L34–41) si un test demuestra que el glue **destruye** trailing newlines del autor. Documentar en PR el ajuste mínimo.

---

### 5.6 Documentación specs (mismo PR al cerrar)

| Archivo | Cambio |
|---------|--------|
| [`implementation-plan.md`](../implementation-plan.md) | FIX-005 → ✅ |
| [`fix-backlog.md`](../fix-backlog.md) §8 | Marcar 8.B ✅ |
| [`manuscript-design.md`](../manuscript-design.md) §7 | Marcar ítem Shift+Enter / trailing si QA pasa |

---

## 6. Qué NO hacer (evitar regresiones)

| Acción prohibida | Por qué |
|------------------|---------|
| Quitar trim de **títulos**, **event names**, **barTags** | Metadata; no es prosa |
| Cambiar `inline_scanner` trim en valores | Sintaxis token; espacios no son válidos en `{{time:…}}` |
| Modificar FIX-004 / `ClickToFocusPlugin` | Alcance cerrado |
| `.trim()` global en `serialize_manuscript` | Rompe round-trip |
| Omitir capa C «porque extract ya guarda bien» | `write_manuscript_and_persist` re-parsea desde disco |
| Refactor `useEditorStore` / ERAII-001 | Scope FIX-005; no eliminar adaptador `ParsedDocument` |
| Tests E2E pesados obligatorios | QA manual + unit tests suficientes según convención FIX |

---

## 7. Pasos de implementación (checklist)

```
[x] 1. Capa A — documentSync.ts (flushFree, appendMultilineBody, helper opcional)
[x] 2. Capa B — editor.rs build_manuscript_from_save
[x] 3. Capa C — document.rs parse_manuscript_str
[x] 4. Capa C — block_splitter.rs (header_raw, free segments)
[x] 5. Capa C — frontmatter.rs body_after_yaml_fence
[x] 6. Capa D — document_to_manuscript + tests Vitest
[x] 7. Capa D — tests Rust nuevos (round-trip trailing)
[x] 8. npm run build
[x] 9. npm test
[x] 10. cargo test (parser::)
[ ] 11. QA manual §8 — pendiente usuario
[x] 12. Capa E — serializer glue (push_manuscript_segment_separator + end-event)
[ ] 13. Marcar FIX-005 ✅ en implementation-plan.md + fix-backlog §8.B (tras QA)
```

---

## 8. Verificación manual (obligatoria)

En **`npm run tauri dev`**, manuscrito bajo `Manuscrito/`.

### 8.1 Prosa libre (cabecera y tras eventos)

| # | Escenario | Acción | Esperado |
|---|-----------|--------|----------|
| 1 | Cabecera | Tras última palabra, Enter ×3 → Guardar → reabrir | 3 líneas vacías visibles al final de cabecera |
| 2 | Cabecera | Añadir un espacio al final de línea → Guardar → reabrir | Espacio conservado |
| 3 | Tras evento | Prosa libre con Enter extra al final | Igual tras round-trip |
| 4 | Solo Enter | Sin texto nuevo, solo Enter ×2 al final del doc | «Guardar todo» se habilita; tras guardar/reabrir persisten |

### 8.2 Dentro de evento

| # | Escenario | Esperado |
|---|-----------|----------|
| 5 | Cuerpo evento + Enter ×2 al final | Round-trip conserva saltos |
| 6 | Shift+Enter mid-párrafo | Salto intra-línea conservado (§7 manuscript-design) |
| 7 | Espacio antes de `{{time:…}}` | Sin regresión wikilink/inline |

### 8.3 isDirty

| # | Escenario | Esperado |
|---|-----------|----------|
| 8 | Solo Enter vacíos (FIX-004 foco abajo) | Botón guardar habilitado **sin** escribir letras |
| 9 | Solo un espacio `" "` | Idem |
| 10 | Clic vacío sin editar | **No** marca sucio (DirtyStatePlugin + fingerprint igual) |

### 8.4 Regresiones

| # | Escenario | Esperado |
|---|-----------|----------|
| 11 | Evento + sync WB + `[[nombre]]` | Guardar sin error; ficha Eventos OK |
| 12 | Toggle etiquetas ON/OFF | Sin cambio FIX-005 |
| 13 | Timeline / time_markers | Marcas siguen indexándose |
| 14 | Archivo sin eventos, solo cabecera | Abre y guarda normal |

---

## 9. Criterio de salida

- Escenarios §8.1–8.4 pasan en Tauri.
- `npm run build`, `npm test`, `cargo test` verdes.
- Ningún `.trim()` nuevo en cuerpos de manuscrito §1.4 en la cadena activa.
- FIX-005 marcado ✅ en [`implementation-plan.md`](../implementation-plan.md).

---

## 10. Riesgos y mitigación

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|------------|
| Archivos `.md` con trailing whitespace «accidental» dejan de normalizarse | Esperado | Comportamiento deseado; documentar en PR |
| Segmentos libres solo-`\n` entre eventos cambian conteo de `segment_index` vs disco antiguo | Baja | Solo al **guardar** prosa nueva entre eventos; parse fiel alinea con editor |
| Serializer añade `\n\n` extra entre bloques | Media | Capa E + tests |
| `markDirty` sigue sin detectar algún edge Lexical | Baja | Fingerprint tests; tocar `markDirty` solo si QA §8.3.10 falla |
| Confusión con FIX-007 (dirty al cerrar app) | N/A | FIX-005 solo RAM + disco; persistencia sesión es otra tarea |
| Frontmatter: quitar solo `\n` estructural insufficient | Baja | Tests frontmatter; ajustar helper |

---

## 11. Diff estimado

| Tipo | Cantidad |
|------|----------|
| Archivos TS editados | 1 (`documentSync.ts`) |
| Archivos TS nuevos | 1 (`documentSync.test.ts`) |
| Archivos Rust editados | 4 (`editor.rs`, `document.rs`, `block_splitter.rs`, `frontmatter.rs`) |
| Archivos Rust opcionales | 1 (`serializer.rs`) |
| Líneas netas | ~80–150 + tests |
| UI / i18n | 0 |

---

## 12. Relación con FIX-004 y FIX-007

- **FIX-004** arregló foco en vacío; el usuario **puede** añadir Enter que aún no persistían — FIX-005 cierra esa cadena.
- Documentar en PR: *«Persistencia trailing newlines; borrador al cerrar app = FIX-007»*.
- Tras FIX-005, el checklist §7 de `manuscript-design.md` (Shift+Enter, guardado manual) queda más cerca de cerrable en ERAII-002.

---

**Última actualización:** 2026-06-11
