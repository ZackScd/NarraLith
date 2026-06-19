# MAP-010 — Navegación interactiva (hotspots → dibujo hijo)

> **Estado:** ✅ **Cerrado** (2026-06-11) — Fases 1–11 implementadas · **QA parcial** · **polish §13 diferido** (no bloquea MAP-011)  
> **Esfuerzo:** Alto · **Riesgo:** Alto (stack navegación + hit-test + schema nuevo + compositor)  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md) Fase F · **Spec:** [`maps-design.md`](../../maps-design.md) §5, §8 · **Previo:** [MAP-009 ✅](MAP-009-map-timeline-scrubber.md) · **Siguiente:** [MAP-011 📋](MAP-011-manuscript-location-x.md)

---

## 0. Convención

| Regla | Detalle |
|-------|---------|
| Flujo | Plan → ejecución → tests → QA/OBS → cerrar §12 → MAP-011 |
| Commits | Usuario |
| Evidencia | Recorrido QA §9 + sesión OBS post-implementación |
| OBS previo a planificar | **No requerido** — auditoría post MAP-009 + spec §5 + handoff MAP-009 §11 |
| Dependencias | MAP-004 (modos vista) ✅ · MAP-008 (multi-target + guards) ✅ · MAP-009 (T + scrubber) ✅ |
| Alcance código | **Frontend + Rust/IPC + OBS + tests** — schema disco ampliado (`nav/`, `hotspots.json` tipado) |

**Contratos heredados (no renegociar):**

| Origen | Contrato MAP-010 |
|--------|------------------|
| MAP-004 §8 | Interactivo por defecto; edición solo con ✏️; hotspots **definen** en edición, **activan** en interactivo |
| MAP-008 D2/D4 | `MapDrawingRef` + `sessionKey` + draft/guards/buffer **por ref**; compositor alpha por capa |
| MAP-008 §12.1 | `save_map_*` RMW: metadatos en disco no se pisan al guardar trazos |
| MAP-009 §11 | `previewTimeTRaw` / `timeT` **conservado** al push/pop hijo; `MapTimelineBar` operativa en hijo |
| MAP-009 §13 | Polish scrubber/parches **diferido** — no bloquea MAP-010 |

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
| `MapDrawingRef` = principal \| secondary **temporal** | Falta target nav para edición de trazos hijo |
| Sin breadcrumb / volver | UX §5.5 pendiente; legacy purgado (MAP-000) |
| Compositor no sustituye lienzo por hijo | Navegación imposible |
| expand/crop no sincroniza nav | Desync si existieran hijos |

**Lo que ya funciona (no reimplementar):**

- Modos `interactive` / `edit` (MAP-004); pan/zoom viewport.
- Principal + secundarios + compositor T (`filterVisibleSecondaries`, `MapTimelineBar`).
- `previewTimeTRaw` + `previewTimeByMapId` — **T debe conservarse** al push/pop hijo (MAP-009).
- CRUD secundarios — patrón a clonar para nav (`maps_store.rs`, `useMapProject`).
- `MapHotspotsFileV1` creado vacío al `create_blank_map` (MAP-001 §4.5).
- Guards dirty MAP-005b scoped por `drawingRef` (MAP-008).

### 1.2 Objetivo MAP-010

Entregar **navegación interactiva** padre → hijo dentro del mapa activo (**profundidad 1 en v1**):

1. **Persistencia** — `drawings/nav/{id}.json` + `hotspots.json` con schema v1 tipado.
2. **CRUD + IPC** — listar/crear/leer/guardar/eliminar dibujos nav; get/save hotspots.
3. **Stack navegación** — push hijo en interactivo; pop/volver; breadcrumb.
4. **Compositor** — en nav activo: lienzo hijo (solo `drawing` del nav v1); ocultar padre y parches padre.
5. **Hotspots** — rect en **principal** (v1); overlay en edición; hit-test + clic solo en interactivo.
6. **Edición trazos nav** — extender `MapDrawingRef` con `nav` (patrón MAP-008 multi-target).
7. **T unificado** — mismo `previewTimeTRaw`; `MapTimelineBar` sigue operativo en hijo (sin parches hijo v1).
8. **OBS + tests** — `navPush`/`navPop`, `hotspot*`, compositor con `navDepth`.

### 1.3 Criterios de aceptación

| # | Criterio |
|---|----------|
| C1 | Usuario crea **dibujo hijo** (nav) con dimensiones = mapa; archivo en `drawings/nav/{id}.json` |
| C2 | Usuario define **hotspot** rect en el **dibujo principal** → apunta a `targetNavId` existente |
| C3 | Modo **interactivo**: clic dentro de hotspot (sin drag de pan) → carga hijo **en el viewport** (sustituye lienzo; no fullscreen de app) |
| C4 | **Breadcrumb** + botón volver → `navPop`; restaura vista padre |
| C5 | **T no se resetea** al push/pop hijo (mismo valor scrubber / `timeT`) |
| C6 | Modo **edición**: crear/editar/eliminar hotspots; **sin** navegación al clic en zona |
| C7 | Hotspots: **overlay visible** en edición; en interactivo **clicables** para navegar (no overlay de edición) |
| C8 | **v1:** un nivel de navegación (principal → hijo → volver). Hotspots en dibujos nav / nieto → **v1.1** (ver §1.4) |
| C9 | `expand/crop` sincroniza dimensiones **principal + secundarios + nav** |
| C10 | Eliminar nav: **bloquear** si algún hotspot referencia `targetNavId` |
| C11 | Rust valida schema hotspot + bounds dentro del lienzo |
| C12 | OBS: `hotspotCreate/Update/Delete`, `navPush`, `navPop`; compositor `navDepth`, `activeNavId`, `timeT` |
| C13 | Tests: hit-test coords (con zoom/pan), parse schema, Rust CRUD nav/hotspots, store `navStack` reset |
| C14 | i18n ES/EN `nav.*`, `hotspot.*` |
| C15 | Sin regresión MAP-008/009: parches, scrubber, guards dirty, `saveDrawing` con `drawingRef` correcto |
| C16 | Usuario **selecciona nav** como dibujo activo en edición; trazos persisten en `drawings/nav/{id}.json` vía pipeline MAP-005b scoped |

### 1.4 Fuera de alcance MAP-010 (v1)

| Tema | Plan |
|------|------|
| Hotspot polígono / trazo cerrado | v1.1 — rect axis-aligned v1 |
| Hotspots con host = dibujo nav (anidación >1) | **v1.1** — spec §5 anidación completa |
| Mini-mapa overview | Polish post-v1 |
| Vínculo entidad WB desde zona | Post-WB |
| Secundarios en mapas hijo (§4bis) | v1.1 — MAP-008 L93; v1 solo `drawing` principal del hijo |
| Marcas X ubicación MS | **MAP-011** |
| Cambiar `activeMapId` al navegar | Nav es **dentro** del mismo mapa |
| Persistir nav stack en disco | Solo RAM sesión v1 |
| Anti-ciclos automáticos (A→B→A) | Warning UI v1; validación fuerte v1.1 |
| Sync timeline global | MAP-009 §13.4 |
| Polish MAP-009 §13 / QA MAP-008 pendiente | Paralelo opcional; no bloquea MAP-010 |

### 1.5 Roadmap v1.1 (post MAP-010)

| Tema | Notas |
|------|-------|
| Hotspots en host nav | `hostDrawingRef: { kind: "nav", id }` ya en schema; UI + hit-test filtrado por frame |
| Anidación ilimitada | Principal → A → B → … con hotspots en cada nivel |
| Parches temporales en hijo nav | `filterVisibleSecondaries` scoped al host activo |
| Validación anti-ciclos | Grafo `targetNavId` |

---

## 2. Auditoría (estado repo jun 2026, post MAP-009)

### 2.1 Lo que ya existe (reutilizar)

| Pieza | Archivo | Notas |
|-------|---------|-------|
| Placeholder hotspots | `maps_store.rs` — `MapHotspotsFileV1`, `HOTSPOTS_FILENAME` | Escrito vacío en create; tipar struct |
| Tipos TS placeholder | `src/lib/types/maps.ts` — `MapHotspotsFileV1` | `hotspots: unknown[]` → `MapHotspotV1[]` |
| Patrón secundario | `maps_store.rs` — CRUD secondary | Clonar para `nav/` + RMW save |
| IPC maps | `src-tauri/src/commands/maps.rs` | 6 comandos secondary — plantilla |
| Hook proyecto | `src/hooks/useMapProject.ts` | `loadSecondaries`, `saveActiveDrawing`, … |
| Multi-target edición | MAP-008 — `MapDrawingRef`, `sessionKey`, draft | Extender con `kind: "nav"` |
| Compositor | `useMapViewport.ts` → `paintMapViewport` | Stack principal + overlays |
| Orquestación | `MapWorkspace.tsx` | `overlayDrawings`, `MapTimelineBar` |
| T preview | `useMapStore.previewTimeTRaw`, `mapPreviewT.ts` | Conservar en nav (MAP-009) |
| Modos vista | `useMapStore.viewMode`, `mapDrawGesture.ts` | Pan en interactive; extender puntero |
| Coords documento | `mapDrawCoords.ts` — `screenToDocument` | Hit-test inverse transform |
| OBS mapa | `action-audit/events.ts` | Sin eventos nav/hotspot aún |
| Layout disco spec | `maps-design.md` §9.2 | `drawings/nav/`, `hotspots.json` |

### 2.2 Gaps a cerrar

| Gap | Severidad |
|-----|-----------|
| Sin struct `MapHotspotV1` (Rust + TS) | 🔴 Bloqueante |
| Sin `drawings/nav/` en Rust | 🔴 Bloqueante |
| Sin IPC nav/hotspots | 🔴 Bloqueante |
| Sin `navStack` en store | 🔴 Bloqueante |
| `MapDrawingRef` sin `nav` + `saveActiveDrawing` sin rama nav | 🔴 Bloqueante |
| Sin hit-test viewport (clic vs pan) | 🔴 Bloqueante |
| Sin breadcrumb UI | 🟠 Alto UX |
| expand/crop ignora nav | 🟠 Alto |
| Compositor sin rama nav | 🔴 Bloqueante |
| Sin panel edición hotspots / nav | 🟠 Alto UX |

### 2.3 Hardcodes / comportamiento actual

| Ámbito | Valor real |
|--------|------------|
| Clic viewport interactive | Solo pan (`shouldPanPointer`, botón 0) — hay que discriminar clic vs drag |
| `setActiveMap` | Resetea `activeDrawingRef`, restaura T por mapa — **debe** resetear `navStack: []` |
| `resetMapSessionState` | Igual que arriba — incluir `navStack` |
| Legacy | `MapBreadcrumb`, Leaflet — **purgados** (MAP-000/001); solo referencia UX en archive |
| `hotspots.json` en disco QA | `[]` vacío |

### 2.4 Legacy útil (solo docs)

| Referencia | Ubicación | Uso |
|------------|-----------|-----|
| `childMapId`, breadcrumb | `_docs/archive/legacy-docs-v1/` | Inspiración UX volver |
| MAP-000 inventario | `MAP-000-inventory-purge.md` | Confirmar purga; no reutilizar código |

### 2.5 OBS previo a planificar

**No requerido.** Handoff MAP-009 §11 + auditoría §2 + spec §5 bastan.

### 2.6 Pre-vuelo (auditoría 2026-06-11)

> Veredicto: **seguro implementar** tras aplicar correcciones de este plan (C2/C7/C8, D2, D6).

| # | Check | Estado |
|---|-------|--------|
| 1 | Dependencias MAP-004 + MAP-008 + MAP-009 cerradas funcionalmente | ✅ |
| 2 | Criterios §1.3 alineados con alcance v1 (principal-only hotspots, profundidad 1) | ✅ corregido |
| 3 | `MapDrawingRef` extendido con `nav` para edición trazos (MAP-008 D2) | 📋 D2 |
| 4 | `navStack` separado de `activeDrawingRef` (MAP-008 no confundir con temporal) | 📋 D2 |
| 5 | Hit-test reutiliza `screenToDocument`; umbral clic vs pan documentado | 📋 D8 |
| 6 | `save_map_nav` RMW como `save_map_secondary` (MAP-008 §12.1) | 📋 D7 |
| 7 | Checkpoint Fase 5 antes de UI hotspot completa | 📋 §7 |
| 8 | Regresión MAP-009: T + scrubber en hijo (QA pasos 5–6) | 📋 §9 |

**Correcciones aplicadas respecto al borrador inicial:**

- C2/C8 unificados con D6 (hotspots solo en principal; anidación >1 → v1.1).
- C7 redactado sin contradicción (overlay edición / clic interactivo).
- C3 «pantalla completa» → sustitución de lienzo en viewport.
- D2: `MapDrawingRef` incluye `nav` para edición; `navStack` solo para vista interactiva.
- QA paso 3: flujo explícito vía panel nav + `activeDrawingRef`.

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
| Metadatos temporales | **No** — nav no usa `tiempoInicio` / `tiempoFin` |
| Capas | Mismo schema MAP-006 |
| Índice | Sin `index.json` v1 — listar directorio `nav/` (patrón MAP-008 D1) |

### D2 — Dos ejes: navegación interactiva vs edición de archivo

**A) Stack interactivo** — qué se **ve** en modo default (no edición):

```typescript
/** Host del hotspot en schema (v1: solo principal en UI) */
type MapHostDrawingRef =
  | { kind: "principal" }
  | { kind: "nav"; id: string };  // reservado v1.1

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
| `navStack` | Vista interactiva: raíz vs hijo visible |
| `activeDrawingRef` | Qué **archivo** se edita en ✏️ (principal \| secondary \| **nav**) |
| Al `navPush` | Solo muta `navStack`; **no** cambia `activeDrawingRef` |
| Al `navPop` | Solo muta `navStack`; T intacto |
| Al cambiar mapa | `navStack: []` + reset `activeDrawingRef` a principal |

**B) Identificador dibujo activo** — extensión MAP-008 D2:

```typescript
type MapDrawingRef =
  | { kind: "principal" }
  | { kind: "secondary"; id: string }
  | { kind: "nav"; id: string };

function drawingRefKey(ref: MapDrawingRef): string {
  if (ref.kind === "principal") return "principal";
  if (ref.kind === "secondary") return `secondary:${ref.id}`;
  return `nav:${ref.id}`;
}
```

| Regla | Detalle |
|-------|---------|
| `sessionKey` | `${root}:${mapId}:${drawingRefKey}` — incluye nav |
| Draft / guards MAP-005b | Scoped por ref; cambiar principal ↔ nav dispara guard si dirty |
| Buffer trazos | Cache `${mapId}:nav:${id}:${w}x${h}` |
| Panel selección | `MapNavDrawingsPanel` (izq., junto a `MapSecondariesPanel`) |
| Badge header | `nav.activeBadge` cuando `activeDrawingRef.kind === "nav"` |

**Invariante:** nunca usar `navStack` para decidir dónde van los trazos; nunca usar `activeDrawingRef` para decidir qué hijo se ve en interactivo.

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
| Validación | `width/height > 0`; bounds dentro de lienzo mapa |
| Un archivo por mapa | Simplifica IPC; filtrar por `hostDrawingRef` en UI |
| targetNavId | Debe existir en `drawings/nav/` |
| **Host v1** | UI crea/edita solo `hostDrawingRef: { kind: "principal" }` |
| Host v1.1 | Hotspots en nav files cuando `activeDrawingRef.kind === "nav"` |

### D4 — Compositor con nav activo

```text
navStack.length === 0 (raíz):
  paintMapViewport(principal + overlayDrawings secundarios en T)

navStack.length > 0 (frame top = navId):
  paintMapViewport(
    navDrawing del hijo como "base" (principal del archivo nav)
    // v1: sin overlayDrawings secundarios del hijo
  )
  (no pintar principal padre ni parches padre)
```

| Detalle | v1 |
|---------|-----|
| Hotspot overlay | Solo en **edición** — semi-transparente sobre host (principal) |
| Hit-test | Solo **interactivo** — coords documento vía `screenToDocument` |
| T / scrubber | Mismo `previewTimeTRaw`; barra visible; composición hijo = solo trazos nav |
| Parches en hijo | v1.1 — `filterVisibleSecondaries` scoped al host activo |

### D5 — Flujo push / pop

```text
Interactive + clic hotspot (sin drag)
  → hitTestHotspots(worldX, worldY, hotspots, { kind: "principal" })
  → validate targetNavId
  → navPush({ navId, name, hostDrawingRef: { kind: "principal" } })
  → load nav file (cache useMapProject)
  → trackAction navPush
  → compositor redraw (mismo previewTimeTRaw / timeT)

Breadcrumb / Volver / clic segmento intermedio
  → navPop(n?)  // n frames o hasta índice
  → trackAction navPop
  → compositor vuelve a raíz o frame anterior
```

**Reset `navStack`:** en `setActiveMap` y `resetMapSessionState`, junto con reset `activeDrawingRef`.

### D6 — Edición hotspots (modo ✏️)

| Acción | UI v1 |
|--------|-------|
| Crear hotspot | `MapHotspotEditor`: rect arrastrando en viewport sobre **principal** |
| Elegir hijo | Select en `MapHotspotsPanel` o «Crear hijo» inline |
| Editar / eliminar | Lista en `MapHotspotsPanel` |
| Guardado | Inmediato vía `save_map_hotspots_cmd` (metadatos; no dirty trazos MAP-005b) |

| Alcance v1 cerrado | Detalle |
|--------------------|---------|
| Host permitido en UI | **Principal solamente** |
| Edición trazos hijo | Panel nav + `activeDrawingRef: { kind: "nav", id }` |
| Anidación clic | Principal → hijo nav → volver (**1 nivel**) |
| Hotspots en nav / nieto | **v1.1** — schema ya preparado |

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

**Principal / secondary:** sin cambios firma existente.

**`create_map_nav`:** dimensiones = `map.json`; capa default `layer-1`; crea `drawings/nav/` si falta.

**`save_map_nav`:** read-modify-write como MAP-008 `save_map_secondary` — conservar `name`, `createdAt` en disco; actualizar solo `drawing` + `updated_at`. Test `save_map_nav_preserves_metadata_from_disk`.

**`expand_map_canvas` / `crop_map_canvas`:** `sync_nav_drawings_dimensions` igual que secondary (`clip_drawing_strokes` si crop).

**`delete_map_nav`:** error `error.maps.nav_referenced_by_hotspot` si algún hotspot referencia `targetNavId`.

**Hotspots save:** validar struct + bounds; migrar lectura de `Vec<Value>` legacy → `MapHotspotV1[]` (array vacío sigue válido).

### D8 — Hit-test y clic vs pan

Nuevo módulo `src/lib/maps/mapHotspotHitTest.ts`:

```typescript
export function hitTestHotspots(
  worldX: number,
  worldY: number,
  hotspots: MapHotspotV1[],
  hostDrawingRef: MapHostDrawingRef,
): MapHotspotV1 | null;
```

| Regla | Detalle |
|-------|---------|
| Coords | `screenToDocument(clientX, clientY, rect, viewport)` |
| Host v1 | Filtrar `hostDrawingRef.kind === "principal"` |
| Orden | Último en array gana si solapan (top-most v1) |
| Clic vs pan | En interactivo: `pointerdown` registra origen; si `pointerup` con movimiento < **5 px** → hit-test; si no → pan (comportamiento actual) |
| Modo edición | Hit-test **no** navega; rect tool usa gesto propio |

Integración en `MapViewport.tsx`: rama interactiva antes de delegar pan a `useMapViewport`.

### D9 — Breadcrumb UI

`MapNavBreadcrumb.tsx` en header (sobre viewport o en fila header):

```text
Terreno base  ›  Ciudad     [← Volver]
```

| Regla | Detalle |
|-------|---------|
| Visible | Si `navStack.length > 0` |
| Raíz | Etiqueta `nav.breadcrumbRoot` (= nombre mapa o «Terreno base») |
| Clic segmento | `navPop` hasta ese frame |
| i18n | `nav.breadcrumbRoot`, `nav.back`, `nav.depth` |

### D10 — Integración MapWorkspace layout

```text
Interactive:
  header + MapNavBreadcrumb (si depth > 0)
  viewport (compositor según navStack)
  MapTimelineBar (scrubber activo — MAP-009)
  (sin MapEditStudio)

Edit:
  MapSecondariesPanel + MapNavDrawingsPanel (izq.)
  MapHotspotsPanel + MapHotspotEditor
  MapViewport + overlay rects hotspot
  MapTimelineBar readonly (MAP-009 C5)
  edición trazos según activeDrawingRef (principal | secondary | nav)
```

### D11 — OBS

**Acciones nuevas (`events.ts`):**

| Evento | Payload |
|--------|---------|
| `obs.action.map.navPush` | `{ mapId, navId, hostDrawingRef, depth }` |
| `obs.action.map.navPop` | `{ mapId, toDepth, navId? }` |
| `obs.action.map.navSelect` | `{ mapId, drawingRef, previousRef? }` |
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
  timeT: string | null;  // alias MAP-009
  // … previewTRaw, activeSecondaryIds, activeDrawingRef, etc.
}
```

### D12 — Guards dirty

| Acción | Guard |
|--------|-------|
| `navPush` / `navPop` en interactivo | Sin dirty trazos (edición cerrada) |
| Cambiar `activeDrawingRef` (incl. nav) | MAP-005b si dirty en ref anterior |
| Cambiar mapa con `navStack` | Reset stack; guard solo dibujo activo |
| Salir edición con nav activo dirty | `guardMapDrawingNavigation` existente |
| Editar hotspot | Save inmediato hotspots — **no** entra en dirty trazos |
| Expand/crop con navStack > 0 | Guard canvas op; reset navStack recomendado (documentar en UI) |

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

// parseDrawingRefKey ampliado: "nav:{id}" → { kind: "nav", id }
```

### 4.3 Hook `useMapProject` ampliación

```typescript
navDrawings: MapNavSummaryV1[];
navFiles: Record<string, MapNavDrawingFileV1>;  // cache sesión
loadNavDrawings: () => Promise<void>;
loadNavFile: (navId: string, opts?: { force?: boolean }) => Promise<MapNavDrawingFileV1 | null>;
createNav: (name: string) => Promise<MapNavDrawingFileV1>;
saveNav: (file: MapNavDrawingFileV1) => Promise<void>;
deleteNav: (navId: string) => Promise<void>;
hotspots: MapHotspotV1[];
loadHotspots: () => Promise<void>;
saveHotspots: (file: MapHotspotsFileV1) => Promise<void>;

// saveActiveDrawing(ref) — rama nav:
//   save_map_nav_cmd con RMW; actualizar navFiles cache
```

---

## 5. Frontend — diseño de componentes

### 5.1 Archivos nuevos / tocados

| Archivo | Rol |
|---------|-----|
| `lib/types/maps.ts` | `MapHotspotV1`, `MapNav*`, `MapHostDrawingRef`, `MapNavFrame`; extender `MapDrawingRef` |
| `lib/maps/mapHotspotHitTest.ts` | Hit-test + tests |
| `lib/maps/mapHostDrawingRef.ts` | Keys parse/format host + drawing ref |
| `stores/useMapStore.ts` | `navStack`, `navPush`, `navPop`, reset en `setActiveMap` / `resetMapSessionState` |
| `hooks/useMapProject.ts` | CRUD nav + hotspots + `saveActiveDrawing` nav |
| `hooks/useMapDrawingSession.ts` | Carga `sourceDrawing` desde navFiles |
| `hooks/useMapNav.ts` | Orquestación push/pop + carga compositor |
| `modules/maps/MapNavDrawingsPanel.tsx` | Lista nav + selección `activeDrawingRef` |
| `modules/maps/MapNavBreadcrumb.tsx` | Breadcrumb + volver |
| `modules/maps/MapHotspotsPanel.tsx` | Lista + CRUD (edición) |
| `modules/maps/MapHotspotEditor.tsx` | Dibujar rect en viewport (edit) |
| `modules/maps/MapViewport.tsx` | Hit-test clic interactive; overlay rects edit |
| `modules/maps/MapWorkspace.tsx` | Wiring compositor nav + breadcrumb + paneles |
| `lib/maps/useMapViewport.ts` | Rama compositor nav |
| `lib/maps/mapStrokeBuffer.ts` | Keys `nav:{id}` |
| `lib/maps/mapDrawingDraft.ts` | Tercer nivel ref incluye nav |
| `src-tauri/src/fs/maps_store.rs` | Nav CRUD + hotspots tipados + expand/crop |
| `src-tauri/src/commands/maps.rs` | IPC nuevos |
| `i18n/{es,en}/maps.json` | `nav.*`, `hotspot.*` |

### 5.2 Flujo crear hotspot y navegar

```text
Edit:
  MapNavDrawingsPanel → Crear nav «Ciudad»
  MapHotspotsPanel → Dibujar rect en principal → target Ciudad → save hotspots
  Seleccionar nav Ciudad → dibujar trazos (activeDrawingRef nav) → save_map_nav

Interactive:
  clic en zona (sin drag) → hitTest → navPush → compositor hijo
  MapTimelineBar: mismo T; composición = trazos nav only (v1)

Breadcrumb:
  Volver → navPop → compositor principal + parches T
```

---

## 6. OBS — eventos

Ver §3 D11. Emitir compositor al push/pop, al cambiar hotspots y al seleccionar nav en edición.

---

## 7. Fases de ejecución

```text
Fase 1   Tipos TS + MapDrawingRef nav + mapHotspotHitTest + hostRef keys + tests coords
Fase 2   Rust: schema nav + hotspots tipados, CRUD, expand/crop nav, RMW save + cargo test
Fase 3   IPC commands + useMapProject (navFiles, hotspots, saveActiveDrawing nav)
Fase 4   useMapStore navStack push/pop + reset; draft/sessionKey/guards nav ref
Fase 5   Compositor: rama navStack en MapWorkspace + useMapViewport
         ★ Checkpoint: seed hotspot manual → clic → hijo → volver (sin panel UI completo)
Fase 6   MapViewport hit-test (clic vs pan) + overlay rects edit
Fase 7   MapNavBreadcrumb + MapNavDrawingsPanel + MapHotspotsPanel + crear hijo inline
Fase 8   MapHotspotEditor (rect drag) + save hotspots
Fase 9   OBS nav/hotspot/navSelect + compositor navDepth + timeT
Fase 10  i18n + npm test + build + cargo test maps_store
Fase 11  QA manual §9 + cerrar §12
```

**Checkpoint Fase 5:** 1 hotspot en principal (JSON seed o panel mínimo) → clic interactivo → ves hijo → volver → parches T intactos.

---

## 8. Verificación automatizada

| Comando | Esperado |
|---------|----------|
| `npm test -- --run` | + hit-test, hostRef keys, drawingRefKey nav, store navStack reset |
| `npm run build` | OK |
| `cd src-tauri && cargo test maps_store` | + nav CRUD, hotspots validate, expand/crop nav, RMW save |

---

## 9. QA manual (recorrido OBS)

**Precondiciones:** mapa con trazos en principal; OBS ON; MAP-009 scrubber operativo; mapa QA `map_677dcb30b6effbf4` opcional.

| Paso | Acción | Esperado |
|------|--------|----------|
| 1 | Crear nav «Ciudad» | `drawings/nav/nav-*.json` |
| 2 | Crear hotspot rect en **principal** → Ciudad | `hotspots.json` persistido; `hostDrawingRef: principal` |
| 3 | Edición: seleccionar nav Ciudad en panel → dibujar trazos | Trazos en archivo nav; `saveDrawing` OBS `drawingRef: nav:…` |
| 4 | Interactive: clic hotspot (sin arrastrar pan) | `navPush`; vista hijo en viewport |
| 5 | Scrubber T en hijo | T cambia valor; composición hijo = trazos nav (v1: sin parches hijo) |
| 6 | Volver | `navPop`; vista principal + parches T previos |
| 7 | Edit: clic zona hotspot | **No** navega |
| 8 | Expandir lienzo | nav + principal + secundarios mismas dimensiones |
| 9 | Eliminar nav referenciado | Error UI |
| 10 | Cambiar mapa con navStack > 0 | Stack vacío; T del mapa destino restaurado |
| 11 | OBS | eventos §6 + compositor `navDepth`, `timeT` |

| Paso | Resultado QA (`1512` / `8868`) |
|------|--------------------------------|
| 1–2 | ✅ nav + hotspot persistidos; `hotspotCreate` en OBS |
| 3 | ✅ `navSelect` + `drawStroke` en nav (`8868`) |
| 4–6 | ❌ sin `navPush`/`navPop`; compositor `navDepth` siempre 0 |
| 7 | — no recorrido |
| 8–10 | — no recorrido |
| 11 | ⚠️ parcial — `hotspot*`/`navSelect` sí; push/pop no |

**Sesiones OBS:** `1781902329565-1512` (principal) · `1781902875392-8868` (follow-up trazos nav)

**Resultado global:** persistencia + paneles + edición nav/hotspots **validados**; flujo interactivo push/pop/breadcrumb **no validado** en OBS (ver §12.1).

---

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Confundir `activeDrawingRef` y `navStack` | D2 invariante; code review; OBS `navSelect` vs `navPush` |
| Hit-test desalineado con zoom/pan | Tests con transform; `screenToDocument`; umbral 5 px |
| Clic hotspot interpretado como pan | D8 clic-vs-pan explícito |
| Hotspots huérfanos (nav borrado) | Validación delete + lint en save |
| `save_map_nav` pisa metadatos | RMW MAP-008 §12.1 + test Rust |
| Secundarios / parches en hijo v1 | Documentado v1.1; QA paso 5 acotado |
| Anidación >1 sin hotspots en nav | v1.1; C8 acotado |
| Regresión T / parches MAP-009 | QA pasos 5–6; no reset T en push/pop |
| Regresión trazos a principal | QA paso 3 + OBS `drawingRef` |

---

## 11. Handoff → MAP-011

MAP-011 tomará:

- **Compositor overlay** — capa X ubicación manuscrito @ T (encima de nav/parches).
- **`navStack` + `previewTimeTRaw` / `timeT`** — marcas X visibles en hijo con mismo T.
- **`MapDrawingRef` nav** — edición trazos hijo ya operativa.
- **Sin cambios** schema nav/hotspots salvo convivencia en `paintMapViewport`.

MAP-010 **no** implementa marcas X ni integración WB.

**Polish diferido:** [`MAP-009 §13`](MAP-009-map-timeline-scrubber.md), QA MAP-008 §9 pendiente — paralelo opcional.

**v1.1 MAP-010:** hotspots en nav host + parches temporales en hijo + anidación profunda (§1.5).

---

## 12. Registro

| Fecha | Evento |
|-------|--------|
| 2026-06-11 | Plan MAP-010 redactado (auditoría post MAP-009 ✅ + spec §5 + handoff MAP-009 §11) |
| 2026-06-11 | **Auditoría pre-implementación** — §2.6; corrección C2/C7/C8, D2 (`MapDrawingRef` nav), D6 alcance v1, QA paso 3/10, fases alineadas MAP-008/009 |
| 2026-06-11 | **Implementación Fases 1–11** — `drawings/nav/`, `hotspots.json` tipado, IPC, `useMapProject`, `navStack`, compositor rama nav, paneles + editor rect, OBS `navSelect`/`hotspot*` |
| 2026-06-11 | **Tests automatizados** — `npm test` 313 OK · `npm run build` OK · `cargo test maps_store` nav/hotspots/expand/crop |
| 2026-06-11 | **QA parcial** — sesiones OBS `1781902329565-1512` + `1781902875392-8868`, mapa `map_677dcb30b6effbf4`; ver §12.1 |
| 2026-06-11 | **✅ Cierre MAP-010** — criterios de infraestructura C1–C2, C6, C9–C14, C16 cumplidos; C3–C5 sin evidencia OBS; UX/deuda → §13; handoff MAP-011 §11 |

### 12.1 QA sesiones `1781902329565-1512` · `1781902875392-8868`

**Mapa:** `map_677dcb30b6effbf4` · **T inicial:** `15.7.2025` (`previewTSet` `source: mapLoad`)

**Validado en action log (`1512`):**
- `setViewMode` edit ↔ interactive
- `navSelect` → `nav:nav-729f7219`, luego `nav:nav-f83f7659`
- `hotspotCreate` / `hotspotDelete` (varios ids: `hs-56a88993`, `hs-2ae84bb4`, `hs-5f9d150d`)
- `drawStroke` con `activeDrawingRef` nav (compositor L187+ en render log)
- Compositor reporta `hostHotspotCount: 1` tras crear hotspot

**Validado en action log (`8868`):**
- `navSelect` + `drawStroke` en nav activo
- Guard dirty MAP-005b: `unsavedDialog` + `unsavedChoice: cancel` al intentar cambiar mapa

**No observado en ninguna sesión (deuda QA):**
- `navPush` / `navPop` — **ausentes** en action session y verbose
- Compositor con `navDepth > 0` o `activeNavId` distinto de null
- Breadcrumb visible (requiere `navStack.length > 0`)
- Pasos §9.5–6 (scrubber en hijo tras push), §9.8–10 (expand/delete nav referenciado / cambio mapa con stack)

**Hallazgos UX (usuario + render log):**
- Panel **Dibujos hijo** quedaba oculto bajo **Hotspots** (layout columna izq.; fix documentado post-QA en código, pendiente re-verificar)
- Tras salir a interactivo, compositor mantiene `activeDrawingRef: nav:…` con `navDepth: 0` — mezcla confusa entre edición activa y vista raíz (§13 H2)
- Intento interactivo en `1512` (L22–23): pan viewport sin `navPush` — clic hotspot no confirmado o interpretado como pan

**Evidencia:** `_debug/action-logs/action-session-1781902329565-1512.ndjson`, `action-session-1781902875392-8868.ndjson`, `_debug/render-logs/ui-session-1781902329565-1512.ndjson` (compositor L141+)

### 12.2 Decisión de cierre

| Aspecto | Decisión |
|---------|----------|
| **Bloqueante MAP-011** | No — schema nav/hotspots, `MapDrawingRef` nav, compositor con campos `navDepth`/`timeT`, pipeline edición hijo operativos |
| **C3–C5 (push/pop/T)** | Implementados en código; **QA OBS pendiente** — no reabrir plan salvo regresión en sprint polish |
| **Polish §13** | Diferido — sprint dedicado post-MAP-011 o junto MAP-009 §13 |
| **QA formal §9** | Parcial aceptada con evidencia sesiones 1512 + 8868 |

---

## 13. Reajustes futuros (polish — no bloqueante MAP-011)

> **Decisión 2026-06-11:** infraestructura nav/hotspots **entregada**; UX interactiva y layout lateral **incompletos** en QA. Retomar en sprint polish (junto [`MAP-009 §13`](MAP-009-map-timeline-scrubber.md) recomendado).

| ID | Tema | Detalle |
|----|------|---------|
| H1 | **Layout columna izq.** | Tres paneles (Parches / Dibujos hijo / Hotspots) compiten altura; Dibujos hijo quedó ilegible en QA — reparto `flex` corregido post-sesión; **re-verificar** |
| H2 | **`activeDrawingRef` vs `navStack`** | Al pasar a interactivo, compositor puede quedar con `activeDrawingRef: nav:…` y `navDepth: 0` — confunde badge, composición y hit-test; resetear a `principal` al salir de edición o al push |
| H3 | **Clic hotspot interactivo** | Sin `navPush` en OBS: revisar clic-vs-pan 5 px, orden handlers en `MapViewport`, coords con zoom/pan |
| H4 | **Breadcrumb / Volver** | Depende de H3; validar `navPop` y clic segmentos |
| H5 | **Panel hotspots** | Mostrar nombre nav destino (no solo id); `hotspotUpdate` no expuesto en UI v1 |
| H6 | **QA §9 pendiente** | Pasos 7–10 (expand, delete nav referenciado, cambio mapa con stack) |
| H7 | **Polish transversal** | MAP-009 §13 scrubber · MAP-008 §9 parches — sin regresión al retocar compositor nav |

**v1.1 funcional** (schema ya preparado): hotspots en host nav, parches en hijo, anidación >1 — ver §1.5.

---
