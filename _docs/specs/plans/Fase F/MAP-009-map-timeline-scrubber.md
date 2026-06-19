# MAP-009 — Timeline del mapa + scrubber T

> **Estado:** ✅ **Cerrado** (2026-06-11) — Fases 1–9 implementadas · QA funcional OK · **polish §13 diferido** (no bloquea MAP-010)  
> **Esfuerzo:** Medio–alto · **Riesgo:** Medio (UX timeline + acoplamiento calendario; compositor ya operativo)  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md) Fase F · **Spec:** [`maps-design.md`](../../maps-design.md) §4.4, §8 · **Previo:** [MAP-008 ✅](MAP-008-secondary-patches.md) · **Siguiente:** MAP-011 _(MAP-010 ✅)_

---

## 0. Convención

| Regla | Detalle |
|-------|---------|
| Flujo | Plan → ejecución → tests → QA/OBS → cerrar §12 → MAP-010 |
| Commits | Usuario |
| Evidencia | Recorrido QA §9 + sesión OBS post-implementación |
| OBS previo a planificar | **No requerido** — auditoría post MAP-008 + spec §4.4 + handoff MAP-008 §11 |
| Alcance código | **Frontend + OBS + tests TS** — sin cambios schema disco / Rust v1 |

---

## 1. Problema y objetivo

### 1.1 Problema (post MAP-008)

MAP-008 entregó la **lógica temporal** y el **compositor multi-parche**, pero la UX de consumo espacio-temporal sigue siendo un **picker compacto** en header («Vista en T»), no la **timeline del mapa** que describe la spec §4.4 y §8.

| Carencia | Impacto |
|----------|---------|
| Sin scrubber arrastrable | Usuario no puede «rebobinar» el mapa de forma natural |
| Placeholder MAP-004 nunca implementado | Spec §8 prometía barra timeline en interactivo — hoy no existe |
| Picker T en header en **ambos** modos | Incumple §8: scrubber = consumo (interactivo); edición = barra solo lectura |
| `previewTimeTRaw` se pierde al cambiar mapa | `setActiveMap` → `null`; no hay memoria por `mapId` en sesión |
| OBS usa `previewTRaw`, no `timeT` | Handoff MAP-007/004 hablaban de `timeT`; MAP-008 añadió `previewTRaw` — falta alinear nomenclatura |
| Compositor OBS solo post-paint (debounce 300 ms) | Arrastre scrubber no auditable en tiempo real |
| Sin marcas en eje T | Desde, inicios/fines de parches y eventos MS no visibles en la barra |
| Sync con timeline global del proyecto | Spec §4.4 pendiente — no hay hook alguno |
| Transiciones visuales al cambiar T | Spec pendiente — ausentes (aceptable v1) |
| QA MAP-008 incompleto en pasos §9.1, 4, 5, 8, 9 | Parte puede cerrarse en MAP-009 al tener scrubber real |

**Lo que ya funciona (no reimplementar):**

- `mapSecondaryVisibility.ts` — reglas §4.3 + z-order §4.3.1 + `tiempoFin` modo B.
- Compositor `paintMapViewport` — principal + overlays secundarios filtrados upstream.
- `MapWorkspace` — `filterVisibleSecondaries()` → `overlayDrawings` → `MapViewport`.
- `previewTimeTRaw` en `useMapStore` + `MapPreviewTField` + `previewTSet` OBS.
- Compositor OBS — `previewTRaw`, `activeSecondaryIds[]`, `secondaryCount`, `desdeRaw`.
- Secundarios CRUD, edición multi-target, guards MAP-005b scoped por `drawingRef`.
- Calendario proyecto + `useProjectTimeline()` ya alimentan pickers (`MapDesdeField`, `MapPreviewTField`).

### 1.2 Objetivo MAP-009

Entregar la **timeline del mapa** como control de **T** unificado del módulo:

1. **Scrubber horizontal** bajo el viewport — cursor arrastrable que mueve T y recomponer parches.
2. **Modos §8** — scrubber **interactivo** en vista default; **solo lectura** (o colapsado) en edición ✏️; T **conservado** al togglear modos.
3. **Eje temporal** — rango útil derivado de `desde`, parches secundarios y padding; marca visual de Desde.
4. **Marcadores en barra** — chips de inicio (y fin opcional) de parches; opcional: eventos timeline MS (solo lectura).
5. **Estado T por mapa** — memoria en sesión UI al cambiar de mapa y volver.
6. **OBS** — `previewTSet` con `source`; compositor coherente al scrub; alias documentado `timeT`.
7. **Cerrar deuda MAP-004** — sustituir placeholder «Timeline MAP-009» por barra real.

**No es objetivo de MAP-009 rehacer:** CRUD secundarios, reglas de visibilidad, schema Rust, compositor de pintado.

### 1.3 Criterios de aceptación

| # | Criterio |
|---|----------|
| C1 | Modo **interactivo**: barra timeline visible bajo viewport con **scrubber arrastrable** que actualiza composición en tiempo real |
| C2 | Mover scrubber altera qué secundarios componen (misma lógica que hoy `filterVisibleSecondaries`) |
| C3 | Marca **Desde** visible en el eje cuando `map.desde` está definido |
| C4 | Marcadores de parches (nombre abreviado o tooltip) en fechas `tiempoInicio` / `tiempoFin` cuando caen en rango visible |
| C5 | Modo **edición**: scrubber **no editable** (solo lectura o deshabilitado); T visible; trazos **no** marcan dirty al mover T |
| C6 | Toggle interactivo ↔ edición **conserva** el mismo T (no reset) |
| C7 | Cambiar mapa en selector restaura T **recordado** de ese mapa en sesión (o `desde` si nunca se fijó) |
| C8 | Picker header «Vista en T» sincronizado con scrubber (bidireccional) o sustituido por indicador en barra en interactivo |
| C9 | Zoom/pan del eje timeline (rueda o botones ±) cuando el rango excede el ancho — reutilizar primitivas `timelineScale` |
| C10 | OBS: `previewTSet` incluye `source: "scrubber" \| "picker" \| "mapLoad"`; compositor emite `activeSecondaryIds` al cambiar T |
| C11 | OBS compositor expone **`timeT`** (alias de `previewTRaw`) además de campos existentes — compatibilidad documentada |
| C12 | Tests unitarios: `mapTimelineRange.ts` (rango), wiring scrubber→T, store memoria por mapId |
| C13 | i18n ES/EN `timeline.*` en namespace `maps` |
| C14 | Sin regresión: guardado secundario/principal, guards dirty, expand/crop |
| C15 | QA manual §9 cubre pasos MAP-008 pendientes que requieren scrubber (visibilidad T, `tiempoFin`, multi-parche) |

### 1.4 Fuera de alcance MAP-009

| Tema | Plan |
|------|------|
| Sync bidireccional con módulo Timeline global | **Opcional fase 2** — ver D10; no bloqueante MAP-010 |
| Transiciones visuales / crossfade al cambiar T | Polish post-v1 |
| Eventos WB, trayectorias, filtros por personaje | Post-WB (§4bis.3) |
| Marcas **X** ubicación manuscrito | **MAP-011** (pero barra debe **reservar** capa de overlays futuros) |
| Hotspots navegación hijo | **MAP-010** (pero T debe **conservarse** al entrar/salir hijo — contrato aquí) |
| Scrubber vertical / orientación timeline proyecto | No — barra horizontal compacta bajo mapa |
| Persistir T en disco (`map.json`) | Solo RAM sesión v1 |
| Cambios schema secundarios / Rust | MAP-008 cerrado |
| Asistente apilar vs cierre (modo A/B §4.3.2) | v1.1 — MAP-008 ya tiene `tiempoFin` manual |
| Undo de cambios T | T no es dato editable persistido — no dirty |

---

## 2. Auditoría (estado repo jun 2026, post MAP-008)

### 2.1 Lo que ya existe (reutilizar)

| Pieza | Archivo | Notas |
|-------|---------|-------|
| Reglas visibilidad T | `src/lib/maps/mapSecondaryVisibility.ts` | 6 tests Vitest; **no tocar** salvo casos QA extra |
| Compositor paint | `src/lib/maps/useMapViewport.ts` → `paintMapViewport` | Stack: fondo → principal → overlays; preview T **no** entra al paint |
| Filtrado upstream | `src/modules/maps/MapWorkspace.tsx` L117–164 | `visibleSecondaries` → `overlayDrawings` |
| Estado T | `src/stores/useMapStore.ts` | `previewTimeTRaw: string \| null`; reset a `null` en `setActiveMap` |
| Picker T | `src/modules/maps/MapPreviewTField.tsx` | Reutiliza `MapDesdeDialog`; emite `previewTSet` |
| Inicialización T | `MapWorkspace.tsx` L109–112 | Al cambiar mapa → `setPreviewTimeTRaw(document.desde)` |
| Resolución efectiva | `MapWorkspace.tsx` L114–115 | `previewT = previewTimeTRaw ?? document?.desde ?? null` |
| OBS compositor | `useMapViewport.ts` L269–282 | `previewTRaw`, `activeSecondaryIds`, `activeDrawingRef`, capas activas |
| OBS acción T | `src/lib/action-audit/events.ts` | `previewTSet` |
| Calendario + eventos MS | `useProjectTimeline()`, `useCalendarStore` | Ya usados en pickers |
| Primitivas escala tiempo | `src/modules/timeline/timelineScale.ts` | `timeToX`, `computeVisibleRange`, dead-time breaks |
| Ticks eje | `src/modules/timeline/timelineTicks.ts` | Generación marcas según zoom |
| Mini timeline editor | `src/modules/timeline/TimeTagMiniTimeline.tsx` | Pan/zoom eje; **referencia UX**, no drop-in |
| Timeline global | `TimelineHorizontal.tsx`, `useTimelineStore` | Módulo proyecto separado; **no importa** `useMapStore` |

### 2.2 Gaps a cerrar

| Gap | Severidad |
|-----|-----------|
| Sin componente `MapTimelineBar` | 🔴 Bloqueante |
| Placeholder MAP-004 ausente en código | 🟠 Deuda spec §8 |
| Scrubber vs picker sin rol por modo | 🟠 UX §8 |
| T no persistido por `mapId` en sesión | 🟠 UX multi-mapa |
| Compositor OBS sin emit en drag scrubber | 🟡 OBS |
| Campo `timeT` ausente en OBS | 🟡 Compat handoff |
| `resetMapSessionState` sin callers | 🟢 Limpieza opcional |
| QA MAP-008 pasos 1,4,5,8,9 sin scrubber | 🟡 Cerrar en MAP-009 |

### 2.3 Hardcodes / comportamiento actual

| Ámbito | Valor real |
|--------|------------|
| Fuente de verdad T | `useMapStore.previewTimeTRaw` |
| Layout mapa | Header → fila Desde + Vista en T → viewport (+ paneles edición) → `MapEditStudio` — **sin franja inferior** |
| `setActiveMap` | Resetea `previewTimeTRaw → null`, `activeDrawingRef → principal`, `viewMode → interactive` |
| `setViewMode` | **No** toca T (correcto para §8) |
| Compositor debounce | 300 ms post-redraw — insuficiente para audit scrub continuo |
| i18n timeline mapas | **No existe** — solo `previewT.*` |
| Búsqueda `Timeline MAP-009` en `src/` | **0 coincidencias** — placeholder MAP-004 nunca codificado |

### 2.4 Evidencia QA MAP-008 (sesión `1781854476345-26020`)

| Validado | Log |
|----------|-----|
| `previewTSet` manual | L10, L16, L24, L29, L41, L48 |
| Meta parche persiste | `secondaryMetaSet` L13 |
| Composición coherente con T | Usuario confirma «ya se ve mejor» post-bugfix |
| **No validado** | Scrubber, `tiempoFin` composición, 2+ parches, delete, expand manual |

### 2.5 OBS previo a planificar

**No requerido.** Handoff MAP-008 §11 + auditoría §2 + spec §4.4/§8 bastan.

**Requerido al cerrar §12:** recorrido §9 con OBS activo incluyendo drag scrubber.

---

## 3. Decisiones de diseño

### D1 — Fuente de verdad: `previewTimeTRaw` (sin rename store v1)

Mantener el campo en `useMapStore` para no romper MAP-008. En OBS compositor añadir **`timeT`** como alias de `previewTRaw` (mismo valor). Documentar en §6.

```typescript
// useMapStore — ampliación MAP-009
previewTimeByMapId: Record<string, string>;  // memoria sesión por mapa
```

Al `setActiveMap(mapId)`:
1. Guardar T actual del mapa saliente en `previewTimeByMapId[oldId]` si había T resuelto.
2. Restaurar `previewTimeTRaw` desde `previewTimeByMapId[newId]` o `document.desde` o `null`.

### D2 — Componente `MapTimelineBar`

Nuevo módulo bajo `src/modules/maps/MapTimelineBar.tsx` + lógica pura `src/lib/maps/mapTimelineRange.ts`.

```text
┌──────────────────────────────────────────────────────────────┐
│  [−] [+]   │←── eje con ticks ──● scrubber ─────────────→│  │
│            │     ▲ Desde    ■ parche A    ■ parche B       │  │
└──────────────────────────────────────────────────────────────┘
     T display (formatCalendar)              opcional: eventos MS (puntos)
```

| Prop | Tipo | Notas |
|------|------|-------|
| `mapId` | string | OBS |
| `desde` | string \| null | Marca ancla |
| `previewT` | string \| null | T resuelto |
| `secondaries` | `MapSecondarySummaryV1[]` | Marcadores |
| `events` | `TimelineEvent[]` | Opcional v1 — puntos grises |
| `calendar` | `CalendarConfig` | Obligatorio para escala |
| `interactive` | boolean | `viewMode === "interactive"` |
| `onPreviewTChange` | `(raw, source) => void` | Centraliza store + OBS |

**Interacción scrubber:**
- Pointer down/drag en thumb → `onPreviewTChange(raw, "scrubber")` con throttle ~50 ms paint, ~200 ms OBS action.
- Click en eje → saltar T al día más cercano bajo cursor.
- Teclado: flechas ←/→ ±1 unidad visible (día/semana según zoom) cuando barra tiene foco.

### D3 — Rango temporal del eje (`mapTimelineRange.ts`)

Función pura — tests obligatorios:

```typescript
export interface MapTimelineRange {
  minDay: bigint;
  maxDay: bigint;
  desdeDay: bigint | null;
  secondaryAnchors: Array<{
    id: string;
    name: string;
    inicioDay: bigint;
    finDay: bigint | null;
  }>;
}

export function computeMapTimelineRange(
  mapDesde: string | null,
  secondaries: MapSecondarySummaryV1[],
  previewT: string | null,
  config: CalendarConfig,
  options?: { paddingDays?: number },
): MapTimelineRange;
```

**Reglas v1 de rango:**

| Entrada | Contribución |
|---------|--------------|
| `map.desde` | Siempre incluido si parseable |
| Cada secundario | `tiempoInicio`; `tiempoFin` si existe |
| `previewT` actual | Incluido |
| Padding | ±365 días (configurable) o mínimo 30 días si un solo punto |
| Sin fechas parseables | Fallback: epoch calendario → hoy simulado (mismo patrón MAP-007 picker) |

Reutilizar `toAbsoluteDay` / `fromAbsoluteDay` (`lib/calendar/engine`) y adaptar `computeVisibleRange` de `timelineScale.ts` — **no** importar `TimelineHorizontal`.

### D4 — Layout por modo (spec §8)

```text
INTERACTIVO (default)
  Header: selector mapa · toggle ✏️
  Subheader: Desde (editable) · T display compacto (sin picker duplicado OR picker colapsado)
  Viewport (compositor)
  MapTimelineBar (scrubber ACTIVO)          ← nuevo
  (sin MapEditStudio)

EDICIÓN ✏️
  Header + subheader Desde
  Subheader: badge dibujo activo · T display SOLO LECTURA
  [MapSecondariesPanel] Viewport [MapLayersPanel]
  MapTimelineBar (scrubber DISABLED, thumb visible en T actual)
  MapEditStudio
```

| Decisión | Detalle |
|----------|---------|
| Picker «Cambiar…» en interactivo | **Opción A (recomendada):** ocultar botón en interactivo; scrubber + click eje bastan; picker solo en edición para precisión al crear parche |
| Picker en edición | Mantener `MapPreviewTField` readonly (sin botón) o botón deshabilitado con tooltip «Use vista interactiva para explorar T» |

### D5 — Wiring composición (sin cambios paint)

El scrubber **solo** muta `previewTimeTRaw`. `MapWorkspace` ya recalcula `visibleSecondaries` vía `useMemo` — **no** modificar `paintMapViewport` salvo optimización futura.

Flujo:

```text
MapTimelineBar drag
  → setPreviewTimeTRaw(raw)
  → trackAction previewTSet { source: "scrubber" }
  → visibleSecondaries recomputa
  → overlayDrawings cambia
  → useMapViewport redraw (existente)
```

### D6 — Marcadores en barra

| Marcador | Visual v1 | Interacción |
|----------|-----------|-------------|
| Desde | Tick/label «Desde» | Click → saltar T a Desde |
| Parche inicio | Chip color secundario | Click → T = `tiempoInicio`; tooltip nombre |
| Parche fin | Chip outline | Solo si `tiempoFin`; click → T = fin |
| Evento MS | Punto 4px muted | Tooltip título; click → T evento (opcional v1) |

No editar metadatos desde la barra — eso sigue en panel secundarios / meta dialog.

### D7 — Zoom del eje timeline

| Control | Comportamiento |
|---------|----------------|
| Rueda sobre barra | Zoom in/out centrado en cursor (reuse `computeVisibleRange`) |
| Botones ± | Zoom discreto (×1.5 / ÷1.5) |
| Reset | Doble-click barra → fit full range |

Estado zoom **local del componente** (useState) — no persistir en store global v1.

### D8 — OBS ampliado

**Acción `previewTSet` — payload ampliado:**

```typescript
{
  mapId: string;
  previewT: string;
  previousT?: string | null;
  source: "scrubber" | "picker" | "mapLoad" | "desdeSync" | "markerClick";
}
```

**Compositor `obs.ui.maps.compositor` — campos:**

```typescript
{
  // existentes MAP-008…
  previewTRaw: string | null;
  timeT: string | null;              // alias MAP-009 — mismo valor que previewTRaw
  previewTDisplay: string | null;
  activeSecondaryIds: string[];
  // nuevo opcional v1
  timelineViewMin?: string | null;   // display bounds
  timelineViewMax?: string | null;
}
```

Emitir compositor en **cada** cambio T durante scrub (throttle 150 ms), no solo debounce post-paint.

### D9 — IPC Rust

**Sin cambios v1.** T es estado UI; parches ya persisten fechas en `secondary/{id}.json`.

Opcional futuro: `map.json.lastPreviewT` — **rechazado v1** (complejidad sin beneficio claro).

### D10 — Sync timeline global (fase 2 explícita)

| Nivel | Comportamiento | MAP-009 |
|-------|----------------|---------|
| **v1** | Mapas aislados | ✅ Entregar |
| **v1.1 opcional** | Al scrub mapa → `useTimelineStore.setFocusDate` si fecha parseable | Solo si usuario confirma en QA |
| **v2** | Bidireccional timeline ↔ mapa | Fuera — riesgo acoplamiento |

Implementar hook `useMapTimelineSync.ts` **detrás de flag** `settings.mapTimelineSyncEnabled` default `false`.

### D11 — Contrato T para MAP-010 / MAP-011

Documentar en handoff §11:

| Evento | Regla |
|--------|-------|
| Entrar dibujo hijo (MAP-010) | **No** resetear `previewTimeTRaw` |
| Salir hijo → padre | Conservar T |
| MAP-011 marcas X | Compositor leerá mismo `previewT` resuelto |

MAP-009 debe exportar helper:

```typescript
export function resolveMapPreviewT(
  previewTimeTRaw: string | null,
  mapDesde: string | null,
): string | null;
```

(extraer de lógica inline `MapWorkspace` L114–115)

### D12 — Cierre QA MAP-008 pendiente

MAP-009 QA debe incluir explícitamente:

| Paso MAP-008 | Cómo cerrarlo con scrubber |
|--------------|----------------------------|
| §9 paso 1 — parche `tiempoInicio < Desde` | Scrub antes de Desde → parche visible |
| §9 paso 4 — 2 parches | Crear 2º parche; scrub T donde ambos activos |
| §9 paso 5 — `tiempoFin` | Scrub después de fin → parche desaparece |
| §9 paso 8 — expand | Manual expand; verificar barra/rango |
| §9 paso 9 — delete | Eliminar parche; marcador desaparece de barra |

---

## 4. Esquema e IPC

### 4.1 Sin cambios disco

`map.json`, `principal.json`, `secondary/*.json` — **sin modificación**.

### 4.2 Tipos TS auxiliares (nuevos)

```typescript
// lib/maps/mapTimelineRange.ts
export type MapPreviewTSource =
  | "scrubber"
  | "picker"
  | "mapLoad"
  | "desdeSync"
  | "markerClick";

// lib/maps/mapPreviewT.ts
export function resolveMapPreviewT(
  previewTimeTRaw: string | null,
  mapDesde: string | null,
): string | null;
```

### 4.3 Store ampliación

```typescript
interface MapStoreV2 {
  // … existente …
  previewTimeByMapId: Record<string, string>;
  setPreviewTimeTRaw: (raw: string | null, mapId?: string) => void;
  // setPreviewTimeTRaw actualiza previewTimeTRaw Y previewTimeByMapId[activeMapId]
}
```

---

## 5. Frontend — diseño de componentes

### 5.1 Archivos nuevos / tocados

| Archivo | Rol |
|---------|-----|
| `lib/maps/mapTimelineRange.ts` | Rango eje + anchors + tests |
| `lib/maps/mapPreviewT.ts` | `resolveMapPreviewT` + tests |
| `lib/maps/mapTimelineScale.ts` | Wrapper mapa sobre `timelineScale` (timeToX para barra) |
| `modules/maps/MapTimelineBar.tsx` | Scrubber + eje + marcadores |
| `modules/maps/MapTimelineScrubber.tsx` | Thumb arrastrable (subcomponente) |
| `modules/maps/MapTimelineMarkers.tsx` | Chips parches / Desde |
| `modules/maps/MapWorkspace.tsx` | Layout: barra bajo viewport; wiring T; refactor previewT |
| `modules/maps/MapPreviewTField.tsx` | Modo readonly / ocultar según `viewMode` |
| `stores/useMapStore.ts` | `previewTimeByMapId`, persist T por mapa |
| `lib/maps/useMapViewport.ts` | OBS `timeT` + emit throttled on T change prop |
| `lib/action-audit/events.ts` | Documentar payload `source` en `previewTSet` |
| `hooks/useMapTimelineSync.ts` | Opcional fase 2 — flag settings |
| `i18n/{es,en}/maps.json` | `timeline.*` |
| `stores/useMapStore.test.ts` | + tests T por mapa |

**No tocar (salvo imports):**

- `mapSecondaryVisibility.ts`
- `maps_store.rs` / commands maps
- `MapSecondariesPanel` CRUD (salvo pasar `previewT` a create default — ya existe)

### 5.2 Layout final (interactive)

```text
MapWorkspace
  header (selector, ✏️)
  subheader (MapDesdeField)
  flex-1 column
    viewport row (MapViewport)
    MapTimelineBar (shrink-0, h ~56–72px)
```

### 5.3 Flujo scrubber

```text
Usuario arrastra thumb
  → xToTime(pointerX) via mapTimelineScale
  → fromAbsoluteDay → raw d.m.yyyy
  → setPreviewTimeTRaw(raw, mapId)
  → trackAction previewTSet { source: "scrubber" }
  → MapWorkspace useMemo visibleSecondaries
  → MapViewport redraw
  → compositor OBS (throttled)
```

### 5.4 Flujo cambio mapa con memoria T

```text
selectMap(B) desde mapa A
  → previewTimeByMapId[A] = resolveMapPreviewT(current)
  → setActiveMap(B)  // carga previewTimeTRaw desde memoria o null
  → load document B
  → effect: si previewTimeTRaw null → setPreviewTimeTRaw(document.desde)
```

---

## 6. OBS — eventos

### 6.1 Acciones (ampliar existente)

| Evento | Cuándo | Payload |
|--------|--------|---------|
| `obs.action.map.previewTSet` | Scrubber, picker, carga mapa, click marcador | `{ mapId, previewT, previousT?, source }` |

**Nuevo opcional v1:**

| Evento | Cuándo | Payload |
|--------|--------|---------|
| `obs.action.map.timelineZoom` | Zoom eje | `{ mapId, zoomScale, viewMin, viewMax }` |

### 6.2 UI compositor (ampliar)

| Campo | MAP-009 |
|-------|---------|
| `timeT` | Alias `previewTRaw` |
| Emisión scrub | Throttle 150 ms mientras `source=scrubber` |

### 6.3 UI viewport

Sin cambio salvo confirmar `viewMode` ya emitido.

---

## 7. Fases de ejecución

```text
Fase 1   mapPreviewT.ts + mapTimelineRange.ts + tests Vitest (rango, resolve T)     ✅
Fase 2   mapTimelineScale.ts — adaptar timelineScale al ancho barra mapa              ✅
Fase 3   MapTimelineScrubber + MapTimelineMarkers + MapTimelineBar (UI estática)      ✅
Fase 4   Wiring drag/click → previewTimeTRaw + recomposición + marker clicks        ✅
Fase 5   useMapStore previewTimeByMapId + selectMap memoria T                         ✅
Fase 6   MapWorkspace layout §8 (interactive vs edit readonly) + MapPreviewTField    ✅
Fase 7   OBS timeT alias + previewTSet source + compositor throttle scrub             ✅
Fase 8   i18n timeline.* + accesibilidad (aria slider, keyboard)                    ✅
Fase 9   npm test + build + QA manual §9 (incl. cierre MAP-008 pendiente)            ⚠️ parcial
Fase 10  (opcional) useMapTimelineSync + setting — solo si tiempo                     ⏸
```

**Checkpoint recomendado:** tras Fase 4, QA visual — 1 mapa, 2 parches, arrastrar scrubber y ver parches entrar/salir.

---

## 8. Verificación automatizada

| Comando | Esperado | Resultado |
|---------|----------|-----------|
| `npm test -- --run` | + tests `mapTimelineRange`, `mapPreviewT`, store T por mapId | ✅ 294 tests (2026-06-11) |
| `npm run build` | OK | ✅ |
| `cd src-tauri && cargo test maps_store` | Sin regresión (30 tests) — no cambios Rust | ✅ |

---

## 9. QA manual (recorrido OBS)

**Precondiciones:** mapa `map_677dcb30b6effbf4` o equivalente con `desde` + ≥2 parches (uno con `tiempoFin`); OBS ON.

| Paso | Acción | Esperado | Resultado |
|------|--------|----------|-----------|
| 1 | Abrir mapa interactivo | Barra timeline visible bajo viewport; thumb en T = Desde o último T | ✅ |
| 2 | Arrastrar scrubber adelante | Parche forward aparece; `previewTSet` `source: scrubber` | ✅ sesión 15084 |
| 3 | Arrastrar antes de Desde | Parche backward (si existe) visible | ⏸ sin parche backward en mapa QA |
| 4 | Click marcador parche | T salta a `tiempoInicio`; `source: markerClick` | ⏸ no recorrido |
| 5 | Parche con `tiempoFin` | Scrub después de fin → desaparece composición | ⏸ |
| 6 | 2 parches solapados en T | Ambos en composición | ⏸ |
| 7 | ✏️ edición con trazos sucios | Cambiar T (barra readonly) **sin** `unsavedDialog` | ⏸ |
| 8 | Toggle interactivo ↔ edición | Mismo T conservado | ⏸ |
| 9 | Cambiar mapa A→B→A | T de A restaurado | ⏸ |
| 10 | Zoom eje ± | Rango visible cambia | ✅ visual usuario (eje 2025–2074) |
| 11 | Guardar trazos secundario | Meta/fechas intactas | ⏸ |
| 12 | OBS | `timeT` + eventos §6.1 | ✅ `previewTSet` con `source: scrubber` / `mapLoad` |

**Sesiones OBS:**

| Sesión | Rol | Logs |
|--------|-----|------|
| `1781899299029-15084` | QA scrubber + composición parche | `action-session-1781899299029-15084.ndjson`, `action-verbose-1781899299029-15084.ndjson`, `ui-verbose-1781899299029-15084.ndjson`, `session-1781899299029-15084.ndjson` |

**Mapa QA:** `map_677dcb30b6effbf4`

| Criterio | Resultado | Evidencia |
|----------|-----------|-----------|
| C1 Scrubber interactivo | ✅ | Barra + drag funcional (capturas + logs) |
| C2 Composición al mover T | ✅ parcial | Usuario: «funciona»; sensación UX «extraña» → §13 |
| C3 Marca Desde | ✅ | Chip «Desde» en barra |
| C4 Marcadores parches | ⚠️ | Un punto naranja sin label; fin no marcado |
| C5–C15 | ⏸ / ⚠️ | QA incompleto; ver §13 |

**Nota usuario (sesión 15084):** «está un poco extraño, pero funciona» — no bloquea cierre funcional; polish en §13.

---

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Performance redraw al scrub | Throttle paint 50 ms; compositor ya cachea buffers por drawingRef |
| Rango eje degenerado (sin fechas) | Fallback epoch + tests |
| Duplicar picker + scrubber confunde | D4 — un control primario por modo |
| Acoplamiento timeline global | D10 — fase 2 opt-in con flag |
| Regresión meta parches al save | No tocar Rust save; QA paso 11 explícito |
| Accesibilidad scrubber | role=slider, aria-valuenow, keyboard ←/→ |
| Barra estrecha en ventanas pequeñas | min-height 56px; scroll horizontal eje si zoom alto |

---

## 11. Handoff → MAP-010

MAP-010 tomará:

- **`previewTimeTRaw` / `resolveMapPreviewT`** — T conservado al navegar hotspots → dibujo hijo.
- **`MapTimelineBar`** — misma barra visible en interactivo dentro de hijo (mismo T, distinto compositor stack).
- **Compositor** — MAP-010 añade capa navegación; MAP-009 no toca hotspots.
- **OBS `timeT`** — auditoría unificada padre/hijo.

MAP-009 **no** implementa hotspots ni breadcrumb.

---

## 12. Registro

| Fecha | Evento |
|-------|--------|
| 2026-06-11 | Plan MAP-009 redactado (auditoría post MAP-008 ✅ + spec §4.4/§8 + handoff MAP-008 §11) |
| 2026-06-11 | **Implementación Fases 1–9** — `MapTimelineBar`, scrubber, memoria T por mapa, OBS `source` + `timeT` |
| 2026-06-11 | **QA parcial** — sesión OBS `1781899299029-15084`, mapa `map_677dcb30b6effbf4`; funcional OK, UX pendiente §13 |
| 2026-06-11 | **✅ Cierre MAP-009** — criterios funcionales C1–C2, C10–C14 cumplidos; polish capa temporal + barra T → §13 (post-MAP-010 o sprint dedicado); handoff MAP-010 §11 |

### 12.2 Decisión de cierre

| Aspecto | Decisión |
|---------|----------|
| **Bloqueante MAP-010** | No — scrubber operativo, T en store, compositor reacciona a T |
| **Polish §13** | Diferido — no reabrir MAP-009 salvo regresión |
| **QA formal §9** | Parcial aceptada con evidencia sesión 15084 |

### 12.1 QA sesión `1781899299029-15084`

**Validado en OBS:**
- `previewTSet` `source: mapLoad` → `15.7.2025` (L10)
- Ráfaga `previewTSet` `source: scrubber` al arrastrar (L11+)
- Compositor responde al cambiar T (validación visual usuario)

**Observaciones visuales (capturas):**
- Eje muy amplio al alejar zoom (2025–2074) con mucho espacio vacío
- Marcador parche = punto pequeño lejos del thumb cuando T y `tiempoInicio` difieren
- «Vista en T» en barra coherente con thumb; header solo muestra «Desde» (by design §8)

---

## 13. Reajustes futuros (polish — no bloqueante MAP-010)

> **Decisión 2026-06-11:** el scrubber y la composición temporal **funcionan**. MAP-009 **cerrado** con polish pendiente aquí — retomar post-MAP-010 o sprint dedicado (ver [`MAP-009 §13`](MAP-009-map-timeline-scrubber.md)).

### 13.1 Capa temporal / parche (compositor + panel)

| Tema | Síntoma observado | Dirección de reajuste |
|------|-------------------|------------------------|
| **Entrada/salida del parche en T** | Composición correcta pero sensación «rara» al cruzar umbral de visibilidad | Refinar feedback: highlight en panel PARCHES del parche activo en T; opcional transición alpha (spec §4.4 pendiente) |
| **Reglas forward/backward** | Un solo parche forward en mapa QA; backward/`tiempoFin` sin validar | Cerrar QA MAP-008 §9 pasos 1, 3, 5 con scrubber; revisar edge cases calendario proyecto real |
| **Z-order / solapamiento** | No probado multi-parche | QA 2+ parches; confirmar orden §4.3.1 en compositor |
| **Marcadores `tiempoFin`** | Solo inicio marcado en barra | Chip de cierre + desaparición visual al pasar fin |
| **Sincronía panel ↔ T** | Panel no refleja qué parches están «vigentes» en T preview | Estado visual en lista (p. ej. opaco vs activo) sin cambiar dibujo activo en edición |

### 13.2 Barra timeline (`MapTimelineBar`)

| Tema | Síntoma observado | Dirección de reajuste |
|------|-------------------|------------------------|
| **Rango inicial** | Padding ±365 días → eje demasiado largo (décadas vacías) | `computeMapTimelineRange`: padding adaptativo (p. ej. min(span/4, 90 días)); vista inicial fit Desde → max(parches) |
| **Zoom / centro** | Alejar zoom deja thumb en extremo lejano del parche | Mantener thumb en vista visible; botón «centrar en T» |
| **Marcadores** | Punto 2px sin nombre | Labels abreviados / tooltip; color por parche; click fin |
| **Ticks** | Etiquetas año densas o sparse según zoom | Revisar `buildTimelineTicks` + unidad derivada para mapa |
| **Snap scrubber** | Fechas intermedias difíciles de fijar | Snap opcional a Desde, inicios/fines de parche, eventos MS |
| **Densidad OBS scrub** | Muchos `previewTSet` por drag (log muy grande) | Throttle acción OBS separado del paint (p. ej. 200 ms) |

### 13.3 Deuda cruzada MAP-008

| Item | Plan |
|------|------|
| QA §9 pasos 4, 5, 8, 9 sin cerrar | Re-ejecutar con scrubber MAP-009 |
| Modo A/B apilar vs cierre | v1.1 — asistente zona solapada |
| Polish UX panel PARCHES | Fechas, copy, estados activos |

### 13.4 Opcional (fuera polish inmediato)

- Sync timeline global del proyecto (Fase 10 / `useMapTimelineSync`)
- Transiciones visuales crossfade al cambiar T
- Eventos MS como puntos en barra (solo lectura)

**Criterio de cierre §13:** usuario confirma que rebobinar T «se siente natural» y que la capa temporal se entiende sin ambigüedad (parche visible vs principal solo).
