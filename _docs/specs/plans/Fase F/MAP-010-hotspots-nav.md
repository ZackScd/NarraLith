# MAP-010 — Navegación interactiva (hotspots → dibujo hijo)

> **Estado:** 📋 **Planificado** (2026-06-11)  
> **Esfuerzo:** Alto · **Riesgo:** Alto (stack navegación + hit-test + schema nuevo + compositor)  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md) Fase F · **Spec:** [`maps-design.md`](../../maps-design.md) §5, §8 · **Previo:** [MAP-009 ✅](MAP-009-map-timeline-scrubber.md) · **Siguiente:** MAP-011

---

## 0. Convención

| Regla | Detalle |
|-------|---------|
| Flujo | Plan → ejecución → tests → QA/OBS → cerrar §12 → MAP-011 |
| Commits | Usuario |
| Evidencia | Recorrido QA §9 + sesión OBS post-implementación |
| OBS previo a planificar | **No requerido** — auditoría post MAP-009 + spec §5 + handoff MAP-009 §11 |
| Dependencias | MAP-004 (modos vista) ✅ · MAP-009 (T + scrubber) ✅ |

---

## 1. Problema y objetivo

### 1.1 Problema (post MAP-009)

El módulo mapas compone **un solo lienzo** (principal + parches en T) y permite **editar** principal o secundarios, pero **no** permite **entrar** en regiones del mapa mediante hotspots — spec §5.

| Carencia | Impacto |
|----------|---------|
| `hotspots.json` solo placeholder (`hotspots: []`) | Sin zonas clicables |
| Sin `drawings/nav/` en Rust/IPC | No hay archivos hijo |
| Sin hit-test en viewport interactivo | Clic = solo pan |
| Sin stack de navegación | No hay padre → hijo → volver |
| `activeDrawingRef` = principal/secundario **temporal** | Confundir con nivel nav rompería MAP-008 |
| Sin breadcrumb / volver | UX §5.5 pendiente; legacy purgado (MAP-000) |
| Compositor no sustituye lienzo por hijo | Navegación imposible |
| expand/crop no sincroniza nav | Desync si existieran hijos |

**Lo que ya funciona (no reimplementar):**

- Modos `interactive` / `edit` (MAP-004); pan/zoom viewport.
- Principal + secundarios + compositor T (`filterVisibleSecondaries`, `MapTimelineBar`).
- `previewTimeTRaw` + `previewTimeByMapId` — **T debe conservarse** al push/pop hijo (MAP-009).
- CRUD secundarios — patrón a clonar para nav (`maps_store.rs`, `useMapProject`).
- `MapHotspotsFileV1` creado vacío al `create_blank_map` (MAP-001 §4.5).
- Guards dirty MAP-005b scoped por `drawingRef`.

### 1.2 Objetivo MAP-010

Entregar **navegación interactiva** padre → hijo dentro del mapa activo:

1. **Persistencia** — `drawings/nav/{id}.json` + `hotspots.json` con schema v1 tipado.
2. **CRUD + IPC** — listar/crear/leer/guardar/eliminar dibujos nav; get/save hotspots.
3. **Stack navegación** — push hijo en interactivo; pop/volver; breadcrumb.
4. **Compositor** — en nav activo: lienzo hijo (+ secundarios del hijo en T); ocultar padre.
5. **Hotspots** — definir en edición (rect v1); overlay visual; hit-test + clic solo en interactivo.
6. **T unificado** — mismo `previewTimeTRaw`; `MapTimelineBar` sigue operativo en hijo.
7. **OBS + tests** — `navPush`/`navPop`, `hotspot*`, compositor con `navDepth`.

### 1.3 Criterios de aceptación

| # | Criterio |
|---|----------|
| C1 | Usuario crea **dibujo hijo** (nav) con dimensiones = mapa; archivo en `drawings/nav/{id}.json` |
| C2 | Usuario define **hotspot** rect en dibujo host (principal o nav padre) → apunta a `targetNavId` |
| C3 | Modo **interactivo**: clic dentro de hotspot → carga hijo a pantalla completa (viewport) |
| C4 | **Breadcrumb** + botón volver → pop stack; restaura vista padre |
| C5 | **T no se resetea** al push/pop hijo (mismo valor scrubber) |
| C6 | Modo **edición**: crear/editar/eliminar hotspots; **sin** navegación al clic |
| C7 | Hotspots visibles en edición (overlay); ocultos o no clicables en edición |
| C8 | Anidación: hijo puede tener hotspots → nieto (profundidad ilimitada v1) |
| C9 | `expand/crop` sincroniza dimensiones **principal + secundarios + nav** |
| C10 | Eliminar nav: bloquear si hotspots lo referencian; o cascada documentada |
| C11 | Rust valida schema hotspot + bounds dentro del lienzo |
| C12 | OBS: `hotspotCreate/Update/Delete`, `navPush`, `navPop`; compositor `navDepth`, `activeNavId` |
| C13 | Tests: hit-test coords, parse schema, Rust CRUD nav/hotspots |
| C14 | i18n ES/EN `nav.*`, `hotspot.*` |
| C15 | Sin regresión MAP-008/009: parches, scrubber, guards dirty |

### 1.4 Fuera de alcance MAP-010

| Tema | Plan |
|------|------|
| Hotspot polígono / trazo cerrado | v1.1 — rect axis-aligned v1 |
| Mini-mapa overview | Polish post-v1 |
| Vínculo entidad WB desde zona | Post-WB |
| Secundarios en mapas hijo (§4bis) | v1.1 opcional — MAP-008 L93; v1 solo principal del hijo |
| Marcas X ubicación MS | **MAP-011** |
| Cambiar `activeMapId` al navegar | Nav es **dentro** del mismo mapa |
| Persistir nav stack en disco | Solo RAM sesión v1 |
| Anti-ciclos automáticos (A→B→A) | Warning UI v1; validación fuerte v1.1 |
| Sync timeline global | MAP-009 §13.4 |

---

## 2. Auditoría (estado repo jun 2026, post MAP-009)

### 2.1 Lo que ya existe (reutilizar)

| Pieza | Archivo | Notas |
|-------|---------|-------|
| Placeholder hotspots | `maps_store.rs` — `MapHotspotsFileV1`, `HOTSPOTS_FILENAME` | Escrito vacío en create |
| Tipos TS placeholder | `src/lib/types/maps.ts` — `MapHotspotsFileV1` | `hotspots: unknown[]` |
| Patrón secundario | `maps_store.rs` — CRUD secondary | Clonar para `nav/` |
| IPC maps | `src-tauri/src/commands/maps.rs` | 6 comandos secondary — plantilla |
| Hook proyecto | `src/hooks/useMapProject.ts` | `loadSecondaries`, `createSecondary`, … |
| Compositor | `useMapViewport.ts` → `paintMapViewport` | Stack principal + overlays |
| Orquestación | `MapWorkspace.tsx` | `overlayDrawings`, `MapTimelineBar` |
| T preview | `useMapStore.previewTimeTRaw`, `mapPreviewT.ts` | Conservar en nav |
| Modos vista | `useMapStore.viewMode`, `mapDrawGesture.ts` | Pan en interactive; extender puntero |
| Ref dibujo edición | `MapDrawingRef` principal \| secondary | **No** incluir nav — ver D2 |
| OBS mapa | `action-audit/events.ts` | Sin eventos nav/hotspot aún |
| Layout disco spec | `maps-design.md` §9.2 | `drawings/nav/`, `hotspots.json` |

### 2.2 Gaps a cerrar

| Gap | Severidad |
|-----|-----------|
| Sin struct `MapHotspotV1` | 🔴 Bloqueante |
| Sin `drawings/nav/` en Rust | 🔴 Bloqueante |
| Sin IPC nav/hotspots | 🔴 Bloqueante |
| Sin `navStack` en store | 🔴 Bloqueante |
| Sin hit-test viewport | 🔴 Bloqueante |
| Sin breadcrumb UI | 🟠 Alto UX |
| expand/crop ignora nav | 🟠 Alto |
| Compositor no mode nav | 🔴 Bloqueante |
| Sin panel edición hotspots | 🟠 Alto UX |

### 2.3 Hardcodes / comportamiento actual

| Ámbito | Valor real |
|--------|------------|
| Clic viewport interactive | Solo pan (`shouldPanPointer`, botón 0) |
| `setActiveMap` | Resetea `activeDrawingRef`, `previewTimeTRaw` — OK al cambiar mapa; nav stack debe resetearse también |
| Legacy | `MapBreadcrumb`, Leaflet — **purgados** (MAP-000/001); solo referencia UX en archive |
| `hotspots.json` en disco QA | `[]` vacío |

### 2.4 Legacy útil (solo docs)

| Referencia | Ubicación | Uso |
|------------|-----------|-----|
| `childMapId`, breadcrumb | `_docs/archive/legacy-docs-v1/` | Inspiración UX volver |
| MAP-000 inventario | `MAP-000-inventory-purge.md` | Confirmar purga; no reutilizar código |

### 2.5 OBS previo a planificar

**No requerido.** Handoff MAP-009 §11 + auditoría §2 + spec §5 bastan.

---

## 3. Decisiones de diseño

### D1 — Schema dibujo nav (`drawings/nav/{id}.json`)

```typescript
interface MapNavDrawingFileV1 {
  version: 1;
  id: string;           // nav-{uuid8}
  name: string;
  createdAt: string;
  updatedAt: string;
  drawing: MapDrawingV2;  // mismas dimensiones que map.json
}
```

| Regla | Detalle |
|-------|---------|
| ID | `nav-{uuid8}` en Rust (patrón `sec-`) |
| Metadatos temporales | **No** — nav no usa `tiempoInicio` |
| Capas | Mismo schema MAP-006 |

### D2 — Separar navegación vs edición temporal

```typescript
/** Host del hotspot: principal o dibujo nav concreto */
type MapHostDrawingRef =
  | { kind: "principal" }
  | { kind: "nav"; id: string };

/** Stack interactivo — NO confundir con activeDrawingRef (MAP-008) */
interface MapNavFrame {
  navId: string;
  name: string;
  hostDrawingRef: MapHostDrawingRef;  // desde qué host se entró
}

// useMapStore ampliación MAP-010
navStack: MapNavFrame[];  // [] = vista raíz (principal + parches T)
```

| Estado | Rol |
|--------|-----|
| `navStack` | Qué hijo se **ve** en interactivo |
| `activeDrawingRef` | Qué archivo se **edita** (principal/secundario) en modo ✏️ |
| Al push hijo | Solo muta `navStack`; **no** `activeDrawingRef` |
| Al entrar edit en hijo | Opcional v1: editar solo principal del hijo visible |

### D3 — Schema hotspot (`hotspots.json`)

```typescript
interface MapHotspotV1 {
  id: string;                    // hs-{uuid8}
  label?: string;
  hostDrawingRef: MapHostDrawingRef;
  bounds: { x: number; y: number; width: number; height: number };
  targetNavId: string;
}

interface MapHotspotsFileV1 {
  version: 1;
  hotspots: MapHotspotV1[];
}
```

| Regla | Detalle |
|-------|---------|
| Forma v1 | Rectángulo axis-aligned en coords **documento** (0…width, 0…height) |
| Validación | `width/height > 0`; dentro de lienzo mapa |
| Un archivo por mapa | Simplifica IPC; filtrar por `hostDrawingRef` en UI |
| targetNavId | Debe existir en `drawings/nav/` |

### D4 — Compositor con nav activo

```text
navStack.length === 0 (raíz):
  paintMapViewport(principal + overlayDrawings secundarios en T)

navStack.length > 0 (frame top = navId):
  paintMapViewport(
    navDrawing del hijo como "base"
    + overlayDrawings secundarios DEL HIJO en T   [v1.1; v1 opcional vacío]
  )
  (no pintar principal padre ni parches padre)
```

| Detalle | v1 |
|---------|-----|
| Hotspot overlay | Solo en **edición** — semi-transparente sobre host |
| Hit-test | Solo **interactivo** — coords mundo vía inverse viewport transform |
| T | `filterVisibleSecondaries` usa `host` activo: raíz → parches mapa; hijo → parches hijo (v1.1) |

**v1 mínimo aceptable:** hijo muestra solo su `drawing` principal; secundarios del hijo → v1.1 si tiempo.

### D5 — Flujo push / pop

```text
Interactive + clic hotspot
  → validate targetNavId
  → navPush({ navId, name, hostDrawingRef })
  → load nav file + drawing
  → trackAction navPush
  → compositor redraw (mismo previewTimeTRaw)

Breadcrumb / Volver
  → navPop()
  → trackAction navPop
  → compositor vuelve a raíz o frame anterior
```

**Reset navStack:** al `setActiveMap` (cambio mapa), junto con reset `activeDrawingRef`.

### D6 — Edición hotspots (modo ✏️)

| Acción | UI v1 |
|--------|-------|
| Crear hotspot | Herramienta «Zona nav» o panel: dibujar rect arrastrando en viewport |
| Elegir hijo | Select existente o «Crear hijo» inline |
| Editar / eliminar | Lista en panel `MapHotspotsPanel` o sidebar |
| Guardado | Inmediato vía `save_map_hotspots_cmd` (como meta secundario) |

Hotspots del **host visible**: si `navStack` vacío → host = principal; si no → host = frame bajo el top (padre del hijo actual) **solo en edición** — en interactivo dentro del hijo no se editan hotspots del padre.

**Simplificación v1 edición:** hotspots solo en **principal** + permitir definir en nav files cuando se edita ese nav como `activeDrawingRef` futuro — **recomendado v1:** panel hotspots filtra `hostDrawingRef === principal` únicamente; hotspots en nav hijo en v1.1.

**Decisión v1 cerrada:** hotspots host = **principal solamente**; hijo nav editable como dibujo pero hotspots en nav → **v1.1**. Anidación clic funciona si hotspot en principal apunta a nav A y nav A tiene hotspot (v1.1).

**Revisión:** spec §5.4 permite anidación. Para v1 cerrar:
- Hotspots en **principal** → nav level 1
- v1.1: hotspots en nav drawings para niveles >1

Documentar en plan como **D6 v1 scope: principal-only hotspots**.

### D7 — IPC Rust

| Comando | Args | Returns |
|---------|------|---------|
| `list_map_nav_cmd` | `mapId` | `MapNavSummaryV1[]` |
| `get_map_nav_cmd` | `mapId`, `navId` | `MapNavDrawingFileV1` |
| `create_map_nav_cmd` | `mapId`, `name` | `MapNavDrawingFileV1` |
| `save_map_nav_cmd` | `mapId`, `file` | `()` |
| `delete_map_nav_cmd` | `mapId`, `navId` | `()` |
| `get_map_hotspots_cmd` | `mapId` | `MapHotspotsFileV1` |
| `save_map_hotspots_cmd` | `mapId`, `file` | `()` |

**Principal:** sin cambios firma existente.

**`create_map_nav`:** dimensiones = `map.json`; capa default; crea `drawings/nav/` si falta.

**`expand_map_canvas` / `crop_map_canvas`:** iterar `nav/*.json` igual que secondary (sync dimensions).

**`delete_map_nav`:** error si algún hotspot referencia `targetNavId`.

### D8 — Hit-test

Nuevo módulo `src/lib/maps/mapHotspotHitTest.ts`:

```typescript
export function hitTestHotspots(
  worldX: number,
  worldY: number,
  hotspots: MapHotspotV1[],
  hostDrawingRef: MapHostDrawingRef,
): MapHotspotV1 | null;
```

Coords mundo: reutilizar inverse de `mapDrawCoords.ts` / transform viewport.

**Orden:** top-most hotspot si solapan (orden array o z-index manual v1).

### D9 — Breadcrumb UI

`MapNavBreadcrumb.tsx` en header o sobre viewport:

```text
Terreno base  ›  Ciudad  ›  Edificio     [← Volver]
```

- Visible si `navStack.length > 0` o siempre con raíz clickable en interactivo
- Clic segmento → pop hasta ese frame
- i18n `nav.breadcrumbRoot`, `nav.back`

### D10 — Integración MapWorkspace layout

```text
Interactive:
  header + MapNavBreadcrumb
  viewport (compositor según navStack)
  MapTimelineBar (sin cambios)
  (sin MapEditStudio)

Edit:
  + MapHotspotsPanel o herramienta rect (fase posterior)
  + edición trazos existente
  MapTimelineBar readonly
```

### D11 — OBS

**Acciones nuevas:**

| Evento | Payload |
|--------|---------|
| `obs.action.map.navPush` | `{ mapId, navId, hostDrawingRef, depth }` |
| `obs.action.map.navPop` | `{ mapId, toDepth, navId? }` |
| `obs.action.map.hotspotCreate` | `{ mapId, hotspotId, targetNavId, bounds }` |
| `obs.action.map.hotspotUpdate` | `{ mapId, hotspotId, patch }` |
| `obs.action.map.hotspotDelete` | `{ mapId, hotspotId }` |

**Compositor ampliado:**

```typescript
{
  navDepth: number;
  activeNavId: string | null;
  navStackIds: string[];
  hostHotspotCount: number;
  // … existentes MAP-009
}
```

### D12 — Guards dirty

| Acción | Guard |
|--------|-------|
| navPush con trazos sucios en edición | N/A — push solo interactive |
| navPush/pop interactive | Sin dirty trazos |
| Cambiar mapa con navStack | Reset stack; guard sucio MAP-005b solo dibujo activo |
| Editar hotspot | Guardado inmediato — no dirty trazos |

---

## 4. Esquema e IPC

### 4.1 Layout disco (ampliado §9.2)

```text
{mapId}/
  map.json
  drawings/
    principal.json
    secondary/{id}.json
    nav/{id}.json          ← MAP-010
  hotspots.json            ← MAP-010 tipado
  assets/
```

### 4.2 Tipos TS auxiliares

```typescript
interface MapNavSummaryV1 {
  id: string;
  name: string;
  updatedAt: string;
}

function hostDrawingRefKey(ref: MapHostDrawingRef): string;
// "principal" | "nav:{id}"
```

### 4.3 Hook `useMapProject` ampliación

```typescript
navDrawings: MapNavSummaryV1[];
loadNavDrawings: () => Promise<void>;
createNav: (name: string) => Promise<MapNavDrawingFileV1>;
saveNav: (file: MapNavDrawingFileV1) => Promise<void>;
deleteNav: (navId: string) => Promise<void>;
hotspots: MapHotspotV1[];
loadHotspots: () => Promise<void>;
saveHotspots: (file: MapHotspotsFileV1) => Promise<void>;
```

---

## 5. Frontend — diseño de componentes

### 5.1 Archivos nuevos / tocados

| Archivo | Rol |
|---------|-----|
| `lib/types/maps.ts` | `MapHotspotV1`, `MapNav*`, `MapHostDrawingRef`, `MapNavFrame` |
| `lib/maps/mapHotspotHitTest.ts` | Hit-test + tests |
| `lib/maps/mapHostDrawingRef.ts` | Keys parse/format |
| `stores/useMapStore.ts` | `navStack`, `navPush`, `navPop`, reset en `setActiveMap` |
| `hooks/useMapProject.ts` | CRUD nav + hotspots |
| `hooks/useMapNav.ts` | Orquestación push/pop + carga compositor |
| `modules/maps/MapNavBreadcrumb.tsx` | Breadcrumb + volver |
| `modules/maps/MapHotspotsPanel.tsx` | Lista + CRUD (edición) |
| `modules/maps/MapHotspotEditor.tsx` | Dibujar rect en viewport (edit) |
| `modules/maps/MapViewport.tsx` | Hit-test click interactive; overlay rects edit |
| `modules/maps/MapWorkspace.tsx` | Wiring compositor nav + breadcrumb |
| `lib/maps/useMapViewport.ts` | Rama compositor nav |
| `src-tauri/src/fs/maps_store.rs` | Nav CRUD + hotspots + expand/crop |
| `src-tauri/src/commands/maps.rs` | IPC nuevos |
| `i18n/{es,en}/maps.json` | `nav.*`, `hotspot.*` |

### 5.2 Flujo crear hotspot y navegar

```text
Edit: MapHotspotsPanel → Crear hijo nav → Dibujar rect → save hotspots
Interactive: clic en zona → hitTest → navPush → compositor hijo
Breadcrumb: Volver → navPop → compositor padre
(T constante en todo el flujo)
```

---

## 6. OBS — eventos

Ver §3 D11. Emitir compositor al push/pop y al cambiar hotspots.

---

## 7. Fases de ejecución

```text
Fase 1   Tipos TS + mapHotspotHitTest + tests coords
Fase 2   Rust: schema nav + hotspots tipados, CRUD, expand/crop + cargo test
Fase 3   IPC commands + useMapProject loadNav/hotspots CRUD
Fase 4   useMapStore navStack push/pop + reset on setActiveMap
Fase 5   Compositor: rama navStack en MapWorkspace + useMapViewport
Fase 6   MapViewport hit-test interactive + overlay rects edit
Fase 7   MapNavBreadcrumb + MapHotspotsPanel + crear hijo inline
Fase 8   MapHotspotEditor (rect drag) + save hotspots
Fase 9   OBS nav/hotspot + compositor navDepth
Fase 10  i18n + npm test + build + cargo test maps_store
Fase 11  QA manual §9 + cerrar §12
```

**Checkpoint:** tras Fase 5 — 1 hotspot en principal → clic → ves hijo → volver.

---

## 8. Verificación automatizada

| Comando | Esperado |
|---------|----------|
| `npm test -- --run` | + tests hit-test, hostRef keys, store navStack |
| `npm run build` | OK |
| `cd src-tauri && cargo test maps_store` | + nav CRUD, hotspots validate, expand/crop nav |

---

## 9. QA manual (recorrido OBS)

**Precondiciones:** mapa con trazos en principal; OBS ON; MAP-009 scrubber operativo.

| Paso | Acción | Esperado |
|------|--------|----------|
| 1 | Crear nav «Ciudad» | `drawings/nav/nav-*.json` |
| 2 | Crear hotspot rect en principal → Ciudad | `hotspots.json` persistido |
| 3 | Dibujar en nav Ciudad (edit) | Trazos en archivo nav |
| 4 | Interactive: clic hotspot | `navPush`; vista hijo |
| 5 | Scrubber T en hijo | T cambia; composición coherente (v1: solo trazos hijo) |
| 6 | Volver | `navPop`; vista principal + parches T |
| 7 | Edit: clic hotspot | **No** navega |
| 8 | Expandir lienzo | nav + principal mismas dimensiones |
| 9 | Eliminar nav referenciado | Error UI |
| 10 | OBS | eventos §6 + compositor `navDepth` |

**Sesiones OBS:** _(rellenar post-implementación)_

---

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Confundir `activeDrawingRef` y `navStack` | D2 documentado; code review estricto |
| Hit-test desalineado con zoom/pan | Tests con transform; reutilizar `mapDrawCoords` |
| Hotspots huérfanos (nav borrado) | Validación delete + lint en save |
| Secundarios hijo no implementados v1 | Documentar limitación; v1.1 |
| Anidación >1 sin hotspots en nav | v1.1 hotspots en nav host |
| Regresión T / parches | QA pasos 5–6 explícitos |

---

## 11. Handoff → MAP-011

MAP-011 tomará:

- **Compositor overlay** — capa X ubicación manuscrito @ T (encima de nav/parches).
- **`navStack` + `previewTimeTRaw`** — marcas X visibles en hijo con mismo T.
- **Sin cambios** schema nav/hotspots salvo convivencia en `paintMapViewport`.

MAP-010 **no** implementa marcas X ni integración WB.

**Polish diferido MAP-008/009:** retomar [`MAP-009 §13`](MAP-009-map-timeline-scrubber.md) y QA MAP-008 pendiente en paralelo opcional.

---

## 12. Registro

| Fecha | Evento |
|-------|--------|
| 2026-06-11 | Plan MAP-010 redactado (auditoría post MAP-009 ✅ + spec §5 + handoff MAP-009 §11) |
