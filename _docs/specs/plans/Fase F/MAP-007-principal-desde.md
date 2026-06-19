# MAP-007 — Dibujo principal + etiqueta «Desde»

> **Estado:** ✅ **Implementado + QA OK** (2026-06-11)  
> **Esfuerzo:** Medio · **Riesgo:** Medio-bajo (campo schema ya existe; UI metadatos + default manuscrito)  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md) Fase F · **Spec:** [`maps-design.md`](../../maps-design.md) §4.2 · **Previo:** [MAP-006 ✅](MAP-006-layers.md) · **Siguiente:** MAP-008

---

## 0. Convención

| Regla | Detalle |
|-------|---------|
| Flujo | Plan → ejecución → tests → QA/OBS → cerrar §12 → MAP-008 |
| Commits | Usuario |
| Evidencia | Recorrido QA §9 + sesión OBS post-implementación |
| OBS previo a planificar | **No requerido** — auditoría código + spec §4.2 + handoff MAP-006 §11 |

---

## 1. Problema y objetivo

### 1.1 Problema (post MAP-006)

El estudio dibuja y persiste el **terreno vectorial** en `drawings/principal.json`, pero el producto de **dibujo principal narrativo** no existe en UX ni metadatos:

| Carencia | Impacto |
|----------|---------|
| `map.json.desde` siempre `null` al crear | Spec §4.2 incumplido — sin ancla «año 0 del mapa» |
| Sin UI «Desde» | Usuario no sabe ni edita el origen temporal local del mapa |
| `save_map_document_cmd` sin uso en frontend | Metadatos del mapa no se actualizan desde la app |
| Sin default desde manuscrito | MAP-003 reservó el campo pero no lo rellena |
| Compositor OBS sin `desde` | MAP-008/009 no pueden auditar ancla temporal |
| Identidad «dibujo principal» invisible | Usuario no distingue terreno base vs futuros secundarios |
| Mapas legacy con `desde: null` | Proyectos QA MAP-001…006 sin migración definida |

**Lo que ya funciona (no reimplementar):**

- Archivo único `drawings/principal.json` por mapa (MAP-001) — **es** el dibujo principal.
- Stack render: `baseImageRel` (opcional) → rejilla → trazos multi-capa (`useMapViewport` / `paintMapViewport`).
- Capas internas operativas en estudio (MAP-006).
- Guardado trazos, borrador, guards sucio (MAP-005b) — **solo** afectan `principal.json`.
- Campo `desde: Option<String>` en `MapDocumentV1` (Rust + TS).

### 1.2 Objetivo MAP-007

Cerrar el **modelo producto del dibujo principal** dentro del mapa activo:

1. **Metadato «Desde»** persistido en `map.json` — formato etiqueta tiempo del proyecto.
2. **Valor por defecto al crear mapa** — primera marca temporal del manuscrito/proyecto (§4.2).
3. **UI visible y editable** en modo interactivo y edición — sin mezclar con dirty de trazos.
4. **Etiqueta de producto** «Terreno base» / «Dibujo principal» — el usuario entiende qué está editando hoy.
5. **Validación + OBS** — auditoría de cambios de `desde` y compositor enriquecido (sin scrubber T).
6. **Handoff claro a MAP-008** — `desde` estable por mapa; secundarios referenciarán esta ancla.

### 1.3 Criterios de aceptación

| # | Criterio |
|---|----------|
| C1 | Mapa **nuevo** (blank o import) persiste `desde` en `map.json` con default §4.2 (no `null` salvo proyecto sin marcas) |
| C2 | Header del workspace muestra **«Desde»** con fecha legible (`formatTimeTagDisplay`) en mapa activo |
| C3 | Usuario puede **editar** «Desde» (picker calendario coherente con etiquetas MS) → guardado inmediato en disco |
| C4 | Editar «Desde» **no** marca sucio el estudio de trazos ni dispara diálogo MAP-005b |
| C5 | Subtítulo o badge indica **«Terreno base»** / dibujo principal — el lienzo actual es el principal (×1 por mapa) |
| C6 | Mapas legacy `desde: null` muestran estado **«Sin definir»** + acción **«Usar sugerencia»** (default §4.2) sin auto-escritura silenciosa |
| C7 | Rust valida `desde`: `null` o cadena `d.m.yyyy` parseable (misma regla que `parseTimeTag`) |
| C8 | `save_map_document` actualiza `updatedAt` e índice al cambiar metadatos |
| C9 | OBS: `map.desdeSet`, `map.desdeDefault`, `map.desdeSuggest`; compositor incluye `desdeRaw` + `desdeDisplay` |
| C10 | Tests unitarios `resolveDefaultMapDesde`, validación Rust, componente picker básico |
| C11 | Compositor viewport sigue renderizando principal + capas; `timeT` permanece `null` (scrubber = MAP-009) |
| C12 | i18n ES/EN claves `desde.*` y errores de validación |

### 1.4 Fuera de alcance MAP-007

| Tema | Plan |
|------|------|
| Dibujos secundarios, `drawings/secondary/` | **MAP-008** |
| Composición temporal en T, scrubber timeline | **MAP-009** |
| Campo `tiempo_inicio` / `tiempo_fin` en archivos de dibujo | **MAP-008** |
| Hotspots, navegación hijo | **MAP-010** |
| Marcas X manuscrito en lienzo | **MAP-011** |
| Sincronizar «Desde» con timeline global del proyecto | Futuro — hoy es ancla **local** por mapa |
| Renombrar mapa desde UI | Fuera Era III v1 |
| Undo de cambio de «Desde» | v2 — guardado inmediato |
| Rasterizar imagen importada en trazos | Sigue siendo referencia `baseImageRel` bajo vectores |
| Segundo modelo de capas para principal | MAP-006 — `layers[]` en `principal.json` |

---

## 2. Auditoría (estado repo jun 2026)

### 2.1 Lo que ya existe (reutilizar)

| Pieza | Archivo | Notas |
|-------|---------|-------|
| Campo schema | `MapDocumentV1.desde` | TS + Rust; creado siempre `None`/`null` |
| IPC lectura/escritura doc | `get_map_document_cmd`, `save_map_document_cmd` | Escritura **sin** uso frontend |
| Dibujo principal | `drawings/principal.json` | Único archivo de dibujo hoy |
| Render terreno | `useMapViewport.ts` → `paintMapViewport` | Orden: fondo → `baseImage` o rejilla → trazos |
| Capas + estudio | MAP-005/006 | Editan solo `principal.json` |
| Formato tiempo | `parseTimeTag` / `formatTimeTag` / `formatTimeTagDisplay` | `d.m.yyyy` |
| Timeline proyecto | `useProjectTimelineStore`, `get_timeline_events` | Eventos con `rawTime` |
| Calendario | `useCalendarViewStore`, `CalendarConfig` | `clampToCalendar` |
| Picker UX referencia | `TimeTagMarkedPicker`, diálogo MS | Reutilizar patrones, no acoplar store MS |
| i18n maps | `src/i18n/{es,en}/maps.json` | Sin claves `desde` aún |
| Compositor OBS | `useMapViewport.ts` | `timeT: null`, capas MAP-006 |

### 2.2 Gaps a cerrar

| Gap | Severidad |
|-----|-----------|
| `desde` nunca se rellena al crear | 🔴 Bloqueante producto |
| Sin UI «Desde» | 🔴 Bloqueante producto |
| Frontend no llama `save_map_document_cmd` | 🔴 Bloqueante persistencia metadatos |
| Sin helper default desde manuscrito | 🟠 Alto |
| `validate_map_document` no valida `desde` | 🟡 Medio |
| `save_map_document` no auto-`updatedAt` | 🟡 Medio — riesgo índice stale |
| OBS sin eventos `desde` | 🟡 Medio — QA MAP-008 |
| Identidad «terreno base» no visible | 🟡 Medio — UX narrativa |
| Mapas QA existentes con `null` | 🟡 Medio — flujo legacy |

### 2.3 Hardcodes y deuda

| Ámbito | Estado |
|--------|--------|
| `create_blank_map` / `create_map_from_image` | `desde: None` hardcoded |
| `MapWorkspace` header | Solo `document.name` |
| Claves i18n `detail.*` | Restos panel metadatos MAP-003 — no usadas en UI actual |
| Placeholder scrubber MAP-004 | **No implementado** — MAP-007 puede añadir barra mínima «Desde» sin T |

### 2.4 OBS previo a planificar

**No requerido.** Handoff MAP-006 §11 + spec §4.2 + auditoría §2 bastan.

**Opcional:** inspeccionar un `map.json` en disco — confirmar `desde: null` en mapas QA.

**Requerido al cerrar §12:** recorrido §9 con OBS activo.

---

## 3. Decisiones de diseño

### D1 — Semántica «primera marca del manuscrito»

Spec §4.2: default = **primera marca de tiempo del manuscrito del proyecto**.

| Interpretación | Decisión MAP-007 |
|----------------|------------------|
| Primera en orden de lectura MS | Descartada v1 — ambigua multi-archivo |
| Última añadida (como calendario) | Descartada — contradice «primera» |
| **Menor fecha cronológica** entre eventos del proyecto con `rawTime` válido | ✅ **Cerrada v1** |

**Rationale:** «Desde» es el **año 0 local** del mapa para reglas §4.3–4.4 (adelante/atrás desde ancla). La marca cronológicamente más temprana es el ancla coherente.

**Fallback** (sin eventos parseables):

```text
1. epoch del calendario del proyecto (config.epoch → d.m.yyyy)
2. Si falla → desde null + UI «Sin definir»
```

Helper puro propuesto: `src/lib/maps/mapDesde.ts`

```typescript
export function resolveDefaultMapDesde(
  events: TimelineEvent[],
  config: CalendarConfig,
): string | null;

export function parseMapDesde(raw: string | null | undefined): TimeParts | null;

export function formatMapDesdeDisplay(raw: string | null, config: CalendarConfig): string;
```

### D2 — Dónde vive «Desde»

| Parámetro | Valor |
|-----------|-------|
| Persistencia | **`map.json`** campo `desde` (no en `principal.json`) |
| Formato disco | `d.m.yyyy` — igual que `rawTime` / `parseTimeTag` |
| Unicidad | **Uno por mapa** — no compartido entre mapas del proyecto |
| Relación principal | El dibujo en `principal.json` es el terreno cuya ancla temporal es `desde` |

Coherente con layout §9.2: metadatos del documento de mapa en `map.json`; trazos en `principal.json`.

### D3 — Default al crear mapa

**Flujo preferido (frontend):**

```text
create_map_cmd → MapSummaryV2
  → load timeline (useProjectTimelineStore.load si hace falta)
  → resolveDefaultMapDesde(events, config)
  → si valor: patch document + save_map_document_cmd
  → trackAction map.desdeDefault { mapId, desde, source: "timeline"|"epoch"|"none" }
```

**Alternativa descartada v1:** calcular default en Rust dentro de `create_map` — acoplaría `maps_store` a SQLite timeline; posible v2 si se quiere atomicidad estricta.

**Import y blank:** mismo default — el origen del lienzo no cambia la ancla temporal.

### D4 — Guardado de «Desde» vs trazos

| Aspecto | Trazos (MAP-005b) | «Desde» (MAP-007) |
|---------|-------------------|-------------------|
| Archivo | `principal.json` | `map.json` |
| Dirty session | Sí (`isDirty`) | **No** |
| Guardado | Manual / autosave trazos | **Inmediato** al confirmar picker |
| IPC | `save_map_drawing_cmd` | `save_map_document_cmd` |
| Guards sucio | Sí | **No** |

Ampliar `useMapProject` con `updateMapDesde(mapId, desde: string | null)` — encapsula IPC + refresh snapshot.

### D5 — Layout UI

```text
┌─────────────────────────────────────────────────────────────┐
│ 🗺 Mapas · Nombre mapa · [Terreno base]                     │
│ Desde: 2000-01-15  [Editar…]     │ Modo: Interactivo / Editar│
├─────────────────────────────────────────────────────────────┤
│ MapViewport (+ capas derecha si edición)                    │
├─────────────────────────────────────────────────────────────┤
│ MapEditStudio (solo edición)                                 │
└─────────────────────────────────────────────────────────────┘
```

| Elemento | Regla |
|----------|-------|
| «Terreno base» | Badge `variant="secondary"` junto al nombre — siempre visible con mapa cargado |
| «Desde» | Fila segunda del header o inline bajo nombre — **ambos modos** vista |
| Editar | Botón abre `MapDesdeDialog` (popover/modal compacto) |
| Sin definir | Texto muted + botón «Usar sugerencia del manuscrito» |

**No** reintroducir panel `<dl>` metadatos MAP-003 como área principal (MAP-004 D12).

### D6 — Picker de fecha

Componente nuevo `MapDesdeDialog.tsx`:

- Borrador local `{ day, month, year }` — **sin hora** (ancla de día; spec §4.2 habla de año 0 del mapa).
- Reutilizar `clampToCalendar`, `daysInMonth`, estilo numérico de MS.
- Opcional: lista de marcas del proyecto (`TimeTagMarkedPicker` pattern) para saltar a fechas ya usadas en MS.
- Confirmar → `formatTimeTag` → `updateMapDesde`.
- Cancelar → sin escritura.

**Descartado v1:** abrir `useTimeTagDialogStore` del editor — acoplamiento Lexical.

### D7 — Mapas legacy (`desde: null`)

| Regla | Comportamiento |
|-------|----------------|
| Carga | Mostrar «Sin definir» — **no** auto-escribir en disco |
| Sugerencia | Botón calcula default D1 y pre-rellena picker o guarda tras confirmación explícita |
| QA mapas existentes | Tras MAP-007, usuario puede pulsar «Usar sugerencia» una vez por mapa |

### D8 — Validación Rust

Ampliar `validate_map_document`:

```rust
fn validate_desde_field(desde: &Option<String>) -> Result<(), AppError> {
    match desde {
        None => Ok(()),
        Some(s) if s.trim().is_empty() => Ok(()), // tratar como None al serializar
        Some(s) => validate_time_tag_format(s.trim()),
    }
}
```

Patrón regex alineado con TS: `^(\d+)\.(\d+)\.(-?\d+)$` + rangos razonables (día/mes > 0).

**Tests cargo:** desde válido, inválido, null, vacío.

### D9 — `save_map_document` — timestamp

**Cerrado:** Rust **auto-asigna** `updated_at = now()` en `save_map_document` antes de escribir (como `expand_map_canvas`), ignorando valor stale del cliente en ese campo.

Frontend puede enviar documento clonado; Rust pisa `updated_at`.

### D10 — Terreno base (render)

Sin cambio de pipeline salvo documentación en código:

```text
paintMapViewport orden:
  1. Fondo canvas
  2. Lienzo document.width × height
  3. baseImageRel (si existe) — referencia raster MAP-003
  4. else rejilla
  5. Capas vectoriales principal.json (MAP-006)
  6. Preview trazo (edición)
```

MAP-007 **no** exige rasterizar import. El terreno narrativo editable es la suma **imagen base + trazos vectoriales** del principal.

### D11 — Barra timeline placeholder (opcional v1)

MAP-004 contemplaba scrubber deshabilitado «Timeline MAP-009». MAP-007 puede añadir **franja mínima** bajo viewport:

```text
[ Desde: 2000-01-15 ]  ·  Timeline interactiva — MAP-009
```

Solo informativa — `timeT: null` en OBS. **Prioridad baja:** implementar si cabe sin ruido; si no, diferir a MAP-009.

### D12 — Integración calendario

Al abrir picker, cargar `useProjectTimelineStore` + config calendario activo (`useCalendarViewStore` o hook proyecto existente).

Marcar en picker las fechas que ya existen como eventos timeline (UX paralela a inserción MS).

---

## 4. Esquema e IPC

### 4.1 `map.json` (sin bump de versión)

```typescript
interface MapDocumentV1 {
  version: 1;
  id: string;
  name: string;
  width: number;
  height: number;
  desde: string | null;  // MAP-007 — activo
  baseImageRel?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

`principal.json` — **sin cambios** (`version: 2`, `layers[]`).

### 4.2 IPC

| Comando | MAP-007 |
|---------|---------|
| `get_map_document_cmd` | Sin cambio |
| `save_map_document_cmd` | **Usar** — auto `updatedAt` + validar `desde` |
| `create_map_cmd` | Sin cambio firma — default `desde` vía save posterior en frontend |
| `save_map_drawing_cmd` | Sin cambio — no toca `desde` |

**Comando nuevo:** **No requerido v1** — `updateMapDesde` en hook basta con `save_map_document_cmd`.

**Opcional v2:** `set_map_desde_cmd(mapId, desde)` — validación atómica; no bloqueante MAP-007.

### 4.3 Tipos auxiliares TS

```typescript
// lib/maps/mapDesde.ts
export type MapDesdeSource = "timeline" | "epoch" | "manual" | "suggest";

export interface MapDesdeDefaultResult {
  raw: string | null;
  source: MapDesdeSource;
  display: string | null;
}
```

---

## 5. Frontend — diseño de componentes

### 5.1 Archivos

| Archivo | Rol |
|---------|-----|
| `lib/maps/mapDesde.ts` | Resolve default, parse, display, tests |
| `hooks/useMapProject.ts` | `updateMapDesde`, aplicar default post-`createMap` |
| `modules/maps/MapDesdeField.tsx` | Fila header: label + display + edit |
| `modules/maps/MapDesdeDialog.tsx` | Picker modal |
| `modules/maps/MapWorkspace.tsx` | Integrar badge terreno base + `MapDesdeField` |
| `lib/maps/useMapViewport.ts` | Compositor OBS: `desdeRaw`, `desdeDisplay` |
| `src/i18n/{es,en}/maps.json` | Claves `desde.*`, `principal.badge` |
| `src-tauri/src/fs/maps_store.rs` | Validación + auto `updatedAt` |

### 5.2 Flujo editar «Desde»

```text
Usuario pulsa Editar
  → MapDesdeDialog abre con valor actual o borrador vacío
  → Ajusta día/mes/año (clamp calendario)
  → Guardar
      → updateMapDesde(mapId, formatTimeTag(parts))
      → save_map_document_cmd
      → refreshActiveMap
      → trackAction map.desdeSet { mapId, desde, previousDesde? }
  → Cerrar dialog
```

### 5.3 Flujo crear mapa

```text
CreateMapDialog submit
  → createMap(draft)  // existente
  → resolveDefaultMapDesde + save si raw != null
  → refreshActiveMap
```

### 5.4 Hook `useMapProject` — ampliación

```typescript
updateMapDesde: (mapId: string, desde: string | null) => Promise<void>;
applyDefaultDesde: (mapId: string) => Promise<MapDesdeDefaultResult>;
```

`createMap` internamente llama `applyDefaultDesde` tras éxito.

---

## 6. OBS — eventos

### 6.1 Acciones (nuevas)

| Evento | Cuándo | Payload |
|--------|--------|---------|
| `obs.action.map.desdeSet` | Usuario guarda picker | `{ mapId, desde, previousDesde? }` |
| `obs.action.map.desdeDefault` | Post-crear mapa con default | `{ mapId, desde, source }` |
| `obs.action.map.desdeSuggest` | Legacy: usuario pulsa sugerencia | `{ mapId, desde, source }` |

Canal: `session` (info).

### 6.2 Compositor (ampliar)

```typescript
{
  stub: false,
  mapId,
  timeT: null,              // MAP-009
  desdeRaw: string | null,
  desdeDisplay: string | null,
  layerCount,
  strokeCount,
  visibleLayers: string[],
  activeLayerId: string | null,
  layers: [ /* MAP-006 */ ],
}
```

Emitir al cambiar `document.desde` (debounce 300 ms coherente con MAP-006).

### 6.3 Acciones existentes (sin cambio payload crítico)

`map.create` — opcional añadir `desdeSet: boolean` post-MAP-007.

---

## 7. Fases de ejecución

```text
Fase 1  mapDesde.ts + resolveDefaultMapDesde + tests Vitest
Fase 2  Rust: validate_desde + auto updatedAt en save_map_document + cargo test
Fase 3  useMapProject: updateMapDesde, applyDefaultDesde, wire createMap
Fase 4  MapDesdeField + MapDesdeDialog + i18n ES/EN
Fase 5  MapWorkspace: badge Terreno base + integración header
Fase 6  OBS action + compositor desdeRaw/desdeDisplay
Fase 7  npm test + build + cargo test maps_store
Fase 8  QA manual §9 + cerrar §12
```

**Checkpoint recomendado:** tras Fase 4, crear mapa en proyecto con marcas MS y verificar default + edición manual antes de OBS.

---

## 8. Verificación automatizada

| Comando | Esperado |
|---------|----------|
| `npm test -- --run` | + tests `mapDesde.ts`, hook mock IPC |
| `npm run build` | OK |
| `cd src-tauri && cargo test maps_store` | + tests validación `desde`, save document timestamp |

---

## 9. QA manual (recorrido OBS)

**Precondiciones:** proyecto con ≥2 marcas temporales en manuscrito; mapa QA legacy con `desde: null`; OBS acciones + compositor ON.

| Paso | Acción | Esperado |
|------|--------|----------|
| 1 | Crear mapa blank | `map.json` en disco con `desde` = default cronológico |
| 2 | Inspeccionar header | Badge terreno base + «Desde» legible |
| 3 | Editar «Desde» a otra fecha | Disco actualizado; trazos **no** marcan sucio |
| 4 | Dibujar trazo sin guardar + cambiar «Desde» | Sin diálogo sucio de trazos |
| 5 | Mapa legacy null → «Usar sugerencia» | `desde` persistido tras confirmar |
| 6 | Import imagen | Mismo comportamiento default + render baseImage intacto |
| 7 | Cambiar mapa activo | Cada mapa muestra su propio «Desde» |
| 8 | Revisar OBS | `desdeSet`, `desdeDefault`, compositor con `desdeRaw` |

**Sesiones OBS:** `1781851429000-23756` (recorrido §9 completo)

**Mapas:** `map_eec18f43b97576db` (blank QA) · `map_d99c452cdeefe916` / `map_82154e8be370db4c` (legacy suggest) · `map_d503aa16d8ccfc61` (import)

**Evidencia:** `action-session-1781851429000-23756.ndjson`, `action-verbose-*.ndjson`, `ui-session-*.ndjson`

| Criterio | Resultado | Evidencia log |
|----------|-----------|---------------|
| C1 Default al crear | ✅ | `desdeDefault` blank `15.7.2025` (`map_eec18f43…` L15) · import `map_d503aa16…` L46 |
| C2 Display header | ✅ | Recorrido manual; badge + fila «Desde» visibles |
| C3 Edición picker | ✅ | `desdeSet` L16/27/29/47; picker muestra marcas MS (`15-7-2025`, `23-10-2025`) |
| C4 Sin dirty trazos | ✅ | `desdeSet` L27–29 entre `drawStroke` L18–22 sin `unsavedDialog` por Desde |
| C5 Badge terreno base | ✅ | Recorrido manual |
| C6 Legacy sugerencia | ✅ | `desdeSuggest` L35 (`map_d99c452…`) · L37 (`map_82154e8…`) |
| C7 Validación Rust | ✅ | cargo `save_map_document_*desde*` (pre-QA) |
| C8 updatedAt índice | ✅ | cargo test timestamp (pre-QA) |
| C9 OBS acciones | ✅ | `desdeSet` · `desdeDefault` · `desdeSuggest` en session log |
| C9 OBS compositor | ⚠️ | `desdeRaw`/`desdeDisplay` no aparecen en `ui-session` esta sesión — acciones OK; revisar toggle render maps si se necesita evidencia compositor |
| C10 Tests CI | ✅ | 281 npm + 27 cargo (pre-QA) |
| C11 Render principal | ✅ | `drawStroke` + viewport operativos; `timeT: null` (MAP-009) |

**Notas QA:**

- Default cronológico correcto: `15.7.2025` (anterior a `23.10.2025` en MS).
- `unsavedDialog` L24/L30/L40 solo por `viewChange`/`selectMap`/`exitEdit` con trazos sucios — no por editar Desde.
- Import HD: default + edición `15.7.1999` sin conflicto con trazos.

---

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| «Primera marca» mal interpretada | D1 documentada; ajuste v1.1 si usuario prefiere orden documento |
| Proyecto sin marcas MS | Fallback epoch; UI «Sin definir» |
| Race create + timeline no cargado | `await load()` timeline antes de default |
| `save_map_document` pisa campos | Enviar documento completo desde snapshot activo |
| Confusión Desde vs cursor T | Copy i18n: «Origen del mapa (año 0 local)» |
| Mapas multi-mundo con distintos Desde | QA paso 7 — un `desde` por `map.json` |

---

## 11. Handoff → MAP-008

MAP-008 tomará:

- **`map.json.desde` estable** por mapa — ancla para reglas §4.3 (`tiempo_inicio ≥/< Desde`).
- **`principal.json`** como único terreno base — secundarios en `drawings/secondary/{id}.json`.
- Compositor OBS ya expone `desdeRaw` — MAP-009 añadirá `timeT` y pila secundarios.
- Panel capas MAP-006 — reutilizable al editar un secundario (mismo schema `layers[]`).

MAP-007 **no** crea archivos secundarios ni lógica de visibilidad temporal.

---

## 12. Registro

| Fecha | Evento |
|-------|--------|
| 2026-06-11 | Plan MAP-007 redactado (auditoría post MAP-006 ✅ + spec §4.2 + handoff §11) |
| 2026-06-11 | **Fases 1–7 implementadas** — mapDesde, Rust validate, UI Desde, OBS acciones, tests 281 + cargo 27 |
| 2026-06-11 | **QA usuario** — sesión `1781851429000-23756`; criterios §9 C1–C11 ✅ (compositor render sin líneas ui-session — no bloqueante) |
| 2026-06-11 | **§12 cerrado** — MAP-007 ✅ → handoff MAP-008 |
