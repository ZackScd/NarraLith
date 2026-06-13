# FIX-009 — Timeline: chip doble (archivo + evento) y conectores por evento

> Plan de investigación e implementación. **Estado:** 🔄 v1 implementado — pendiente [FIX-009a](FIX-009a-timeline-connector-edge-anchors.md) + QA cierre (jun 2026) · **Esfuerzo:** Medio–Alto · **Riesgo:** Medio–Alto  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md) Fase C · Spec origen: [`fix-backlog.md` §3](../../fix-backlog.md)  
> **Depende de:** indexación multi-marca (`segment_id` en SQLite) ✅ · FIX-006/006.5 marco evento ✅  
> **Siguiente:** [FIX-009a](FIX-009a-timeline-connector-edge-anchors.md) (anclas borde) → [FIX-009b](FIX-009b-timeline-writing-order-links.md) (hover orden escritura)  
> **Convención:** refleja el **código real** al planificar; actualizar inventario si cambia el pipeline timeline antes de implementar.

---

## 1. Problema y objetivo

### 1.1 Problema

Un **mismo evento** de manuscrito puede tener **varias marcas de tiempo** (barTags en cabecera del segmento + etiquetas `time` inline en el cuerpo). Ejemplo real del proyecto: archivo `meow.md`, evento `eventTest`, marcas en días **17** y **18**.

Hoy el timeline horizontal muestra **cada marca igual**: una sola línea con el **nombre del archivo** (`meow`), ignorando el nombre del evento que Rust ya expone como `TimelineEvent.title`.

El usuario quiere la **estructura del boceto** (colores del dibujo = capas, **no** paleta a implementar).

En el timeline horizontal el **eje temporal** divide la vista en **dos bandas** (invariante del código actual):

- **Arriba del eje:** marcas de **manuscrito** (`Manuscrito/…`) — aquí viven los eventos con marco (`segmentId`) y el caso principal de FIX-009.
- **Abajo del eje:** eventos temporales WB, rutas fuera de `Manuscrito/`, y entradas **anuales** del calendario — chip simple salvo WB con `segmentId` + título (§4.1).

```
                    banda SUPERIOR — manuscrito (lane: "manuscript")
     ┌─────────────────┐                    ┌─────────────────┐
     │ meow            │  ← archivo (sec.)  │ meow            │
     │ eventTest       │  ← evento (princ.) │ eventTest       │
     └────────┬────────┘                    └────────┬────────┘
              │ vástago ↓ al eje                         │ vástago ↓
══════════════╪══════════════════ eje temporal ══════════╪══════════════
         día 17│                                          │día 18
              └────────── conector (mismo segmentId, ──────┘
                           misma banda superior)

                    banda INFERIOR — WB / anuales (lane: "below")
              ┌─────────┐     ┌─────────┐
              │ festivo │     │ WB evt  │  ← chips simples o dual WB;
              └────▲────┘     └────▲────┘    vástago ↑ desde eje
                   │ vástago ↑
```

> El boceto original solo dibujaba la **banda superior**; FIX-009 debe respetar que manuscrito **nunca** baja al carril inferior, y que conectores no crucen el eje hacia anuales/WB.

Además: el **conector** que une marcas del **mismo evento** debe poder **mostrarse u ocultarse** con un filtro en el panel del timeline.

### 1.2 Objetivo FIX-009

| # | Criterio |
|---|----------|
| O1 | Marca con `segmentId` + nombre de evento → chip de **dos líneas**: archivo (secundario, arriba) + evento (principal, abajo) |
| O2 | Marcas **sin evento** (`segmentId` ausente o sin título) → chip **simple** como hoy (solo etiqueta única) |
| O3 | Marcas consecutivas del **mismo `segmentId`** (orden cronológico) unidas por **conector visual** (polilínea/diagonal entre cajas) |
| O4 | Filtro panel timeline **«Mostrar conectores de evento»** — ON por defecto; OFF oculta conectores, chips dual siguen |
| O5 | **Sin paleta nueva** — tokens existentes `--timeline-chip-*`, `--timeline-stem`, `--primary`; **tipografía y caja derivadas del chip actual**, no medidas literales del boceto |
| O6 | Layout en **dos bandas** intacto: manuscrito arriba del eje, WB/anuales abajo; carriles y zoom legibles |
| O7 | `npm test` con casos nuevos en `timelineModel` + build OK |
| O8 | QA manual documentado (§10) con proyecto que tenga evento multi-marca |

### 1.3 Fuera de alcance

| Tema | Motivo |
|------|--------|
| Timeline **vertical** | Placeholder en [`TimelineView.tsx`](../../../src/modules/timeline/TimelineView.tsx); v1 solo horizontal |
| Calendario mensual chip dual | [`calendarEntries.ts`](../../../src/lib/calendar/calendarEntries.ts) ya prioriza `title`; alineación visual opcional futura |
| Cambios Rust / SQLite schema | Datos ya disponibles en `get_timeline_events` |
| Conectores entre **archivos** distintos | Solo mismo `segmentId`, no mismo nombre de archivo |
| Agrupar por nombre de evento sin `segmentId` | Un archivo puede tener `seg::0`, `seg::1`, … |
| Mini timeline: arcos conector | Espacio reducido; v1 = chip dual coherente, **sin** arcos (§8.2) |
| Persistencia `localStorage` del filtro | Opcional; default store basta en v1 |
| OBS audit nuevos eventos | Opcional; no bloquea cierre |

---

## 2. Evidencia y boceto de referencia

| Fuente | Qué aporta |
|--------|------------|
| Boceto usuario (jun 2026) | **Formato** (dos líneas + vástago + conector); colores y **px del dibujo no son spec** |
| [`fix-backlog.md` §3](../../fix-backlog.md) | Objetivo y orden de implementación preliminar |
| Proyecto QA habitual | `meow.md` + `eventTest` + marcas d17/d18 citadas en backlog |
| Calendario | Ya muestra `event.title \|\| fileDisplayName` — prueba de que el dato existe |

**Sin NDJSON de cierre formal** hasta FIX-009a. Sesión exploratoria registrada abajo.

### 2.1 QA exploratoria — `session-1781319870943-19224.ndjson`

| Paso | Observación | Veredicto |
|------|-------------|-----------|
| Archivo `Manuscrito/carpeta en raíz/timeline test.md` + evento `timelineTest` | L1–L23: create/save OK | ✅ datos |
| Chip dual visible | Captura: `timeline test` + `timelineTest` arriba del eje | ✅ O1 |
| Toggle «Mostrar conectores de evento» | Presente y activo en panel | ✅ O4 |
| Conectores con pocas marcas | Funciona pero línea **centro inferior → centro superior** | ⚠️ confuso |
| Densidad futura | Usuario: con muchas marcas/líneas **se taparían** y no se entendería | ⚠️ → **FIX-009a** |
| Orden flashback (idea) | Escena d22 luego flashback d10: enlace deseado = **orden escritura**, no cronológico | 💡 → **FIX-009b** |

---

## 3. Auditoría — pipeline de datos (jun 2026)

### 3.1 Persistencia SQLite → Rust

| Pieza | Comportamiento |
|-------|----------------|
| [`blocks.rs::upsert_event_time_markers`](../../../src-tauri/src/db/blocks.rs) L196–252 | Bloques con índice ≥ 1 (segmentos evento): `segment_id = {file}::seg::{index-1}`; barTags + inline con mismo `segment_id` |
| [`blocks.rs::upsert_inline_time_markers_for_block`](../../../src-tauri/src/db/blocks.rs) L255–284 | Bloque cabecera / sin segmento: `segment_id = NULL` |
| [`parser/types.rs::stable_segment_id`](../../../src-tauri/src/parser/types.rs) L102–104 | Formato: `"Manuscrito/meow.md::seg::0"` |
| Marker id | `{segment_id}::bar::{i}` o `{segment_id}::inline::{charOffset}` |

**Implicación:** todas las marcas de tiempo de un segmento evento comparten **`segmentId`**; es la clave de agrupación para conectores.

### 3.2 IPC → frontend

| Pieza | Comportamiento |
|-------|----------------|
| [`timeline/project.rs::list_timeline_events`](../../../src-tauri/src/timeline/project.rs) | Por fila: `path`, `title` ← `metadata.event` o `tm.label`, `segment_id`, `tag_kind`, `char_offset`, `timestamp`, `raw_time` |
| Orden SQL | timestamp ASC → path → block → **segment_id** → tag_kind (bar antes inline) → char_offset |
| [`TimelineEvent`](../../../src/lib/types/timeline.ts) | Tipos TS alineados (`segmentId`, `title`, …) |
| [`useProjectTimelineStore`](../../../src/stores/useProjectTimelineStore.ts) | `invokeCommand("get_timeline_events")` |

**Conclusión:** **no hace falta tocar Rust** para FIX-009.

### 3.3 Modelo de display (gap principal)

| Pieza | Comportamiento hoy | Gap |
|-------|-------------------|-----|
| [`timelineModel.ts::buildTimelineItems`](../../../src/modules/timeline/timelineModel.ts) | `label = fileDisplayName(path)`; lane: `Manuscrito/` → `"manuscript"`, resto → `"below"`; anuales → `"below"` | **Ignora** `title`, `segmentId` |
| [`timelineMarkerId`](../../../src/lib/calendar/timeMarks.ts) L25–29 | Id estable incluye segment/kind/offset | OK para keys |
| [`calendarEntries.ts`](../../../src/lib/calendar/calendarEntries.ts) L91 | `label = event.title?.trim() \|\| fileDisplayName` | Timeline **desalineado** con calendario |

### 3.3.1 Layout en dos bandas (invariante — no cambiar en FIX-009)

| Banda | `lane` | Origen típico | Posición Y (`TimelineHorizontal`) | Vástago |
|-------|--------|---------------|-----------------------------------|---------|
| **Superior** | `"manuscript"` | Paths `Manuscrito/…` con marcas de tiempo | Encima de `barTop`; carriles apilados hacia arriba (`MANUSCRIPT_LANE_STEP`) | Caja → **↓** eje |
| **Inferior** | `"below"` | WB/eventos fuera de manuscrito; **anuales** (`kind: "annual"`) | Debajo de `barBottom`; carriles hacia abajo (`BELOW_LANE_HEIGHT`) | Eje → **↑** caja |

**Implicaciones FIX-009:**

1. Chip dual + conectores del boceto aplican al **caso manuscrito** (banda superior); QA principal con `meow` + `eventTest`.
2. Conectores solo entre marcas del **mismo `segmentId` y mismo `lane`** — nunca cruzan el eje ni unen manuscrito con WB.
3. Anuales (`segmentId` null) permanecen chip simple en banda inferior; no participan en conectores de evento.
4. Si un path WB tuviera `segmentId` + título: chip dual permitido en banda inferior; conector con anclas **invertidas** (§5.2–5.3) — secundario v1, no bloquea cierre.

### 3.4 Render SVG

| Pieza | Constantes / comportamiento |
|-------|----------------------------|
| [`timelineGraphics.tsx`](../../../src/modules/timeline/timelineGraphics.tsx) | `BOX_HEIGHT = 28`, chip una línea 11px, vástago `--timeline-stem` |
| [`TimelineHorizontal.tsx`](../../../src/modules/timeline/TimelineHorizontal.tsx) | **Dos bandas:** `lane: "manuscript"` → cajas **encima** del eje (`y = barTop - BOX_HEIGHT - …`); `lane: "below"` → **debajo** (`y = barBottom + …`). Carriles independientes: `MANUSCRIPT_LANE_STEP` / `BELOW_LANE_HEIGHT` |
| Z-order actual | Eje/ticks → **vástagos** → **chips** (L1385–1401) |
| [`TimelineView.tsx`](../../../src/modules/timeline/TimelineView.tsx) | Solo horizontal activo; vertical = placeholder |

### 3.5 Filtros y panel

| Pieza | Comportamiento |
|-------|----------------|
| [`useTimelineStore.ts`](../../../src/stores/useTimelineStore.ts) | `TimelineFilterState`: manuscript, events, festivals, … — **sin** toggle conectores |
| [`TimelineFiltersSection.tsx`](../../../src/components/workspace-ui/TimelineFiltersSection.tsx) | Checkboxes actuales |
| [`TimelineSidePanel.tsx`](../../../src/modules/timeline/TimelineSidePanel.tsx) | Pasa labels i18n a filtros |

### 3.6 Otros consumidores de `buildTimelineItems` / `TimelineChip`

| Consumidor | Impacto FIX-009 |
|------------|-----------------|
| [`TimeTagMiniTimeline.tsx`](../../../src/modules/editor/sidePanel/TimeTagMiniTimeline.tsx) | Usa `TimelineChip` preview — adaptar chip dual (§8.2) |
| [`TimeTagTimelinePreview.tsx`](../../../src/modules/editor/sidePanel/TimeTagTimelinePreview.tsx) | Revisar si importa chip; probablemente no |
| Tests | **0** tests timeline hoy — crear `timelineModel.test.ts` |

### 3.7 Funciones layout duplicadas / no usadas

| Función | Ubicación | Uso real |
|---------|-----------|----------|
| `assignLanes` | `timelineLayoutHelpers.ts` | **Usada** en `TimelineHorizontal` |
| `layoutManuscriptLanesAbove` | `timelineModel.ts` | **No importada** en horizontal — dead code o legacy |
| `spreadCollidingBoxes` | `timelineModel.ts` | **No importada** en horizontal |
| `layoutBelowLanes` | `timelineModel.ts` | **No importada** en horizontal |

**Nota implementación:** recalcular ancho con `estimateLabelWidth` en `assignLanes` vía `item.width` ya asignado en horizontal (L779). Dual chip debe actualizar **width** y opcionalmente `MANUSCRIPT_LANE_STEP` si altura crece.

---

## 4. Semántica de agrupación (`segmentId`)

### 4.1 Cuándo hay chip dual

```typescript
const fileLabel = fileDisplayName(event.path);
const eventLabel =
  event.segmentId && event.title?.trim()
    ? event.title.trim()
    : null;
const isDualChip = eventLabel !== null;
```

| Caso | `segmentId` | `title` | UI |
|------|-------------|---------|-----|
| Segmento evento `eventTest` | `…::seg::0` | `eventTest` | Dual |
| Segmento sin campo `event` en YAML | `…::seg::1` | null / vacío | Simple (`fileLabel`) |
| Cabecera archivo con `time` inline | null | location/title | Simple |
| Evento WB bajo `Worldbuilding/…` | puede tener seg | title | Dual si title (misma regla) |

### 4.2 Orden dentro de un segmento (para conectores)

Usar la misma precedencia que SQL:

1. `sortKey` (timestamp absoluto)
2. `tagKind`: `bar` (0) antes que `inline` (1)
3. `charOffset` ASC

Solo enlazar **pares consecutivos** dentro del grupo `(segmentId, visible)`.

### 4.3 Qué no conectar

- Menos de 2 marcas visibles con el mismo `segmentId`
- Pares de `segmentId` distintos aunque mismo archivo o mismo `title`
- Marcas filtradas (`filters.manuscript` off, etc.) — si una marca del par no está en `placed`, no hay link
- Pares en **`lane` distinto** aunque compartan `segmentId` (no debería ocurrir en datos normales) — **no conectar**

---

## 5. Diseño visual — formato del boceto, métricas del timeline actual

> **Principio:** el boceto fija el **formato** (archivo arriba, evento abajo, vástago, conector). **No** fija px, tamaños de fuente ni altura de caja. Toda métrica se **extiende** desde [`timelineGraphics.tsx`](../../../src/modules/timeline/timelineGraphics.tsx) y el chip simple de hoy.

### 5.0 Referencia actual (chip simple — no cambiar estilo base)

| Token / patrón | Valor hoy | Uso en dual |
|----------------|-----------|-------------|
| `BOX_HEIGHT` | 28 | Altura chip una línea; base para calcular dual |
| `BOX_RX` | 6 | Igual en dual |
| Label chip | `text-[11px]`, `--timeline-chip-text`, centrado en `y + BOX_HEIGHT/2 + 4` | Línea **principal** (evento) — **misma** clase/peso |
| Texto secundario timeline | `fontSize={10}`, `--timeline-date` (vástagos, ticks) | Línea **secundaria** (archivo) — misma jerarquía que fechas del eje |
| Borde / fondo / hover | `--timeline-chip-*`, highlight `--primary` | Sin cambios |
| Truncado | 22 chars + `…` | Igual por línea; ancho = `max()` de ambas |

### 5.1 Chip dual — qué integrar del boceto

| Capa boceto | Implementación (consistente con §5.0) |
|-------------|----------------------------------------|
| **Formato** | Dos líneas apiladas en la **misma caja** redondeada que hoy |
| Archivo (arriba) | Texto **secundario**: `fontSize={10}`, `fill="var(--timeline-date)"` (o `timeline-chip-text` con opacidad equivalente al resto del timeline) |
| Evento (abajo) | Texto **principal**: mismas clases que el `<text>` actual de `TimelineChip` (`11px`, `--timeline-chip-text`, `font-medium` si highlight) |
| Altura caja | **`chipHeight(item)`** derivada, no constante del boceto: padding vertical simétrico al chip simple + segunda línea + separación mínima entre líneas |
| Posición Y del texto | Calcular desde `item.y` + padding; **no** coordenadas fijas del dibujo |

**Fórmula recomendada** (centralizar en `timelineGraphics.tsx`):

```typescript
// Derivar del chip simple existente
const CHIP_PAD_Y = (BOX_HEIGHT - 11) / 2;        // ~8.5 — mismo aire vertical que hoy
const CHIP_SECONDARY_SIZE = 10;                    // alineado con --timeline-date en vástagos
const CHIP_PRIMARY_SIZE = 11;                      // label actual
const CHIP_LINE_GAP = 4;                           // separación entre líneas (proporcional al pad)

export function chipHeight(item: { eventLabel?: string | null }): number {
  if (!item.eventLabel) return BOX_HEIGHT;
  return Math.round(
    CHIP_PAD_Y * 2 + CHIP_SECONDARY_SIZE + CHIP_LINE_GAP + CHIP_PRIMARY_SIZE,
  );
}

export function chipTextAnchors(itemY: number, dual: boolean) {
  if (!dual) {
    return { primaryY: itemY + BOX_HEIGHT / 2 + 4 };
  }
  const h = chipHeight({ eventLabel: "x" });
  const secondaryY = itemY + CHIP_PAD_Y + CHIP_SECONDARY_SIZE - 1;
  const primaryY = itemY + h - CHIP_PAD_Y - 2;
  return { secondaryY, primaryY };
}
```

> Los números resultantes (~42px alto, 10/11px) son **consecuencia** del sistema actual, no objetivos del boceto. Si en QA el pad se siente apretado, ajustar solo `CHIP_LINE_GAP` / `CHIP_PAD_Y` manteniendo la referencia al chip simple.

### 5.2 Vástago (`TimelineEventStem`)

- Usar `chipHeight(item)` en lugar de `BOX_HEIGHT` fijo para `boxBottom` / `eventBoxTop`.
- **Manuscrito** (`lane: "manuscript"`): vástago desde **borde inferior** de la caja hacia el eje (↓) — comportamiento actual, extendido a caja dual.
- **Banda inferior** (`lane: "below"`): vástago desde eje hacia **borde superior** de la caja (↑) — sin invertir la regla de layout existente.
- Sin cambiar estilo de trazo (`STEM_WIDTH`, `--timeline-stem`).

### 5.3 Conector entre marcas (v1 implementado — ver FIX-009a)

| Aspecto | v1 (código actual) | Objetivo [FIX-009a](FIX-009a-timeline-connector-edge-anchors.md) |
|---------|-------------------|------------------------------------------------------------------|
| Ámbito | Mismo `segmentId` + `lane`; orden **cronológico** | Igual |
| Anclas v1 | Centro borde inf./sup. del chip (`linkAnchorForItem`) | **Mitad del borde lateral** (der.→izq. o izq.→der.) |
| Geometría | Segmento recto diagonal | Segmento recto borde a borde; fallback vertical si misma X |
| Estilo | `--timeline-stem`, `STEM_WIDTH` | Igual |
| Cruce eje | Prohibido | Igual |
| z-order | eje → ticks → conectores → vástagos → chips | Igual |
| Densidad alta | Riesgo líneas ilegibles | 009a mejora; routing ortogonal = backlog |

**Regla de borde (usuario):** si la línea sale hacia la derecha, origen = **punto medio del borde derecho** del chip origen; destino = **punto medio del borde izquierdo** del chip siguiente (y viceversa en flashback hacia la izquierda).

### 5.4 Ancho estimado (v1 — ver FIX-009a)

v1 usa `estimateLabelWidth`: **min 72px**, `length * 7 + 20` → chips más anchos que el texto (QA captura jun 2026).

**FIX-009a** replantea: ancho = texto **truncado visible** + padding mínimo (`CHIP_PAD_X` 8), sin piso 72; límites 14/18 chars; módulo compartido `timelineChipMetrics`. Ver [FIX-009a §5](FIX-009a-timeline-connector-edge-anchors.md).

---

## 6. Diseño técnico — modelo y links

### 6.1 Extender `TimelineDisplayItem`

Archivo: [`timelineModel.ts`](../../../src/modules/timeline/timelineModel.ts)

```typescript
export interface TimelineDisplayItem {
  id: string;
  kind: TimelineItemKind;
  label: string;              // aria / fallback
  fileLabel: string;
  eventLabel: string | null;  // null → chip simple
  segmentId: string | null;
  sortKey: bigint;
  path?: string;
  blockIndex?: number;
  lane: "manuscript" | "below";
  tagKind?: string | null;
  charOffset?: number | null;
  annualKind?: "birthday" | "cosmic";
}
```

En `buildTimelineItems`, copiar desde `TimelineEvent`:

- `fileLabel`, `eventLabel`, `segmentId`, `tagKind`, `charOffset`
- `label` compuesto (§5.4)

Ítems `annual` → `fileLabel = label`, `eventLabel = null`, `segmentId = null`.

### 6.2 `buildEventSpanLinks`

```typescript
export interface EventSpanLink {
  segmentId: string;
  fromId: string;
  toId: string;
}

export function buildEventSpanLinks(
  placed: PlacedTimelineItem[],
  showLinks: boolean,
): EventSpanLink[] { … }

export function anchorForLinkEndpoint(
  item: PlacedTimelineItem,
  role: "from" | "to",
): { x: number; y: number } { … }
```

Algoritmo `buildEventSpanLinks`:

1. Si `!showLinks` → `[]`
2. Filtrar `placed` con `segmentId != null`
3. Agrupar por **`segmentId` + `lane`** (clave compuesta — evita cruce de bandas)
4. Ordenar cada grupo por `sortKey`, luego `tagKind`, luego `charOffset`
5. Para `i = 0 … n-2`, emitir `{ fromId, toId, segmentId }` solo si `group[i].lane === group[i+1].lane`

`anchorForLinkEndpoint(item, role)` — anclas según banda:

```typescript
// manuscript: from = bottom-center, to = top-center
// below:      from = top-center,    to = bottom-center
const h = chipHeight(item);
const top = { x: item.x, y: item.y };
const bottom = { x: item.x, y: item.y + h };
if (item.lane === "manuscript") {
  return role === "from" ? bottom : top;
}
return role === "from" ? top : bottom;
```

### 6.3 Componente SVG

Nuevo en [`timelineGraphics.tsx`](../../../src/modules/timeline/timelineGraphics.tsx):

```typescript
export function TimelineEventLink({ from, to }: { from: {x,y}; to: {x,y} }) {
  return (
    <line
      x1={from.x} y1={from.y} x2={to.x} y2={to.y}
      stroke="var(--timeline-stem)"
      strokeWidth={STEM_WIDTH}
      pointerEvents="none"
    />
  );
}
```

Refactor `TimelineChip` → aceptar `fileLabel` / `eventLabel`; export `chipHeight(item)`.

---

## 7. Filtro store y panel

### 7.1 Store

Archivo: [`useTimelineStore.ts`](../../../src/stores/useTimelineStore.ts)

**Decisión D2:** campo separado (no mezclar con filtros de categoría):

```typescript
showEventConnectors: boolean;  // default true
setShowEventConnectors: (show: boolean) => void;
```

Alternativa aceptable: `filters.eventConnectors` + `toggleFilter("eventConnectors")` — elegir una y documentar en PR.

### 7.2 UI

| Archivo | Cambio |
|---------|--------|
| [`TimelineFiltersSection.tsx`](../../../src/components/workspace-ui/TimelineFiltersSection.tsx) | Checkbox bajo «Manuscrito» / sección filtros |
| [`TimelineSidePanel.tsx`](../../../src/modules/timeline/TimelineSidePanel.tsx) | Pasar `showEventConnectors`, `setShowEventConnectors`, label |
| `src/i18n/es/timeline.json` | `"filters.eventConnectors": "Mostrar conectores de evento"` |
| `src/i18n/en/timeline.json` | `"Show event connectors"` |

---

## 8. Integración por superficie

### 8.1 `TimelineHorizontal.tsx` (principal)

1. Tras `placed` en layout memo, calcular links:  
   `buildEventSpanLinks(placed, showEventConnectors)`
2. Resolver anclas con mapa `id → PositionedItem`
3. Render SVG (orden):
   - … eje existente …
   - `<g className="timeline-event-links">` con links
   - vástagos (pasar altura chip)
   - chips
4. Sustituir `estimateLabelWidth(entry.item.label)` por `estimateChipWidth(entry.item)` al construir `width`
5. Revisar **`MANUSCRIPT_LANE_STEP`** (solo banda superior): si `chipHeight(dual) - BOX_HEIGHT` supera el aire entre carriles hoy, incrementar el step proporcionalmente. **`BELOW_LANE_HEIGHT`** igual criterio si hay dual en banda inferior.

### 8.2 `TimeTagMiniTimeline.tsx` (secundario)

| Elemento | v1 |
|----------|-----|
| `TimelineChip` preview | Dual si `eventLabel` en item preview |
| Arcos | **Omitir** (espacio + ruido) |
| Hover overlay | Mostrar `eventLabel` + `fileLabel` si dual |

Obtener título evento para preview: el draft edita un bloque concreto — usar `events` del bloque activo + `segmentId` si está disponible en metadata del draft (ya hay contexto evento en editor).

### 8.3 Calendario

Sin cambios obligatorios. Nota en backlog: calendario ya usa `title`; chip dual en celdas = tarea futura.

---

## 9. Decisiones cerradas

| ID | Decisión |
|----|----------|
| **D1** | z-order: conectores **debajo** de vástagos y chips |
| **D2** | Toggle conectores: `showEventConnectors` default **true** |
| **D3** | Agrupación conectores: **`segmentId` + `lane`**, no por path ni title |
| **D4** | Chip dual solo si `segmentId && eventLabel` |
| **D5** | Sin cambios Rust/DB |
| **D6** | Paleta: solo tokens timeline existentes |
| **D11** | **Métricas del chip dual derivadas del chip simple** (`BOX_HEIGHT`, label 11px, fecha 10px); boceto = formato, no px literales |
| **D12** | **Dos bandas fijas:** manuscrito arriba del eje, WB/anuales abajo; conectores no cruzan el eje |
| **D13** | v1 conectores globales = orden **cronológico**; orden **escritura** = [FIX-009b](FIX-009b-timeline-writing-order-links.md) |
| **D14** | Anclas conector = **mitad del borde lateral**, no centro del rect → [FIX-009a](FIX-009a-timeline-connector-edge-anchors.md) |
| **D7** | Conectores solo entre marcas **visibles** en viewport actual |
| **D8** | Orden intra-segmento = SQL (sortKey → bar → inline → offset) |
| **D9** | Mini timeline: chip dual sí, arcos no en v1 |
| **D10** | `label` legacy compuesto para accesibilidad |

---

## 10. Plan de implementación por fases

### Fase 0 — Modelo + tests (sin UI)

- [x] Extender `TimelineDisplayItem` + `buildTimelineItems`
- [x] `estimateChipWidth`, `chipHeight`
- [x] `buildEventSpanLinks`, `anchorForLinkEndpoint` → v1 `linkAnchorForItem` (reemplazar en 009a)
- [x] `timelineModel.test.ts` (8 tests)

### Fase 1 — Chip dual + vástago

- [x] Refactor `TimelineChip` dual/simple
- [x] `TimelineEventStem` + `chipHeight`
- [x] Helpers en `timelineGraphics.tsx`

### Fase 2 — Conectores en horizontal

- [x] `TimelineEventLink` + integración `TimelineHorizontal`
- [ ] **FIX-009a:** `linkEdgeAnchors` borde lateral

### Fase 3 — Filtro panel

- [x] `showEventConnectors` + checkbox + i18n

### Fase 4 — Mini timeline + regresión

- [x] Preview chip dual `TimeTagMiniTimeline`
- [x] `npm test` (137) + build OK

### Fase 5 — QA cierre FIX-009

- [x] Smoke `session-1781319870943-19224` — chips OK; conectores mejorables
- [ ] QA post-009a §11 completo
- [ ] `implementation-plan.md` → FIX-009 ✅ (tras 009a)

---

## 11. Verificación manual

| # | Acción | Esperado |
|---|--------|----------|
| R1 | Proyecto con `meow` + evento `eventTest` en d17 y d18 | Ambos chips: `meow` pequeño arriba, `eventTest` abajo |
| R2 | Mismo caso | Conector diagonal entre marcas (filtro ON) |
| R3 | Desactivar «Mostrar conectores de evento» | Conectores ocultos; chips dual visibles |
| R4 | Marca tiempo en cabecera sin segmento | Chip simple (solo archivo/título único) |
| R5 | Mismo archivo, dos segmentos (`seg::0`, `seg::1`) | Sin conector entre segmentos distintos |
| R6 | Zoom mes / día / horas | Legible; sin solapamiento crítico chips/conectores |
| R7 | Clic chip | Abre manuscrito (`openItem` sin regresión) |
| R8 | Filtro Manuscrito OFF | Marcas manuscrito + conectores banda superior no aparecen; anuales/WB abajo sin regresión |
| R9 | Tema claro / oscuro | Contraste OK en línea secundaria y conector |
| R10 | Vista con anuales + manuscrito mismo zoom | Manuscrito **solo arriba** del eje; festividades/anuales **solo abajo**; conector no atraviesa el eje |

**Datos de prueba sugeridos:** `Manuscrito/.../meow.md` con YAML `event: eventTest` y dos marcas `time` (bar + inline o dos inline).

---

## 12. Riesgos y mitigaciones

| Riesgo | Nivel | Mitigación |
|--------|-------|------------|
| Solapamiento SVG en zoom denso | Medio | `assignLanes` con ancho dual; subir `MANUSCRIPT_LANE_STEP` según delta `chipHeight - BOX_HEIGHT` |
| Conectores cruzan chips ajenos | Medio | FIX-009a anclas lateral; routing futuro |
| Muchas marcas mismo evento | **Alto** | 009a + posible polilínea; 009b solo 1 link hover |
| Evento sin `title` en YAML | Bajo | Chip simple (D4) |
| Regresión ancho eje / collapse | Medio | Probar `collapseDeadTime` ON |
| Mini timeline alto fijo | Bajo | `chipHeight` en layout preview |

---

## 13. Archivos probables

| Archivo | Cambio |
|---------|--------|
| `src/modules/timeline/timelineModel.ts` | Campos, `buildEventSpanLinks`, `estimateChipWidth` |
| `src/modules/timeline/timelineModel.test.ts` | **Nuevo** |
| `src/modules/timeline/timelineGraphics.tsx` | Chip dual, `TimelineEventLink`, `chipHeight` |
| `src/modules/timeline/TimelineHorizontal.tsx` | Links, widths, z-order |
| `src/stores/useTimelineStore.ts` | `showEventConnectors` |
| `src/components/workspace-ui/TimelineFiltersSection.tsx` | Checkbox |
| `src/modules/timeline/TimelineSidePanel.tsx` | Props filtro |
| `src/i18n/es/timeline.json` | Cadenas |
| `src/i18n/en/timeline.json` | Cadenas |
| `src/modules/editor/sidePanel/TimeTagMiniTimeline.tsx` | Chip preview dual |
| `src/styles/globals.css` | Solo si hace falta token derivado (opcional) |

**Sin tocar:** `src-tauri/src/timeline/project.rs`, schema DB.

---

## 14. Diagrama de flujo (render)

```mermaid
flowchart TB
  subgraph data [Datos]
    EV[TimelineEvent[] IPC]
    BI[buildTimelineItems]
    PL[placed PositionedItem[]]
    LK[buildEventSpanLinks]
  end
  subgraph svg [SVG TimelineHorizontal]
    AX[eje y ticks]
    LN[TimelineEventLink]
    ST[TimelineEventStem]
    CH[TimelineChip]
  end
  EV --> BI --> PL
  PL --> LK
  AX --> LN --> ST --> CH
  PL --> ST
  PL --> CH
  F[showEventConnectors] --> LK
```

---

## 15. Checklist de cierre

```
[x] Fase 0–4 — implementación v1
[ ] FIX-009a — anclas borde lateral
[ ] Fase 5 — QA §11 post-009a
[ ] implementation-plan.md → FIX-009 ✅
```

---

## 17. FIX-009a — Anclas en borde lateral (cierre visual)

Plan detallado: **[FIX-009a-timeline-connector-edge-anchors.md](FIX-009a-timeline-connector-edge-anchors.md)**

Resumen:
1. **`linkEdgeAnchors`** — mitad del borde lateral (der.→izq. / flashback invertido).
2. **Ancho autoajustado** — quitar min 72px; `timelineChipMetrics` con truncado 14/18 chars + `CHIP_PAD_X` 8.

**Bloquea cierre ✅ de FIX-009.**

---

## 18. FIX-009b — Hover «siguiente en orden de escritura» (tarea posterior)

Plan detallado: **[FIX-009b-timeline-writing-order-links.md](FIX-009b-timeline-writing-order-links.md)**

Resumen:
- Hover en chip → resaltar + **una** línea a la **siguiente** marca del mismo evento en orden de **escritura** (árbol manuscrito manual + bar → inline → offset), **no** cronológico.
- Ejemplo: hover día **22** → enlace a flashback día **10** si se escribió después.
- Toggle panel independiente: «Mostrar siguiente enlace al pasar el cursor».
- **Implementar después de FIX-009a.**

---

## 16. Registro de cambios del plan

| Fecha | Cambio |
|-------|--------|
| 2026-06-11 | Plan redactado: auditoría código + docs, boceto usuario, fases 0–5, decisiones D1–D10 |
| 2026-06-11 | §5 replanteado: formato del boceto (dos líneas + conector); métricas derivadas del chip timeline actual (D11), no px del dibujo |
| 2026-06-11 | §3.3.1 + diagrama §1.1: layout **dos bandas** (manuscrito arriba, WB/anuales abajo); conectores por `segmentId` + `lane` (D12) |
| 2026-06-11 | **v1 implementado:** chip dual, links cronológicos, filtro conectores, 137 tests |
| 2026-06-11 | QA `session-1781319870943`: chips OK; plan **FIX-009a** (anclas borde) + **FIX-009b** (hover orden escritura) |

---

**Última actualización:** 2026-06-11 · **Estado:** 🔄 v1 OK — pendiente FIX-009a · **Siguiente:** [FIX-009a](FIX-009a-timeline-connector-edge-anchors.md)
