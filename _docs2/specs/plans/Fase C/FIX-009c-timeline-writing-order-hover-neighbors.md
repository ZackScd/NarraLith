# FIX-009c — Hover: vecinos anterior + siguiente en orden de escritura (todos los chips)

> Plan de refinamiento post-QA FIX-009b. **Estado:** ⬜ Pendiente (jun 2026) · **Esfuerzo:** Medio · **Riesgo:** Medio  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md) Fase C · **Depende de:** FIX-009b (v1 implementado en código)  
> **Origen:** QA visual + [`session-1781321526405-27876.ndjson`](../../../_debug/logs/session-1781321526405-27876.ndjson)

---

## 1. Problema (QA jun 2026)

FIX-009b v1 implementado muestra **solo el enlace hacia la siguiente** marca en orden de escritura, y **solo en chips con `segmentId`** (marcas de evento).

### 1.1 Capturas de pantalla (`timeline test.md`)

| Observación | Esperado usuario | Comportamiento v1 |
|-------------|------------------|-------------------|
| Hover chip intermedio | Línea al **anterior** y al **siguiente** en orden de lectura | Solo línea hacia adelante |
| Chip «prosa libre» (sin título de evento) | Participa en la cadena | **Sin hover** (`segmentId` null → no entra en mapa ni en handlers) |
| Toggle «Mostrar siguiente enlace…» ON | Vecinos visibles | Parcialmente correcto (solo `next`) |

### 1.2 Ejemplo narrativo (mismo archivo)

Archivo `Manuscrito/…/escena.md`:

| Orden de escritura | Marca | Día | Tipo | `segmentId` |
|--------------------|-------|-----|------|-------------|
| 1 | Cabecera / prosa inicial | **10** | bar, sin evento | `null` |
| 2 | Apertura evento | **15** | bar | `…::seg::0` |
| 3 | Continuación mismo evento | **20** | inline | `…::seg::0` |

| Hover sobre | Debe mostrar |
|-------------|--------------|
| Día **10** | → día **15** (solo siguiente; no hay anterior) |
| Día **15** | ← día **10** **y** → día **20** |
| Día **20** | ← día **15** (solo anterior; no hay siguiente) |

> La cadena es la **secuencia de lectura del manuscrito dentro del archivo**, no la agrupación por evento aislado.

---

## 2. Auditoría — sesión `session-1781321526405-27876`

**Archivo:** `_debug/logs/session-1781321526405-27876.ndjson` · **17 eventos** · dominio `system` + `editor` únicamente.

| # | Hallazgo | Implicación |
|---|----------|-------------|
| H1 | **No hay eventos `obs.timeline.*`** ni payload de hover/conectores | El visor NDJSON no captura interacción timeline; QA es **solo visual** |
| H2 | Sesión abre 11 tabs manuscrito; activo final `Manuscrito/carpeta en raíz/timeline test.md` | Reproduce escenario de capturas |
| H3 | `obs.consistency.updated` → `issueCount: 0` | Sin inconsistencias de índice en ese arranque |
| H4 | Sin IPC/query log de `list_timeline_events` | No podemos inferir marcas exactas del NDJSON; validar con inspección DB o UI |

**Conclusión auditoría:** el log **confirma contexto de reproducción** pero **no sustituye** inspección de `time_markers` del proyecto. Para implementación hace falta apoyarse en el modelo Rust ya documentado (§3).

---

## 3. Auditoría — modelo de datos (`time_markers`)

Fuente: [`src-tauri/src/db/blocks.rs`](../../../src-tauri/src/db/blocks.rs), [`project.rs`](../../../src-tauri/src/timeline/project.rs).

### 3.1 Tipos de marca en manuscrito

| Origen en documento | `block_index` | `segment_id` | `tag_kind` | Chip timeline |
|---------------------|---------------|--------------|------------|---------------|
| Cabecera archivo (`time` en metadata bloque 0) | **0** | **`null`** | `bar` | Simple (solo nombre archivo) — **prosa libre** |
| Inline en párrafo libre (sin `+++event`) | ≥0 | **`null`** | `inline` | Simple |
| Barra `+++event` (barTags time) | ≥1 | `…::seg::N` | `bar` | Dual si hay `title` |
| Inline dentro de evento | ≥1 | `…::seg::N` | `inline` | Dual |

Orden SQL de trayectoria (ya alineado con lectura):

```sql
b.block_index ASC,
COALESCE(tm.segment_id, '') ASC,
CASE tag_kind WHEN 'bar' THEN 0 WHEN 'inline' THEN 1 END,
COALESCE(tm.char_offset, 0) ASC
```

### 3.2 Gap FIX-009b v1 vs modelo

| Pieza v1 | Supuesto incorrecto |
|----------|---------------------|
| `buildWritingOrderNextLink` agrupa por **`segmentId + lane`** | Excluye prosa (`segmentId null`) y **no encadena** cabecera → evento |
| `writingOrderKeyForItem` usa `segmentIndex` parseado pero **no `blockIndex`** | Dentro del mismo bloque bar/inline OK; entre bloques distintos sin segmentId puede fallar el orden |
| Hover gated `item.segmentId && …` en `TimelineHorizontal` | **Todos los chips con marca temporal** deben participar |
| Solo renderiza **un** `TimelineEventLink` (`next`) | Faltan hasta **dos** enlaces (`prev`, `next`) |

### 3.3 Datos ya disponibles en frontend

Cada `TimelineDisplayItem` / `PlacedTimelineItem` incluye:

- `path`, `blockIndex`, `segmentId`, `tagKind`, `charOffset`, `lane`, `eventLabel`

No requiere cambios Rust para v1 de FIX-009c.

---

## 4. Objetivo

| # | Criterio |
|---|----------|
| O1 | Hover sobre **cualquier chip** con marca temporal (manuscrito o below) → resaltado + **0–2** líneas destacadas |
| O2 | Línea **anterior** (`prev`) si existe en orden de escritura |
| O3 | Línea **siguiente** (`next`) si existe |
| O4 | Cadena por **`path + lane`** (todas las marcas del mismo archivo visibles), no solo mismo `segmentId` |
| O5 | Orden dentro del archivo = **`blockIndex` → segmentIndex → tagRank → charOffset** (ignorar `sortKey`) |
| O6 | Orden entre archivos manuscrito = **`pathIndex`** DFS + `explorerOrder` (sin cambio vs 009b) |
| O7 | Prosa libre (`segmentId null`) incluida en la cadena |
| O8 | Compatible FIX-009a (`linkEdgeAnchors`) |
| O9 | Toggle panel renombrado/clarificado (ya no «solo siguiente») |
| O10 | Tests unitarios: cadena cabecera→evento→inline + hover bidireccional |

### Fuera de alcance v1 (FIX-009c)

| Tema | Motivo |
|------|--------|
| Enlace del **último** chip de archivo A al **primero** de archivo B | Usuario no lo pidió en este QA; cadena **intra-archivo** primero |
| Mini timeline editor | Hereda en fase posterior |
| Observabilidad `obs.timeline.hover` | Opcional; no bloqueante |

---

## 5. Diseño propuesto

### 5.1 Clave de orden revisada

```typescript
export interface WritingOrderKey {
  pathIndex: number;
  blockIndex: number;      // NUEVO — refleja orden documento
  segmentIndex: number;    // parseSegmentIndex; -1 si segmentId null
  tagRank: number;         // bar=0, inline=1
  charOffset: number;
  path: string;
  id: string;
}
```

`compareWritingOrder` — precedencia:

```typescript
pathIndex → blockIndex → segmentIndex → tagRank → charOffset → id
```

> **Crucial:** `blockIndex` desambigua cabecera (0) vs primer `+++event` (1+) antes que `segmentIndex`.

### 5.2 Agrupación de cadena

**Antes (009b):** `key = segmentId + lane`  
**Después (009c):** `key = normalizePath(path) + '\0' + lane`

Todos los `placed` visibles del mismo archivo y banda forman **una sola lista ordenada**.

### 5.3 Mapa de vecinos

Reemplazar / extender `buildWritingOrderNextLink`:

```typescript
export interface WritingOrderNeighbors {
  prevId: string | null;
  nextId: string | null;
}

export function buildWritingOrderNeighbors(
  placed: PlacedTimelineItem[],
  pathIndex: Map<string, number>,
): Map<string, WritingOrderNeighbors>
```

Para cada ítem en la cadena: `prevId = sorted[i-1]`, `nextId = sorted[i+1]`.

### 5.4 Render hover

```typescript
// Al hover id = H
const { prevId, nextId } = neighbors.get(H) ?? {};
// Dibujar 0, 1 o 2 TimelineEventLink highlighted
```

| Vecinos | Líneas |
|---------|--------|
| solo `next` | 1 |
| solo `prev` | 1 |
| ambos | 2 (mismo estilo `--primary` 2px) |
| ninguno | solo highlight chip |

**Handlers:** activar hover en **todo chip** `kind === 'file'` con marca (todos los de `placed` manuscrito/below temporales), no solo `segmentId`.

### 5.5 Toggle e i18n

| Actual | Propuesto |
|--------|-----------|
| `showWritingOrderHoverLink` | Mantener clave store (evitar migración) |
| ES: «Mostrar siguiente enlace al pasar el cursor» | **«Mostrar enlaces de lectura al pasar el cursor»** |
| EN: «Show next link on hover» | **«Show reading-order links on hover»** |

Subtítulo panel (opcional tooltip): «Anterior y siguiente en el orden del manuscrito, no cronológico».

---

## 6. Escenarios de prueba

### 6.1 Unitarios (`writingOrder.test.ts`)

| ID | Escenario | Assert |
|----|-----------|--------|
| T1 | Cabecera d10 + bar evento d15 + inline d20 mismo path | `neighbors(d10).next=d15`; `d15.prev=d10`, `d15.next=d20`; `d20.prev=d15` |
| T2 | Flashback inline d10 después de bar d22 **mismo segmentId** | Orden escritura bar→inline; `prev`/`next` coherentes |
| T3 | Dos archivos, mismos días | Cadenas **independientes** (no cross-link) |
| T4 | Chip único en archivo | `{ prev: null, next: null }` |
| T5 | `explorerOrder` invertido | Solo afecta si se implementa cross-file en futuro; intra-archivo invariante |

### 6.2 QA manual (post-implementación)

| # | Acción | Esperado |
|---|--------|----------|
| R1 | Hover prosa d10 | Línea → d15 |
| R2 | Hover d15 | Líneas ← d10 y → d20 |
| R3 | Hover d20 | Línea ← d15 |
| R4 | Toggle OFF | Sin líneas ni highlight store |
| R5 | Conectores cronológicos OFF, hover ON | Solo vecinos escritura |
| R6 | Archivo solo cabecera | Hover sin líneas |
| R7 | Captura `timeline test.md` | Vecinos visibles en chips simples y dual |

---

## 7. Archivos probables

| Archivo | Cambio |
|---------|--------|
| `src/modules/timeline/writingOrder.ts` | `blockIndex` en key; `buildWritingOrderNeighbors`; deprecar solo-next |
| `src/modules/timeline/writingOrder.test.ts` | T1–T5 |
| `src/modules/timeline/TimelineHorizontal.tsx` | Hover todos los chips; render 0–2 links |
| `src/stores/useTimelineStore.ts` | Sin cambio de schema (opcional alias setter) |
| `src/i18n/*/timeline.json` | Copy toggle |
| `src/components/workspace-ui/TimelineFiltersSection.tsx` | Sin cambio estructural |

---

## 8. Relación FIX-009 / 009a / 009b / 009c

| Feature | Agrupación | Enlaces | Visible |
|---------|------------|---------|---------|
| FIX-009 globales | `segmentId + lane` | Todos los pares **cronológicos** | Toggle conectores |
| FIX-009b v1 | `segmentId + lane` | Solo **next** escritura | Toggle hover |
| **FIX-009c** | **`path + lane`** | **`prev` + `next`** escritura | Mismo toggle (copy actualizado) |

---

## 9. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Muchas marcas en un archivo largo | Sigue O(1) por hover (2 líneas max) |
| Usuario confunde cronológico vs lectura | Copy panel §5.5; dos toggles ya separados |
| `blockIndex` desincronizado tras edit | Recalcular al refrescar `events` (igual que hoy) |
| Anuales (`kind: annual`) | Excluidos de cadena (`kind !== 'file'`) |

---

## 10. Checklist de cierre

```
[ ] Auditoría datos confirmada en proyecto real (timeline test.md)
[ ] writingOrderNeighbors + tests T1–T5
[ ] Hover todos los chips temporales
[ ] Render prev + next
[ ] i18n toggle
[ ] QA R1–R7
[ ] FIX-009b plan → nota «v1 parcial; cerrado por 009c»
[ ] implementation-plan.md FIX-009c ✅
```

---

## 11. Registro

| Fecha | Cambio |
|-------|--------|
| 2026-06-11 | Plan redactado tras QA: solo next, solo segmentId; ejemplo prosa d10→evento d15→d20 |
| 2026-06-11 | Auditoría NDJSON `session-1781321526405-27876` + modelo `time_markers` |

---

**Última actualización:** 2026-06-11 · **Estado:** ⬜ Pendiente · **Implementar después de:** validación usuario de este plan
