# MAP-011 — Ubicaciones manuscrito → marcas **X** en T (stub Era III)

> **Estado:** 📋 **Planificado** (2026-06-11) — auditoría pre-implementación ✅ §2.6  
> **Esfuerzo:** Medio · **Riesgo:** Medio (extracción MS + regla §4bis.1 + capa compositor; sin WB)  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md) Fase F · **Spec:** [`maps-design.md`](../../maps-design.md) §4bis.1, §4bis.4.1, §8 · **Previo:** [MAP-010 ✅](MAP-010-hotspots-nav.md) · **Siguiente:** MAP-012

---

## 0. Convención

| Regla | Detalle |
|-------|---------|
| Flujo | Plan → ejecución → tests → QA/OBS → cerrar §12 → MAP-012 |
| Commits | Usuario |
| Evidencia | Recorrido QA §9 + sesión OBS post-implementación |
| OBS previo a planificar | **No requerido** — auditoría post MAP-010 + spec §4bis + handoff MAP-010 §11 |
| Dependencias | MAP-009 (T + scrubber) ✅ · MAP-010 (compositor nav + `timeT`) ✅ · Manuscrito Era II estable ✅ |
| Alcance código | **Frontend + Rust/IPC + compositor + OBS + tests** — schema `location-pins.json`; **sin** tabla SQLite nueva v1 |

**Contratos heredados (no renegociar):**

| Origen | Contrato MAP-011 |
|--------|------------------|
| MAP-004 §8 | Marcas X solo en **vista interactiva** (consumo); edición = anclar pins, no navegar |
| MAP-009 §11 / D11 | Compositor usa `resolveMapPreviewT(previewTimeTRaw, mapDesde)`; scrubber gobierna T |
| MAP-010 §11 | Mismo T en `navStack`; marcas X visibles en raíz **y** en dibujo hijo activo |
| maps-design §4bis.1 | Tiempo efectivo ubicación = **última etiqueta time** vigente en el segmento |
| maps-design §4bis.4.1 | Stub **«X»** en overlay compositor; **no** crear etiquetas MS desde mapa |
| MAP-010 §13 H2–H3 | Deuda nav push/pop — **no bloqueante** MAP-011; retocar compositor con cuidado |

---

## 1. Problema y objetivo

### 1.1 Problema (post MAP-010)

El compositor pinta principal + parches @ T + rama nav, pero **no consume ubicaciones del manuscrito**. La spec §4bis.4.1 promete marcas **X** donde hay ubicación vigente en **T**; hoy no hay extracción fiable ni coordenadas en lienzo.

| Carencia | Impacto |
|----------|---------|
| Sin lectura §4bis.1 (barTags + inline + orden) | Solo `TimelineEvent.location` desde metadata bloque — **insuficiente** |
| Sin coordenadas mapa ↔ ubicación | Imposible dibujar X en documento |
| Sin capa overlay ubicaciones en `paintMapViewport` | Compositor incompleto vs §8.1 |
| Sin persistencia anclajes | Cada sesión perdería posición |
| Sin panel anclaje stub | Usuario no puede colocar X para nombres del MS |
| OBS compositor sin `locationCount` | No auditar integración T ↔ ubicaciones |
| `expand/crop` no sincroniza pins | Desalineación tras redimensionar lienzo |

**Lo que ya funciona (no reimplementar):**

- `useProjectTimeline()` + `get_timeline_events` — fuente auxiliar, no canónica §4bis.1.
- `parseInlineTagsInText`, `BarTag`, segmentos evento (Rust + TS).
- `resolveMapPreviewT`, `isSecondaryVisibleAtT`, `MapTimelineBar`.
- Compositor `paintMapViewport`, `drawHotspotOverlays` (patrón overlay).
- `screenToDocument` / viewport transform.
- IPC mapas (`maps_store.rs`) — patrón CRUD para nuevo archivo pins.

### 1.2 Objetivo MAP-011

Entregar **visualización stub Era III** de ubicaciones del manuscrito en el mapa activo:

1. **Extracción** — ocurrencias ubicación con tiempo efectivo §4bis.1 (proyecto completo).
2. **Filtro @ T** — cuáles aplican en `previewTimeTRaw` resuelto.
3. **Anclajes** — `location-pins.json` por mapa: `locationKey` → `{ x, y }`.
4. **Compositor** — dibujar **«X»** en interactivo (y preview anclaje en edición).
5. **UI edición** — panel colocar/mover pins **sin** crear etiquetas MS.
6. **Sync geometría** — `expand/crop` actualiza pins como nav/hotspots bounds.
7. **OBS + tests** — algoritmo §4bis.1, filtro T, compositor `locationCountAtT`.

### 1.3 Criterios de aceptación

| # | Criterio |
|---|----------|
| C1 | Comando/listado devuelve ocurrencias MS con `effectiveTimeRaw` + `locationKey` + provenance |
| C2 | Regla §4bis.1: ubicación hereda última marca **time** anterior en el mismo segmento (bar + inline por orden) |
| C3 | En **T**, solo ocurrencias cuyo tiempo efectivo **coincide** con T (mismo día absoluto calendario) — ver D3 |
| C4 | Usuario ancla pin en edición → persiste en `location-pins.json` |
| C5 | **Interactivo**: scrubber T → X aparecen/desaparecen acorde C3; **sin** X en edición salvo ghost de colocación |
| C6 | X en capa overlay compositor — **no** en `drawing.json` |
| C7 | Con `navStack.length > 0`, mismas X @ T sobre lienzo hijo (coords documento compartidas) |
| C8 | `expand/crop` mantiene pins dentro de lienzo (clip o reject save) |
| C9 | Recarga tras guardar manuscrito actualiza ocurrencias sin reiniciar app |
| C10 | OBS: `locationPin*` + compositor `locationCountAtT`, `unpinnedLocationCount` |
| C11 | Tests: extracción §4bis.1, filtro T, normalización keys, expand/crop pins |
| C12 | i18n ES/EN `location.*` |
| C13 | **No** crear `{{location:…}}` ni metadata MS desde clic mapa |
| C14 | Sin regresión MAP-009/010: parches, scrubber, hotspots, guards dirty |

### 1.4 Fuera de alcance MAP-011 (v1)

| Tema | Plan |
|------|------|
| Iconos por personaje / entidad | **WB v2** §4bis.4.3 |
| Filtros por personaje, rutas, zonas | Post-WB |
| Clic X → abrir ficha WB / manuscrito | v1.1 opcional |
| Resolución automática nombre → path WB | v1.1 |
| Polígonos / áreas ubicación | Post-WB (legacy Leaflet purgado) |
| Hotspots en nav host | MAP-010 §1.5 v1.1 |
| MAP-010 §13 polish (nav push, layout) | Sprint paralelo recomendado |
| MAP-009 §13 polish scrubber | Sprint paralelo |
| Index SQLite `location_markers` | v1.1 si rendimiento lo exige |

### 1.5 Roadmap v1.1 (post MAP-011)

| Tema | Notas |
|------|-------|
| Clic X → navegar a segmento MS | `obs.action.map.locationOpen` |
| Auto-sugerir pin desde hotspot / centro viewport | UX |
| Múltiples pins mismo `locationKey` @ distintos mapas | Ya implícito por mapa |
| Host nav: pins scoped por `MapHostDrawingRef` | Solo si MAP-010 v1.1 hotspots en nav |

---

## 2. Auditoría (estado repo jun 2026, post MAP-010)

### 2.1 Lo que ya existe (reutilizar)

| Pieza | Archivo | Notas |
|-------|---------|-------|
| Etiquetas inline | `inlineTagSyntax.ts` | `{{location:…}}` parseable; mismo regex Rust |
| BarTags segmento | `manuscript.ts`, `parser/types.rs` | `type: "location"` en tests |
| Timeline proyecto | `timeline/project.rs`, `useProjectTimeline` | `location` solo metadata bloque — **parcial** |
| Tiempo efectivo bloque | `resolveBlockTime.ts`, `collectTimeTagsFromBlock` | Solo tags **time** — plantilla algoritmo |
| Calendario / sort keys | `dateTags`, `toAbsoluteDay`, `mapSecondaryVisibility` | Reutilizar para comparar T |
| Compositor | `useMapViewport.ts` → `paintMapViewport` | Añadir `drawLocationMarkers` |
| Overlay hotspots | `drawHotspotOverlays` | Patrón capa no persistente |
| Preview T | `mapPreviewT.ts`, `useMapStore` | Sin cambios contrato |
| Nav compositor | `MapWorkspace` rama `isNavView` | Pasar mismos markers |
| Maps store | `maps_store.rs` | CRUD archivo JSON por mapa |
| OBS map | `events.ts`, `UI_EVENTS.maps.compositor` | Ampliar payload |

### 2.2 Gaps a cerrar

| Gap | Severidad |
|-----|-----------|
| Sin extracción §4bis.1 (bar location + inline location + orden) | 🔴 Bloqueante |
| Sin `location-pins.json` schema + IPC | 🔴 Bloqueante |
| Sin filtro ocurrencias @ T | 🔴 Bloqueante |
| Sin render X en compositor | 🔴 Bloqueante |
| Sin UI anclaje pins edición | 🟠 Alto UX |
| `expand/crop` ignora pins | 🟠 Alto |
| Timeline `location` ≠ regla §4bis.1 | 🔴 Bloqueante lógica |
| Sin refresh ocurrencias al guardar MS | 🟠 Medio |

### 2.3 Hardcodes / comportamiento actual

| Ámbito | Valor real |
|--------|------------|
| `TimelineEvent.location` | `metadata.location` del **bloque** indexado junto a cada `time_marker` — no recorre barTags location ni inline |
| Insertar ubicación en editor | **No** hay `insertLocationTag` en UI (solo `insertTimeTag`) — QA usar barTags YAML / inline manual |
| Compositor OBS | `hostHotspotCount`, `navDepth`, `timeT` — sin campos location |
| Disco mapa QA | Sin `location-pins.json` — crear en `create_blank_map` vacío |
| WB `get_location_inhabitants` | Relación inversa ficha→personajes — **no** coords mapa |

### 2.4 Legacy útil (solo docs)

| Referencia | Ubicación | Uso |
|------------|-----------|-----|
| Leaflet pines/polígonos | MAP-000 purgado | **No** reutilizar código; solo recordatorio visual |
| §4bis.4.2 | `maps-design.md` | X es temporal — diseñar overlay intercambiable |

### 2.5 OBS previo a planificar

**No requerido.** Handoff MAP-010 §11 + auditoría §2 + spec §4bis.4.1 bastan.

### 2.6 Pre-vuelo (auditoría 2026-06-11)

> Veredicto: **seguro planificar**; **riesgo medio** en algoritmo §4bis.1 y decisión coords (D4). Recomendar sprint corto MAP-010 §13 antes de QA integrada nav+X.

| # | Check | Estado |
|---|-------|--------|
| 1 | MAP-009 + MAP-010 cerrados funcionalmente (infra) | ✅ |
| 2 | Spec §4bis.1 / §4bis.4.1 acotan stub vs WB | ✅ |
| 3 | Coordenadas: pins mapa ≠ etiquetas MS (D4) | 📋 decisión cerrada en plan |
| 4 | Regla visibilidad @ T unívoca (D3) | 📋 |
| 5 | Compositor nav + X mismo T (MAP-010 handoff) | 📋 D7 |
| 6 | No regresión expand/crop | 📋 D8 + tests |
| 7 | Manuscrito estable (Era II) para index/blocks | ✅ |
| 8 | MAP-010 navPush sin QA OBS | ⚠️ no bloqueante MAP-011; probar X en raíz primero |

**Hallazgo auditoría código:**

- La timeline actual **no implementa** §4bis.1; MAP-011 **debe** nuevo pipeline `ProjectLocationOccurrence[]`, no reutilizar solo `TimelineEvent.location`.
- Las coordenadas **no existen** en MS/WB v1; stub **requiere** `location-pins.json` (anclaje manual en edición — distinto de «crear etiqueta desde mapa» §4bis.4.1).

---

## 3. Decisiones de diseño

### D1 — Modelo ocurrencia (RAM / IPC)

```typescript
/** Una aparición de etiqueta ubicación en manuscrito con tiempo efectivo §4bis.1. */
export interface ProjectLocationOccurrenceV1 {
  id: string; // estable: `{path}::seg::{i}::bar|inline::{idx|offset}`
  locationKey: string; // normalizado D2
  label: string; // texto original etiqueta
  effectiveTimeRaw: string;
  effectiveTimestamp: string | null; // sort key calendario si resuelve
  sourcePath: string;
  segmentId: string | null;
  tagKind: "bar" | "inline" | "metadata"; // metadata = legacy bloque
  charOffset?: number;
}

export function normalizeLocationKey(raw: string): string;
```

**Fuente v1:** comando Rust `list_project_location_occurrences_cmd` que escanea manuscritos indexados (blocks + metadata + body inline scan) — misma semántica que tests TS espejo.

### D2 — Normalización `locationKey`

| Regla | Detalle |
|-------|---------|
| Trim + colapsar espacios | `"  Ciudad  "` → `"Ciudad"` |
| Casefold UTF-8 | `"castillo"` y `"Castillo"` → misma key |
| Pin lookup | Por `locationKey`; `label` solo UI |
| Colisiones display | Panel muestra label original + path MS opcional |

### D3 — Visibilidad @ T (cerrada para v1)

| Regla | Detalle |
|-------|---------|
| Comparación | `toAbsoluteDay(effectiveTimeRaw) === toAbsoluteDay(previewT)` |
| Sin match calendario | Ocurrencia **excluida** (no fallback sloppy) |
| Sin preview T | Usar `resolveMapPreviewT` → si null, **0** X |
| Múltiples ocurrencias misma key @ mismo T | **Una X** por pin (dedupe por `locationKey` al pintar) |
| T distinto día | Ubicaciones de otros días **no** visibles (ejemplo spec §4bis.1 A,B @ X; C @ Y) |

### D4 — Anclajes `location-pins.json` (coords stub)

```typescript
interface MapLocationPinsFileV1 {
  version: 1;
  pins: MapLocationPinV1[];
}

interface MapLocationPinV1 {
  id: string; // pin-{uuid8}
  locationKey: string;
  label?: string; // override display
  x: number;
  y: number;
  updatedAt: string;
}
```

| Decisión | Detalle |
|----------|---------|
| Archivo | `{mapId}/location-pins.json` — junto `hotspots.json` |
| create map | Archivo vacío `{ version: 1, pins: [] }` |
| Un pin por `locationKey` v1 | Segundo pin misma key → error save o replace |
| Colocación | **Modo edición**: panel + clic/drag en viewport — **no** escribe MS |
| Sin pin | Ocurrencia @ T **no** dibuja X (lista «sin anclar» en panel) |

> **Alineación spec:** §4bis.4.1 prohíbe «colocar ubicación desde mapa (clic → crea etiqueta)». Los **pins** son metadatos **del mapa**, no etiquetas MS — permitidos como anclaje visual stub.

### D5 — Algoritmo §4bis.1 (extracción por segmento evento)

```text
effectiveTimeRaw ← null
Para cada token en orden documento (barTags en orden YAML, luego inline por charOffset):
  Si token.type === "time"  → effectiveTimeRaw ← token.value
  Si token.type === "location" Y effectiveTimeRaw != null:
       emitir ocurrencia(location, effectiveTimeRaw)
Legacy metadata.location en bloque evento:
  Si metadata.location Y effectiveTimeRaw (último time del segmento):
       emitir ocurrencia (kind: metadata)
```

Tests obligatorios con secuencia spec §4bis.1 (A,B @ X; C @ Y).

### D6 — Compositor — orden de capas

```text
1. baseImage (si hay)
2. principal strokes (+ preview stroke)
3. secondary overlays @ T
4. nav child strokes (si navStack > 0)
5. location X markers @ T (solo interactive; ver D9)
6. hotspot overlays (solo edit, MAP-010)
```

Función pura: `drawLocationMarkers(ctx, markers: LocatedMarker[])`.

### D7 — Nav + T

| Estado | Comportamiento |
|--------|----------------|
| `navDepth === 0` | X @ T sobre composición principal + parches |
| `navDepth > 0` | X @ T sobre trazos hijo; **mismas coords** documento (2400×1600 compartido) |
| push/pop | **No** reset T; recalcular filtro ocurrencias |

### D8 — expand / crop pins

| Operación | Regla |
|-----------|-------|
| expand | Sumar `deltaX/deltaY` a `x/y` de cada pin (igual strokes) |
| crop | Eliminar pins fuera lienzo **o** clamp a borde — **elegir clamp** + test; rechazar save si fuera (consistente hotspots) |

Reutilizar helpers `clip_*` de `maps_store.rs` si existen para bounds.

### D9 — Modos vista

| Modo | X markers |
|------|-----------|
| **interactive** | X visibles @ T para pins anclados |
| **edit** | Ghost pins al colocar/mover; lista ocurrencias sin pin |
| **edit** colocación activa | Crosshair; no confundir con hotspot rect tool |

### D10 — IPC Rust

| Comando | Args | Returns |
|---------|------|---------|
| `list_project_location_occurrences_cmd` | `{ projectRoot? }` | `ProjectLocationOccurrenceV1[]` |
| `get_map_location_pins_cmd` | `mapId` | `MapLocationPinsFileV1` |
| `save_map_location_pins_cmd` | `mapId`, `file` | `()` |

**Principal / nav / secondary / hotspots:** sin cambio firma.

`save_map_location_pins`: validar bounds dentro lienzo `map.json`; keys no vacías.

### D11 — OBS

**Acciones (`events.ts`):**

| Evento | Payload |
|--------|---------|
| `obs.action.map.locationPinCreate` | `{ mapId, pinId, locationKey, x, y }` |
| `obs.action.map.locationPinMove` | `{ mapId, pinId, x, y }` |
| `obs.action.map.locationPinDelete` | `{ mapId, pinId, locationKey }` |

**Compositor ampliado:**

```typescript
{
  locationCountAtT: number;
  unpinnedKeysAtT: number;
  pinnedKeysTotal: number;
  // existentes: timeT, navDepth, hostHotspotCount, …
}
```

### D12 — Integración MapWorkspace layout

```text
Edit (columna izq., !isNavView):
  Parches → Dibujos hijo → Hotspots → **Ubicaciones** (nuevo panel)
    · lista ocurrencias @ T preview (readonly)
    · pins anclados
    · botón «Colocar pin» / seleccionar key sin pin

Interactive:
  compositor X @ T
  scrubber sin cambios
```

Panel **Ubicaciones** altura flexible — aplicar lección MAP-010 §13 H1 (`flex basis-0`).

---

## 4. Esquema e IPC

### 4.1 Layout disco (ampliación §9.2)

```text
{mapId}/
  location-pins.json    ← MAP-011
  hotspots.json
  drawings/…
```

### 4.2 Tipos TS (`src/lib/types/maps.ts`)

Añadir `MapLocationPinV1`, `MapLocationPinsFileV1` + export en hook.

Tipos ocurrencia en `src/lib/types/mapLocations.ts` (nuevo) para no hinchar `maps.ts`.

### 4.3 Módulos puros TS

| Módulo | Rol |
|--------|------|
| `mapLocationKeys.ts` | `normalizeLocationKey` |
| `mapLocationOccurrences.ts` | Parse segmento §4bis.1 (tests + fallback si IPC falla) |
| `mapLocationAtT.ts` | `filterOccurrencesAtT`, `mergeOccurrencesWithPins` |
| `mapLocationMarkers.ts` | `drawLocationMarkers(ctx, markers)` |

---

## 5. Frontend — componentes

| Archivo | Rol |
|---------|-----|
| `hooks/useProjectLocations.ts` | Carga ocurrencias; reload on MS save (par `useProjectTimeline`) |
| `hooks/useMapLocationPins.ts` | get/save pins vía `useMapProject` ampliado |
| `hooks/useMapLocationPinGesture.ts` | clic colocar / drag mover pin (edit) |
| `modules/maps/MapLocationsPanel.tsx` | Lista ocurrencias, pins, acciones |
| `MapWorkspace.tsx` | Wiring T → filter → viewport |
| `MapViewport.tsx` | Pasar `locationMarkers`, modo colocación |
| `useMapViewport.ts` | Llamar `drawLocationMarkers` en paint |

---

## 6. Flujos

### 6.1 Interactivo @ T

```text
previewTimeTRaw + calendar + occurrences
  → filterOccurrencesAtT
  → join pins by locationKey
  → paintMapViewport → drawLocationMarkers (X)
  → OBS compositor locationCountAtT
```

### 6.2 Edición — anclar pin

```text
Panel: elegir locationKey sin pin
  → modo colocación
  → clic viewport → { x, y }
  → save_map_location_pins_cmd
  → trackAction locationPinCreate
```

### 6.3 Manuscrito actualizado

```text
Guardar MS / metadata
  → useProjectTimeline reload (existente)
  → useProjectLocations reload
  → recomponer X @ T
```

---

## 7. Fases de ejecución

```text
Fase 1   Tipos + normalizeLocationKey + algoritmo §4bis.1 TS + tests (fixtures spec)
Fase 2   Rust: list_project_location_occurrences + location-pins CRUD + expand/crop sync + cargo test
Fase 3   IPC commands + useMapProject (pins) + useProjectLocations hook
Fase 4   mapLocationAtT + merge pins + tests filtro T
Fase 5   Compositor drawLocationMarkers + wiring MapWorkspace/Viewport (solo interactive)
         ★ Checkpoint: MS con 2 ubicaciones @ días distintos → scrub → X aparecen/desaparecen
Fase 6   MapLocationsPanel + gesto colocar/mover pin (edit)
Fase 7   expand/crop sync pins + panel unpinned list
Fase 8   OBS locationPin* + compositor fields + i18n
Fase 9   npm test + build + cargo test maps_store
Fase 10  QA manual §9 (+ opcional re-QA nav MAP-010 §13) + cerrar §12
```

**Checkpoint Fase 5:** manuscrito QA con `{{time:15.7.2025}}` + `{{location:Castillo}}` en segmento; pin anclado manual JSON → interactivo T=15.7.2025 muestra X.

---

## 8. Verificación automatizada

| Comando | Esperado |
|---------|----------|
| `npm test -- --run` | + §4bis.1, normalizeKey, filterAtT, mergePins |
| `npm run build` | OK |
| `cd src-tauri && cargo test maps_store` | + location pins CRUD, bounds, expand/crop |
| `cargo test location_occurrences` (nuevo módulo) | extracción bar+inline |

---

## 9. QA manual (recorrido OBS)

**Precondiciones:** calendario proyecto configurado; manuscrito con eventos + barTags/inline time+location; mapa `map_677dcb30b6effbf4` o similar; OBS ON; MAP-009 scrubber ON.

| Paso | Acción | Esperado |
|------|--------|----------|
| 1 | MS: evento con time X + location A y B (sin nueva time entre medias) | 2 ocurrencias @ X en listado proyecto |
| 2 | MS: nueva time Y + location C | C @ Y; A,B siguen @ X |
| 3 | Editar mapa: anclar pin A, B, C en coords distintas | `location-pins.json` persistido |
| 4 | Interactivo T=X | X visibles en A y B (misma T) |
| 5 | Scrub T=Y | Solo X de C |
| 6 | Scrub T sin ubicaciones | Sin X |
| 7 | Entrar nav hijo (si MAP-010 push OK) | X @ T siguen visibles |
| 8 | Editar: mover pin | `locationPinMove` OBS |
| 9 | Expandir/recortar lienzo | pins coherentes |
| 10 | Guardar MS (nueva location @ T) | Panel/ocurrencias refresh |
| 11 | OBS compositor | `locationCountAtT`, `timeT` |

**Sesiones OBS:** _(rellenar post-implementación)_

---

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| §4bis.1 distinto a expectativa usuario | Tests fixture spec §4bis.1; documentar en panel |
| Sin UI insert location MS | QA con inline/bar manual; no bloquear MAP-011 |
| Pins manuales tediosos | v1.1 auto-suggest; lista unpinned clara |
| MAP-010 nav push roto | QA paso 7 opcional; X validable solo en raíz |
| Rendimiento scan MS grande | límite 5k ocurrencias + cache en hook |
| Confundir pin con etiqueta MS | Copy i18n D4; OBS `locationPin*` ≠ editor insert |
| Regresión compositor hotspots | Orden capas D6; no tocar hit-test hotspot |
| expand/crop desync | Tests Rust + QA paso 9 |

---

## 11. Handoff → MAP-012

MAP-012 tomará:

- **Smoke Era III** — mapas + MS + X @ T + nav + parches en un recorrido.
- **Purge legacy** — grep Leaflet/Excalidraw restantes.
- **Polish acumulado** — MAP-009 §13, MAP-010 §13, MAP-008 §9 QA.

MAP-011 **no** implementa WB ni edición bidireccional MS.

**Recomendación:** cerrar MAP-010 §13 (nav push) **antes** o **en paralelo** con MAP-011 Fase 5–7 para QA integrada nav + ubicaciones.

---

## 12. Registro

| Fecha | Evento |
|-------|--------|
| 2026-06-11 | Plan MAP-011 redactado (auditoría post MAP-010 ✅ + spec §4bis.4.1 + handoff MAP-010 §11) |
| 2026-06-11 | **Auditoría pre-implementación** — §2.6; gaps timeline vs §4bis.1; decisión pins D4; visibilidad T D3 |

---

**Última actualización:** 2026-06-11
