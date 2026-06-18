# ERAII-001 — M7: un solo modelo manuscrito en RAM

> **Estado:** ✅ **Cerrado** (2026-06-11) · **Commit:** `a5c06f6` · **Esfuerzo:** Alto · **Riesgo:** Medio  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md) Fase E · **Spec:** [`04-TASK.md`](../../../04-TASK.md) § II.4.1 · [`manuscript-roadmap.md`](../../manuscript-roadmap.md) M7

---

## 0. Procedencia (sin ejecución fantasma)

| Pregunta | Respuesta |
|----------|-----------|
| ¿Existía plan en `plans/Fase E/` **antes** de codificar? | **No.** La carpeta estaba vacía. |
| ¿Qué autorizó el trabajo? | [`manuscript-roadmap.md`](../../manuscript-roadmap.md) M7 + [`04-TASK.md`](../../../04-TASK.md) § II.4.1 + acuerdo en chat (jun 2026). |
| ¿Qué es este documento? | **Especificación retroactiva** del diff real en `a5c06f6`, redactada **después** de implementar y validar con OBS. |
| ¿Plan primero en Fase E? | **A partir de aquí sí** — ERAII-002/003 deben tener plan antes de código. |

**Regla recuperada:** plan detallado en `plans/Fase E/` → implementación → QA NDJSON → cierre en este archivo.

---

## 1. Problema y objetivo

### 1.1 Problema

El store del editor mantenía **dos modelos en RAM** para la misma escena:

- `ParsedManuscript` (contrato §1.9, IPC `read_manuscript` / `save_manuscript`)
- `ParsedDocument` generado en caliente vía `manuscriptToParsedDocument()` (adaptador legacy `+++` / `blocks[]`)

Los paneles de tiempo y partes del side panel leían `document.blocks[activeBlockIndex]`. Eso duplicaba estado, obligaba a resincronizar en cada flush/save/tab switch y apilaba bugs de integración aunque Rust compilara.

### 1.2 Objetivo

Un solo modelo en memoria para el flujo manuscrito activo: **`ParsedManuscript`**. Paneles y helpers leen **`segments[]`** y cabecera de archivo. El adaptador **no** forma parte del flujo activo del frontend.

### 1.3 Criterios de aceptación (M7)

| # | Criterio | Estado |
|---|----------|--------|
| C1 | `useEditorStore` sin campo `document: ParsedDocument` ni `manuscriptToParsedDocument` en rutas activas | ✅ |
| C2 | `EditorTab` sin `document` ni `activeBlockIndex` persistido | ✅ |
| C3 | Panel tiempo / diálogo tiempo usan `manuscript.segments` | ✅ |
| C4 | `findLastAddedTimeInManuscript` sustituye escaneo por `document.blocks` | ✅ |
| C5 | `BlockSeparatorNode` / `BlockMetadataNode` **fuera** del registro Lexical (`EditorShell`) | ✅ |
| C6 | `npm test` + `npm run build` verdes | ✅ |
| C7 | Smoke OBS post-M7 (evento, tiempos, `[-]`/`[+]`, reinicio, timeline) | ✅ `17440`+`24412` |

### 1.4 Fuera de alcance M7 (explícito)

| Tema | Motivo |
|------|--------|
| Tipos `ParsedDocument` / `ParsedBlock` en Rust o `lib/types/editor.ts` | Contrato IPC legacy / referencias; no RAM del editor |
| `blockIndex` en timeline / `useTimeTagDialogStore` | Índice legacy **derivado** (`segmentIndex + 1`) — contrato Rust/SQLite |
| Borrado físico de archivos `BlockSeparatorNode.ts`, etc. | **Afinado final** — ver [`manuscript-roadmap.md`](../../manuscript-roadmap.md) § Afinado |
| FIX-011, WB huérfanos | Pospuesto post-WB |
| Checklist §7 completo (ERAII-002) | Formal M8; smoke core OK en OBS |

---

## 2. Inventario pre-implementación (jun 2026)

| Pieza | Estado antes de M7 |
|-------|-------------------|
| [`useEditorStore.ts`](../../../../src/stores/useEditorStore.ts) | `manuscript` + `document`; `manuscriptTabFields()` llamaba adaptador |
| [`manuscriptBlocks.ts`](../../../../src/lib/editor/manuscriptBlocks.ts) | `manuscriptToParsedDocument()`, `segmentToBlock()` |
| [`SideTimeSection.tsx`](../../../../src/modules/editor/sidePanel/SideTimeSection.tsx) | `document?.blocks[activeBlockIndex]` |
| [`EditorSidePanel.tsx`](../../../../src/modules/editor/EditorSidePanel.tsx) | metadata del bloque vía `document.blocks` |
| [`TimeTagDialog.tsx`](../../../../src/modules/editor/sidePanel/TimeTagDialog.tsx) | `parsedDocument` del store |
| [`dateTags.ts`](../../../../src/lib/calendar/dateTags.ts) | `findLastAddedTimeInDocument(ParsedDocument)` |
| [`EditorShell.tsx`](../../../../src/modules/editor/EditorShell.tsx) | Registraba `BlockSeparatorNode`, `BlockMetadataNode` |
| [`HydrateDocumentPlugin.tsx`](../../../../src/modules/editor/plugins/HydrateDocumentPlugin.tsx) | Ya hidrataba `ParsedManuscript` ✅ (sin cambio de contrato) |

**Baselines OBS pre-M7:** `session-1781731603928-12612`, `session-1781732284462-24164`.

---

## 3. Diseño aplicado

### 3.1 Store

```text
read_manuscript → ParsedManuscript
       ↓
useEditorStore.manuscript (+ tabs[].manuscript)
       ↓
EditorCanvas → EditorShell → HydrateDocumentPlugin
```

- Eliminados: `document`, `activeBlockIndex`, `setActiveBlockIndex`, `tab.document`.
- `setActiveEventContext(context)` — sin segundo arg `legacyBlockIndex`; el índice timeline se **deriva** con `legacyBlockIndexFromContext()` donde hace falta (dialog, action audit).

### 3.2 Helpers segmento (`manuscriptBlocks.ts`)

| Función | Rol |
|---------|-----|
| `timeTagFromEventSegment` | barTags → etiqueta `time` |
| `eventSegmentAtLegacyBlockIndex` | blockIndex → segmento evento |
| `metadataForLegacyBlockIndex` | metadata para `openTimeTagForBlock` |
| `legacyBlockIndexIsValid` | guard en `TimeTagDialog` al guardar |
| ~~`manuscriptToParsedDocument`~~ | **Eliminado** del módulo |

### 3.3 Calendario / panel tiempo

- `findLastAddedTimeInManuscript(manuscript)` — recorre `fileHeader.body` + `segments[]` (barTags + inline).
- `resolveReferenceCalendarDate` / `resolveReferenceYear` — parámetro `manuscript` en lugar de `document`.

### 3.4 Lexical

- Nodos activos: `EventTagBarNode`, `EventFrameBottomNode`, `InlineTimeTagNode`, `WikiLinkNode`.
- `measureEventFrames.ts`: ya no trata `BlockSeparatorNode` como chrome de evento.

---

## 4. Diff real (`a5c06f6`)

| Archivo | Cambio |
|---------|--------|
| `src/stores/useEditorStore.ts` | Solo `ParsedManuscript`; flush/save/tabs sin `document` |
| `src/lib/editor/manuscriptBlocks.ts` | Adaptador out; helpers segmento; cabecera M7 |
| `src/lib/calendar/dateTags.ts` | `findLastAddedTimeInManuscript` |
| `src/lib/calendar/lastProjectTime.ts` | API manuscript |
| `src/modules/editor/sidePanel/SideTimeSection.tsx` | `manuscript` + `activeEventContext` |
| `src/modules/editor/sidePanel/TimeTagDialog.tsx` | `manuscript` + `legacyBlockIndexIsValid` |
| `src/modules/editor/EditorSidePanel.tsx` | `metadataForLegacyBlockIndex` |
| `src/modules/editor/EditorShell.tsx` | Quitados nodos legacy del registro |
| `src/lib/editor/measureEventFrames.ts` | Sin `$isBlockSeparatorNode` |
| `src/modules/editor/plugins/ActiveEventContextPlugin.tsx` | `setActiveEventContext(ctx)` |
| `src/modules/editor/plugins/EditInlineTimeTagPlugin.tsx` | blockIndex desde contexto Lexical |
| `_docs2/*` | Cierre M7, § Afinado final |

**Archivos legacy que siguen en disco (sin referencia activa):**  
`BlockSeparatorNode.ts`, `BlockMetadataNode.tsx`, `BlockMetadataChips.tsx`, `resolveBlockTime.ts`.

---

## 5. QA y evidencia

### 5.1 Pre-M7 (baseline comportamiento)

| bootId | Rol |
|--------|-----|
| `12612` | Crear evento, tiempos, cerrar, tabs, timeline |
| `24164` | Reinicio, ciclos `[-]`/`[+]`, segmentCount 1↔2 |

### 5.2 Post-M7 (validación refactor)

| bootId | Rol | Resultado |
|--------|-----|-----------|
| `17440` | Trabajo activo: label.commit seg 0/2, 9× save ok, miniTimeline 4→6, `seg::2` | ✅ |
| `24412` | Reinicio `draftCount:0`, gutter 18, 2 eventFrames, timeline hover + conectores | ✅ |

**Consistencia:** `issueCount: 0` en ambas sesiones post-M7.

**Observación conocida (no regresión M7):** en expand `[-]`/`[+]`, `segmentCount` en `save.start` (FE) puede diferir del Rust en el mismo tick; todos los saves terminaron `ok: true`.

### 5.3 Automatizado

```text
npm test  → 203/203 (jun 2026)
npm run build → OK
```

---

## 6. Afinado final (pospuesto — no parte de M7)

Política acordada: **no bloquea** MAP/WB. Ejecutar antes de II.6 / v0.10.0. Detalle en [`manuscript-roadmap.md`](../../manuscript-roadmap.md) § Afinado final.

- Borrar dead code listado en §4  
- Tests unitarios `findLastAddedTimeInManuscript` / `metadataForLegacyBlockIndex`  
- OBS: toggle etiquetas, `insertTimeTag` en action log  
- QA §7 residual (diff FIX-013 en recorrido manual)

---

## 7. Relación con otras tareas

| ID | Relación |
|----|----------|
| FIX-013 | Diff borrador — no revalidado en OBS post-M7; sigue en código |
| FIX-012 | Save-all desde caché `ParsedManuscript` — alineado con M7 |
| ERAII-002 | M8 QA formal §7 — plan [`ERAII-002-qa-manual-section7.md`](ERAII-002-qa-manual-section7.md); pendiente ejecución |
| ERAII-003 | Changelog v0.10.0 — tras M8 + afinado |
| MAP-* | Siguiente bloque activo en roadmap |

---

## 8. Registro

| Fecha | Evento |
|-------|--------|
| 2026-06-11 | Implementación + commit `a5c06f6` (mensaje corto «M7») |
| 2026-06-11 | QA post-M7 `17440` + `24412` |
| 2026-06-11 | **Este plan retroactivo** — trazabilidad Fase E |
| 2026-06-11 | Cierre documental: `implementation-plan`, `04-TASK`, `manuscript-roadmap` |
