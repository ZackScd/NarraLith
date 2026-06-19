# MAP-008 — Dibujos secundarios (parches temporales)

> **Estado:** ✅ **Implementado** (Fases 1–9, 2026-06-11) · QA manual **parcial** §9 · polish pendiente  
> **Esfuerzo:** Alto · **Riesgo:** Alto (multi-archivo, compositor alpha, sesión dibujo multi-target)  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md) Fase F · **Spec:** [`maps-design.md`](../../maps-design.md) §4.3 · **Previo:** [MAP-007 ✅](MAP-007-principal-desde.md) · **Siguiente:** MAP-009

---

## 0. Convención

| Regla | Detalle |
|-------|---------|
| Flujo | Plan → ejecución → tests → QA/OBS → cerrar §12 → MAP-009 |
| Commits | Usuario |
| Evidencia | Recorrido QA §9 + sesión OBS post-implementación |
| OBS previo a planificar | **No requerido** — auditoría código + spec §4.3 + handoff MAP-007 §11 |

---

## 1. Problema y objetivo

### 1.1 Problema (post MAP-007)

El mapa activo solo persiste y edita **un** dibujo (`principal.json`). La spec §4.3 exige **parches históricos** como archivos separados, transparentes fuera de la zona editada, con reglas temporales respecto a `desde`:

| Carencia | Impacto |
|----------|---------|
| Sin `drawings/secondary/` en disco | Spec §9.2 incumplida |
| `get/save_map_drawing_cmd` solo principal | No hay CRUD secundarios |
| Compositor pinta un solo `MapDrawingV2` | Parches no se superponen al terreno |
| Sin `tiempo_inicio` / `tiempo_fin` | Reglas §4.3–4.4 imposibles |
| Estudio siempre edita principal | Usuario no puede dibujar parches |
| `mapStrokeBuffer` keyed solo por `mapId` | Colisión buffers multi-dibujo |
| Borrador/guards keyed solo por `mapId` | Dirty mezclado al cambiar dibujo activo |
| `expand/crop` solo muta `principal.json` | Desync dimensiones si hubiera secundarios |
| Badge fijo «Terreno base» | No distingue parche vs principal en edición |
| `timeT` siempre `null` en OBS | Sin preview temporal de visibilidad |

**Lo que ya funciona (no reimplementar):**

- `principal.json` + capas internas MAP-006 + guardado MAP-005b.
- `map.json.desde` operativo (MAP-007) — ancla para reglas de visibilidad.
- `MapDesdeDialog` / `parseTimeTag` / calendario proyecto.
- `drawMapStrokes` + eraser `destination-out` por buffer aislado.
- Panel capas `MapLayersPanel` — mismo schema `layers[]` por archivo de dibujo.
- Compositor OBS con `desdeRaw`, `layerCount`, `strokeCount` (MAP-006/007).

### 1.2 Objetivo MAP-008

Entregar el **modelo de dibujos secundarios** dentro del mapa activo:

1. **Persistencia** — `drawings/secondary/{id}.json` con metadatos temporales + `layers[]`.
2. **CRUD + IPC** — listar, crear, leer, guardar, eliminar secundarios por mapa.
3. **Estudio multi-target** — editar principal **o** un secundario activo; capas internas reutilizadas.
4. **Compositor viewport** — principal + secundarios **visibles en T preview** superpuestos con alpha (parches transparentes).
5. **Reglas de visibilidad** — funciones puras §4.3; `tiempo_fin` (modo cierre B) v1.
6. **Preview T** — control compacto de fecha (no scrubber completo → MAP-009).
7. **OBS + tests** — eventos secondary.*, compositor con lista activa en T.

### 1.3 Criterios de aceptación

| # | Criterio |
|---|----------|
| C1 | Usuario puede **crear** secundario con `nombre`, `tiempoInicio` (obligatorio), `tiempoFin` opcional → archivo en `drawings/secondary/{id}.json` |
| C2 | Secundario nuevo: mismas `width`/`height` que `map.json`; capa default `layer-1`; resto del lienzo **transparente** al componer |
| C3 | **Listar** secundarios del mapa activo (panel UI) con nombre + fechas legibles |
| C4 | Usuario **selecciona dibujo activo** (principal o secundario) en modo edición; trazos van al archivo correcto |
| C5 | Modo interactivo **compone** principal + secundarios activos en **T preview** (z-order §4.3.1) |
| C6 | Cambiar T preview altera qué secundarios entran/salen de composición (reglas §4.3) |
| C7 | `tiempoFin` definido → secundario **deja de componerse** después de esa fecha (modo B §4.3.2) |
| C8 | Varios secundarios vigentes en mismo T se **componen todos** (zonas distintas o solapadas) |
| C9 | Editar/guardar secundario usa pipeline MAP-005b (dirty, borrador, guards) **scoped** por dibujo |
| C10 | Eliminar secundario: confirmación; borra archivo; no afecta principal |
| C11 | `expand/crop` lienzo sincroniza dimensiones en **principal + todos los secundarios** |
| C12 | Rust valida metadatos temporales (`tiempoInicio`, `tiempoFin` opcional) y schema `layers[]` |
| C13 | OBS: `secondary.create/delete/select`, `previewT.set`, compositor `activeSecondaryIds[]`, `previewTRaw` |
| C14 | Tests unitarios visibilidad temporal + compositor order + IPC Rust |
| C15 | i18n ES/EN `secondary.*`, errores |

### 1.4 Fuera de alcance MAP-008

| Tema | Plan |
|------|------|
| Scrubber timeline del mapa (barra T completa) | **MAP-009** |
| Sincronía T con timeline global del proyecto | **MAP-009** |
| Asistente geométrico «¿Apilar o cerrar en esta zona?» | v1.1 — v1: usuario fija `tiempoFin` manual |
| Detección automática de solapamiento espacial | Fuera v1 — z-order temporal basta |
| Dibujos hijo navegación `drawings/nav/` | **MAP-010** |
| Hotspots | **MAP-010** |
| Marcas X manuscrito | **MAP-011** |
| Blend modes entre secundarios | Fuera Era III v1 |
| Undo ops de metadata secundario (rename, fechas) | Guardado inmediato metadatos |
| Secundarios en mapas hijo (§4bis) | Post MAP-010 |
| Transiciones visuales al cambiar T | MAP-009 / polish |

---

## 2. Auditoría (estado repo jun 2026)

### 2.1 Lo que ya existe (reutilizar)

| Pieza | Archivo | Notas |
|-------|---------|-------|
| Schema capas/trazos | `MapDrawingV2`, `MapDrawingLayerV2` | Idéntico dentro de cada archivo |
| Principal IPC | `get/save_map_drawing_cmd` | Patrón a generalizar |
| Metadato Desde | `MapDocumentV1.desde`, `mapDesde.ts` | Ancla visibilidad |
| Picker fechas | `MapDesdeDialog`, `TimeTagMarkedPicker` | Reutilizar para `tiempoInicio/Fin` |
| Panel capas | `MapLayersPanel.tsx` | Sin cambios de concepto — dibujo activo |
| Sesión dibujo | `useMapDrawingSession.ts` | Ampliar `drawingRef` |
| Borrador | `mapDrawingDraft.ts` | Key `${root}:${mapId}` → añadir `drawingRef` |
| Guards | `mapDrawingGuard.ts`, `useMapDrawingGuardRegistration` | Scope por dibujo activo |
| Render trazos | `mapStrokeRender.ts`, `mapStrokeBuffer.ts` | Multi-buffer por `drawingRef` |
| Viewport | `useMapViewport.ts` → `paintMapViewport` | Extender stack composición |
| Validación capas | `validate_drawing` Rust | Reutilizar en secundarios |
| OBS mapa | `trackAction("map", …)` | Ampliar payload compositor |

### 2.2 Gaps a cerrar

| Gap | Severidad |
|-----|-----------|
| Sin carpeta/archivo secondary | 🔴 Bloqueante |
| IPC mono-dibujo | 🔴 Bloqueante |
| Compositor mono-capas | 🔴 Bloqueante |
| Sin modelo `tiempoInicio/Fin` | 🔴 Bloqueante |
| Sin selector dibujo activo | 🔴 Bloqueante |
| Buffer cache sin `drawingRef` | 🟠 Alto |
| Draft/guard sin `drawingRef` | 🟠 Alto |
| expand/crop ignoran secundarios | 🟠 Alto |
| Sin preview T | 🟠 Alto — MAP-009 depende de reglas ya hechas |
| Sin panel listado secundarios | 🟠 Alto UX |
| Badge solo «Terreno base» | 🟡 Medio |

### 2.3 Hardcodes actuales

| Ámbito | Valor |
|--------|-------|
| `PRINCIPAL_DRAWING_REL` | `"drawings/principal.json"` fijo en Rust |
| `useMapProject` | Carga solo `document` + `drawing` principal |
| `MapWorkspace` sessionKey | `${root}:${mapId}` sin dibujo |
| `paintMapViewport` | Un `drawing` + un `paintStrokeLayer` |
| `create_blank_map` | No crea `drawings/secondary/` |
| `useMapStore` | Sin `activeDrawingRef` ni `previewTimeT` |

### 2.4 OBS previo a planificar

**No requerido.** Handoff MAP-007 §11 + spec §4.3 + auditoría §2 bastan.

**Opcional:** confirmar que no existe `drawings/secondary/` en mapas QA.

**Requerido al cerrar §12:** recorrido §9 con OBS activo.

---

## 3. Decisiones de diseño

### D1 — Esquema archivo secundario

Un JSON por parche en `drawings/secondary/{id}.json`:

```typescript
interface MapSecondaryDrawingFileV1 {
  version: 1;
  id: string;
  name: string;
  tiempoInicio: string;       // d.m.yyyy — obligatorio
  tiempoFin?: string | null;  // d.m.yyyy — opcional (modo cierre B)
  createdAt: string;
  updatedAt: string;
  drawing: MapDrawingV2;      // mismo schema que principal.json
}
```

| Regla | Detalle |
|-------|---------|
| ID | `sec-{uuid8}` generado en Rust (patrón `layer-{uuid8}`) |
| Dimensiones | `drawing.width/height` **siempre** = `map.json` al crear/sync |
| Principal | Sigue siendo `drawings/principal.json` **sin** wrapper metadata |

**Índice:** no archivo `index.json` v1 — listar leyendo directorio `secondary/` + metadata de cada JSON (aceptable para decenas de parches).

### D2 — Identificador dibujo activo (`drawingRef`)

```typescript
type MapDrawingRef =
  | { kind: "principal" }
  | { kind: "secondary"; id: string };

function drawingRefKey(ref: MapDrawingRef): string {
  return ref.kind === "principal" ? "principal" : `secondary:${ref.id}`;
}
```

Estado en `useMapStore`:

```typescript
activeDrawingRef: MapDrawingRef;  // default { kind: "principal" }
previewTimeTRaw: string | null;   // d.m.yyyy; default map.desde
```

Al cambiar `activeMapId` → reset `activeDrawingRef` a principal, `previewTimeT` a `document.desde`.

### D3 — Reglas de visibilidad temporal (pure functions)

Nuevo módulo `src/lib/maps/mapSecondaryVisibility.ts`:

```typescript
export function isSecondaryVisibleAtT(
  secondary: Pick<MapSecondaryDrawingFileV1, "tiempoInicio" | "tiempoFin">,
  mapDesde: string | null,
  previewT: string,
  config: CalendarConfig,
): boolean;

export function sortSecondariesForCompose(
  secondaries: MapSecondaryDrawingFileV1[],
  config: CalendarConfig,
): MapSecondaryDrawingFileV1[];
```

**Lógica v1 (spec §4.3 + §4.4 recap):**

| Caso | Activo cuando |
|------|----------------|
| `tiempoInicio ≥ Desde` | `T ≥ tiempoInicio` (sortKey) **y** (`tiempoFin` null **o** `T ≤ tiempoFin`) |
| `tiempoInicio < Desde` | `T ≤ tiempoInicio` **y** (`tiempoFin` null **o** `T ≥ tiempoFin`) |
| `Desde` null | Comparar solo con sortKeys absolutos; UI exige definir Desde antes de crear secundario **o** warning blando |

**Z-order composición (§4.3.1):** orden ascendente por `sortKey(tiempoInicio)` — más antiguo abajo, más reciente arriba. Campo `stackOrder` manual **no** en v1.

**Tests obligatorios:** ejemplos spec (principal 2000, sec 2015+2017 visibles en 2020; sec con `tiempoFin` 2028 cae fuera en 2030).

### D4 — Compositor viewport (parches transparentes)

Orden de pintado en `paintMapViewport`:

```text
1. Fondo canvas + lienzo (width × height)
2. baseImageRel o rejilla
3. Buffer trazos PRINCIPAL (opaco donde hay trazo)
4. Para cada secundario VISIBLE en T preview (orden D3):
     buffer trazos secundario → drawImage source-over
     (áreas sin trazo = alpha 0 → se ve lo inferior)
5. Preview trazo del dibujo ACTIVO en edición (si aplica)
```

| Detalle | Decisión |
|---------|----------|
| Buffer por dibujo | `paintStrokeLayer(mapId, drawingRef, document, draw)` |
| Cache key | `${mapId}:${drawingRefKey}:${w}x${h}` |
| Eraser en secundario | Solo alpha del buffer secundario — no perfora principal |
| Modo edición | Usuario ve stack completo; input solo en dibujo activo |

### D5 — Preview T (placeholder MAP-009)

Fila header junto a «Desde»:

```text
Desde: 2000-07-15  ·  Vista en T: 2020-07-15  [Cambiar…]
```

- Control: `MapPreviewTField` — reutiliza picker MAP-007 (sin duplicar lógica).
- Default al abrir mapa: `document.desde` si existe; si no, epoch calendario.
- **No** scrubber arrastrable — MAP-009.
- Modo edición: T preview **visible** pero no bloquea dibujo; cambiar T no marca dirty trazos.

### D6 — Layout UI

```text
┌─────────────────────────────────────────────────────────────┐
│ Header: mapa · badge dibujo activo · Desde · Vista en T     │
├──────────┬──────────────────────────────────┬───────────────┤
│ MapSec.  │ MapViewport                      │ MapLayers     │
│ Panel    │ (composición stack)              │ Panel         │
│ (izq.)   │                                  │ (der., MAP-6) │
├──────────┴──────────────────────────────────┴───────────────┤
│ MapEditStudio (solo edición)                                 │
└─────────────────────────────────────────────────────────────┘
```

| Panel | Regla |
|-------|-------|
| `MapSecondariesPanel` | Solo modo edición **o** siempre visible en edición; lista + «Añadir parche» |
| Badge header | «Terreno base» vs «Parche: {name}» según `activeDrawingRef` |
| Principal en lista | Entrada fija «Terreno base» seleccionable |

### D7 — Crear secundario

Diálogo `CreateSecondaryDialog`:

| Campo | Regla |
|-------|-------|
| Nombre | Obligatorio |
| `tiempoInicio` | Picker; default = `previewTimeT` o `desde` |
| `tiempoFin` | Opcional — checkbox «Cerrar parche en fecha» |
| Validación | `tiempoFin` debe ser coherente con reglas (≥ inicio si forward, etc.) — validación blanda v1 |

**Modo A apilar vs B cierre:** v1 **no** asistente espacial — usuario define `tiempoFin` manualmente en propiedades del secundario o al crear. Documentar en UI tooltip.

Post-crear: seleccionar nuevo secundario como `activeDrawingRef`, entrar a editar.

### D8 — IPC Rust (generalización)

| Comando | Args | Returns |
|---------|------|---------|
| `list_map_secondaries_cmd` | `mapId` | `MapSecondarySummaryV1[]` |
| `get_map_secondary_cmd` | `mapId`, `secondaryId` | `MapSecondaryDrawingFileV1` |
| `create_map_secondary_cmd` | `mapId`, `name`, `tiempoInicio`, `tiempoFin?` | `MapSecondaryDrawingFileV1` |
| `save_map_secondary_cmd` | `mapId`, `file` | `()` |
| `update_map_secondary_meta_cmd` | `mapId`, `secondaryId`, patch name/fechas | `MapSecondarySummaryV1` |
| `delete_map_secondary_cmd` | `mapId`, `secondaryId` | `()` |

**Principal:** mantener `get/save_map_drawing_cmd` — no renombrar (evitar romper tests).

**`create_map_secondary`:** crea dir `drawings/secondary/` si falta; clona dimensiones de `map.json`; `default_principal_drawing` equivalente para layers.

**`expand_map_canvas` / `crop_map_canvas`:** iterar todos los `.json` en `secondary/` y aplicar `sync_map_dimensions` / `clip_drawing_strokes`.

### D9 — Sesión dibujo + borrador + guards

| Aspecto | Cambio |
|---------|--------|
| `useMapDrawingSession` | Recibe `drawingRef`; carga `sourceDrawing` del target |
| `sessionKey` | `${root}:${mapId}:${drawingRefKey}` |
| `mapDrawingDraft` | Tercer nivel: `store[root][mapId][drawingRefKey]` |
| Guards | Cambiar `activeDrawingRef` con dirty → mismo diálogo MAP-005b |
| Guard cambiar mapa | Flush **solo** dibujo activo sucio |
| Metadatos secundario | Guardado inmediato vía `update_map_secondary_meta_cmd` — **no** dirty trazos |

### D10 — Edición metadatos secundario

En panel secundarios o diálogo propiedades:

- Renombrar
- Editar `tiempoInicio` / `tiempoFin`
- Guardado inmediato (como Desde MAP-007)

### D11 — Validación Rust

Extender store:

| Regla | Acción |
|-------|--------|
| `tiempoInicio` parseable | Error si inválido |
| `tiempoFin` null o parseable | Error si inválido |
| `drawing` pasa `validate_drawing` | Error |
| Dimensiones = map document | Error en save si mismatch |
| `name` non-empty | Error |

### D12 — Restricción crear secundario sin Desde

| Regla v1 |
|----------|
| Si `map.desde == null` → permitir crear con warning i18n «Defina Desde para reglas temporales fiables» |
| Visibilidad usa comparación absoluta de sortKeys si `desde` null |

---

## 4. Esquema e IPC

### 4.1 Layout disco (ampliado)

```text
{mapId}/
  map.json
  drawings/
    principal.json
    secondary/
      sec-a1b2c3d4.json
      sec-e5f6g7h8.json
  hotspots.json
  assets/
```

### 4.2 Tipos TS auxiliares

```typescript
// lib/types/maps.ts
interface MapSecondarySummaryV1 {
  id: string;
  name: string;
  tiempoInicio: string;
  tiempoFin?: string | null;
  updatedAt: string;
}

interface MapSecondaryDrawingFileV1 { /* D1 */ }

type MapDrawingRef = /* D2 */;
```

### 4.3 Hook `useMapProject` ampliación

```typescript
secondaries: MapSecondarySummaryV1[];
activeSecondary: MapSecondaryDrawingFileV1 | null; // si ref secondary
loadSecondaries: () => Promise<void>;
createSecondary: (draft) => Promise<MapSecondaryDrawingFileV1>;
saveSecondary: (file) => Promise<void>;
updateSecondaryMeta: (id, patch) => Promise<void>;
deleteSecondary: (id) => Promise<void>;
```

Carga paralela: `document` + `principal` + `list_secondaries` al activar mapa.

---

## 5. Frontend — diseño de componentes

### 5.1 Archivos nuevos / tocados

| Archivo | Rol |
|---------|-----|
| `lib/maps/mapSecondaryVisibility.ts` | Reglas T + sort compose + tests |
| `lib/types/maps.ts` | Tipos secondary + `MapDrawingRef` |
| `stores/useMapStore.ts` | `activeDrawingRef`, `previewTimeTRaw` |
| `hooks/useMapProject.ts` | CRUD secundarios |
| `hooks/useMapDrawingSession.ts` | Scope `drawingRef` |
| `lib/maps/mapDrawingDraft.ts` | Key por `drawingRef` |
| `lib/maps/mapStrokeBuffer.ts` | Cache multi-ref |
| `lib/maps/useMapViewport.ts` | Compositor multi-dibujo |
| `modules/maps/MapSecondariesPanel.tsx` | Lista + CRUD |
| `modules/maps/CreateSecondaryDialog.tsx` | Alta parche |
| `modules/maps/MapSecondaryMetaDialog.tsx` | Editar fechas/nombre |
| `modules/maps/MapPreviewTField.tsx` | T preview header |
| `modules/maps/MapWorkspace.tsx` | Layout 3 columnas + wiring |
| `src-tauri/src/fs/maps_store.rs` | Secondary CRUD + expand/crop |
| `src-tauri/src/commands/maps.rs` | IPC nuevos |
| `src/i18n/{es,en}/maps.json` | `secondary.*`, `previewT.*` |

### 5.2 Flujo crear y dibujar parche

```text
Usuario «Añadir parche» → CreateSecondaryDialog
  → create_map_secondary_cmd
  → activeDrawingRef = secondary:id
  → loadSecondaries + load secondary drawing
  → modo edición: trazos → save_map_secondary_cmd (MAP-005b)
  → viewport interactivo: compone principal + parches visibles en T
```

### 5.3 Flujo cambiar dibujo activo

```text
Seleccionar otro secundario o principal en panel
  → guardMapDrawingNavigation (dirty?)
  → set activeDrawingRef
  → reset useMapDrawingSession desde source del target
  → badge header actualizado
  → trackAction secondary.select
```

---

## 6. OBS — eventos

### 6.1 Acciones (nuevas)

| Evento | Cuándo | Payload |
|--------|--------|---------|
| `obs.action.map.secondaryCreate` | Alta parche | `{ mapId, secondaryId, tiempoInicio, tiempoFin? }` |
| `obs.action.map.secondaryDelete` | Eliminar | `{ mapId, secondaryId, strokeCount? }` |
| `obs.action.map.secondarySelect` | Cambio dibujo activo | `{ mapId, drawingRef, previousRef? }` |
| `obs.action.map.secondaryMetaSet` | Renombrar/fechas | `{ mapId, secondaryId, patch }` |
| `obs.action.map.previewTSet` | Cambiar T preview | `{ mapId, previewT, previousT? }` |

### 6.2 Compositor (ampliar)

```typescript
{
  stub: false,
  mapId,
  previewTRaw: string | null,
  previewTDisplay: string | null,
  desdeRaw: string | null,
  desdeDisplay: string | null,
  activeDrawingRef: string,           // "principal" | "secondary:id"
  activeSecondaryIds: string[],       // visibles en T preview
  secondaryCount: number,
  layerCount, strokeCount,           // del dibujo activo
  visibleLayers, layers, activeLayerId,
}
```

Emitir al cambiar T, lista secundarios, trazos, o dibujo activo (debounce 300 ms).

---

## 7. Fases de ejecución

```text
Fase 1  Tipos + mapSecondaryVisibility.ts + tests Vitest (reglas T, z-order)
Fase 2  Rust: schema secondary, CRUD, validate, expand/crop multi + cargo test
Fase 3  IPC commands + useMapProject loadSecondaries/CRUD
Fase 4  useMapStore drawingRef + previewT; sessionKey/draft/guards por ref
Fase 5  mapStrokeBuffer + paintMapViewport compositor multi-dibujo
Fase 6  MapSecondariesPanel + CreateSecondaryDialog + Meta + PreviewTField + i18n
Fase 7  MapWorkspace layout + badge dinámico + wiring edición
Fase 8  OBS action + compositor ampliado
Fase 9  npm test + build + cargo test maps_store          ✅
Fase 10 QA manual §9 + cerrar §12                        ⚠️ parcial (sesión 26020)
```

**Checkpoint recomendado:** tras Fase 5, QA visual mínimo — 2 secundarios, parches en zonas distintas, cambiar T preview antes de panel CRUD completo.

---

## 8. Verificación automatizada

| Comando | Esperado | Resultado |
|---------|----------|-----------|
| `npm test -- --run` | + tests `mapSecondaryVisibility`, draft key, compose order | ✅ 287 tests (2026-06-11) |
| `npm run build` | OK | ✅ |
| `cd src-tauri && cargo test maps_store` | + CRUD secondary, validate fechas, expand/crop multi | ✅ 30 tests (incl. `save_map_secondary_preserves_metadata_from_disk`) |

---

## 9. QA manual (recorrido OBS)

**Precondiciones:** mapa con `desde` definido (MAP-007); ≥2 marcas MS; OBS ON.

| Paso | Acción | Esperado | Resultado |
|------|--------|----------|-----------|
| 1 | Crear secundario `tiempoInicio` < Desde | Parche visible al bajar T preview antes de Desde | ⏸ No recorrido en sesión 26020 |
| 2 | Crear secundario `tiempoInicio` > Desde | Parche visible al subir T preview desde Desde | ✅ Parcial — `secondaryMetaSet` `tiempoInicio: 15.7.2028` (> Desde `15.7.2025`); `previewTSet` 2025↔2028 |
| 3 | Dibujar parche pequeño | Resto lienzo transparente; se ve principal debajo | ✅ Trazos secundario + guardado; UX validada por usuario post-bugfix |
| 4 | Segundo secundario otra zona, T donde ambos activos | Composición muestra ambos | ⏸ No recorrido |
| 5 | `tiempoFin` en secundario 1 | Desaparece de composición al pasar T | ⏸ Parche QA sin `tiempoFin` (`null` en meta) |
| 6 | Editar secundario A, cambiar a principal sin guardar | Diálogo sucio MAP-005b | ✅ `unsavedDialog` + `saveDrawing` `reason: dialog` + `drawingRef: secondary:…` |
| 7 | Cambiar Desde / T preview con trazos sucios | **Sin** diálogo sucio | ✅ `previewTSet` ×4 sin `unsavedDialog` intermedio |
| 8 | Expandir lienzo | principal + secundarios mismas dimensiones | ⏸ No recorrido manual (cubierto por test Rust) |
| 9 | Eliminar secundario | Archivo borrado; principal intacto | ⏸ No recorrido |
| 10 | OBS | eventos §6.1 + compositor `activeSecondaryIds` | ✅ Acciones §6.1; compositor no en logs ui de sesión |

**Sesiones OBS:**

| Sesión | Rol | Logs |
|--------|-----|------|
| `1781853854096-3384` | Bugfix QA (trazos→principal, fecha→default) | `action-session-1781853854096-3384.ndjson` |
| `1781854476345-26020` | Validación post-bugfix | `action-session-1781854476345-26020.ndjson`, `action-verbose-1781854476345-26020.ndjson`, `session-1781854476345-26020.ndjson`, `ui-verbose-1781854476345-26020.ndjson` |
| `1781853049450-6620` | Arranque previo (editor→mapa) | `ui-verbose-1781853049450-6620.ndjson` |

**Mapa QA:** `map_677dcb30b6effbf4` · parche `sec-b53da6ce`

| Criterio | Resultado | Evidencia log |
|----------|-----------|---------------|
| C1 Crear secundario | ✅ impl · ⏸ QA | CRUD Rust + UI; sesión 26020 usa parche existente, no `secondaryCreate` |
| C2 Dimensiones + transparencia | ✅ | Trazos secundario aislados; compositor operativo (validación visual usuario) |
| C3 Listar en panel | ✅ | Panel PARCHES + `secondarySelect` |
| C4 Selección dibujo activo | ✅ | `secondarySelect` principal↔`secondary:sec-b53da6ce` |
| C5 Composición en T preview | ✅ | Dibujo secundario + cambios `previewTSet` |
| C6 T altera visibilidad | ✅ parcial | `previewTSet` 15.7.2025 ↔ 15.7.2028 con parche inicio 2028 |
| C7 `tiempoFin` modo cierre | ⏸ | Sin `tiempoFin` en recorrido 26020 |
| C8 Varios secundarios simultáneos | ⏸ | Un solo parche en sesión |
| C9 Pipeline MAP-005b scoped | ✅ | `draftPersist`, `saveDrawing` con `drawingRef`, `unsavedDialog` |
| C10 Eliminar secundario | ⏸ | No recorrido manual |
| C11 expand/crop sync | ✅ auto | `secondary_crud_and_expand_crop_sync` + test metadata |
| C12 Validación Rust metadatos | ✅ | Tests + `secondaryMetaSet` persiste `15.7.2028` post-fix |
| C13 OBS secondary.* + previewT | ✅ | L13 `secondaryMetaSet`, L12/14+ `secondarySelect`, L10/16/24/29/41/48 `previewTSet`, L26/34/50/57 `saveDrawing` + `drawingRef` |
| C14 Tests unitarios | ✅ | Vitest `mapSecondaryVisibility` + cargo `maps_store` |
| C15 i18n ES/EN | ✅ impl | `secondary.*`, `previewT.*`; sin verificación explícita en logs |

**Pendiente polish (usuario):** detalles UX menores — cerrar pasos 1, 4, 5, 8, 9 en QA futuro o MAP-009.

---

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Rendimiento N buffers canvas | Cache por `drawingRef`; invalidar al save |
| Reglas T incorrectas vs spec | Tests con ejemplos §4.3; revisión manual QA |
| Dirty al cambiar dibujo activo | Mismo guard MAP-005b; sessionKey por ref |
| expand/crop olvida secundarios | Rust iteración explícita + test |
| Desde null al crear secundario | Warning UI; tests con/sin desde |
| Confusión capas internas vs secundarios | Copy i18n: «Capas» = internas; panel izq = parches temporales |
| Eraser secundario perfora principal | Buffers aislados — QA con trazo principal bajo parche |

---

## 11. Handoff → MAP-009

MAP-009 tomará:

- **`mapSecondaryVisibility.ts`** operativo — scrubber T solo cambia `previewTimeTRaw` con UX rica.
- **Compositor multi-dibujo** — añadir barra timeline, `timeT` ligado al scrubber (reemplaza picker simple o lo convive).
- **`activeSecondaryIds`** en OBS — auditoría composición al mover T.
- Secundarios en disco estables — MAP-009 no toca schema.

MAP-008 **no** implementa scrubber ni sync con timeline global del proyecto.

---

## 12. Registro

| Fecha | Evento |
|-------|--------|
| 2026-06-11 | Plan MAP-008 redactado (auditoría post MAP-007 ✅ + spec §4.3 + handoff §11) |
| 2026-06-11 | **Implementación Fases 1–9** — CRUD secundarios, compositor multi-dibujo, panel PARCHES, preview T, OBS §6.1 |
| 2026-06-11 | **Bugfix QA** — sesión OBS `1781853854096-3384`, mapa `map_677dcb30b6effbf4` |
| 2026-06-11 | **QA post-bugfix** — sesión OBS `1781854476345-26020`; §9 parcial, C1–C15 mayoría ✅ (ver §12.2) |

### 12.1 Correcciones post-QA (2026-06-11)

#### A. Trazos de parche guardados en principal

**Síntoma:** al dibujar con un parche activo, `saveDrawing` emitía `drawingRef: "principal"` y los trazos sobrescribían el lienzo base.

**Causa:** `resetMapSessionState` y el efecto de carga del mapa reseteaban `activeDrawingRef` a principal; el autosave no resolvía la ref de sesión activa.

**Corrección:**
- `useMapStore.ts` — `resetMapSessionState` ya no toca `activeDrawingRef`.
- `MapWorkspace.tsx` — `sessionDrawingRefKeyRef` + `resolveSessionDrawingRef()` para autosave; efecto de carga solo inicializa `previewTimeTRaw`, no el dibujo activo.
- `useMapAutosave.ts` — prop `getDrawingRef`; OBS incluye `drawingRef` en payload.
- `useMapProject.ts` — `saveActiveDrawing` carga secundario si falta en caché.

#### B. Fecha del parche vuelve al default (Desde del mapa)

**Síntoma:** tras editar meta o crear parche con Vista en T distinta, el panel mostraba `tiempoInicio` = Desde del mapa (p. ej. `2025-07-15` en lugar de `2025-10-23`).

**Causa (doble):**
1. **`save_map_secondary`** escribía el archivo completo desde el frontend; la caché de sesión podía tener metadatos obsoletos y **revertía** `tiempoInicio`/`tiempoFin` en cada autosave de trazos.
2. **`loadSecondaryFile`** devolvía caché sin refrescar tras `updateSecondaryMeta`, dejando la UI desincronizada.
3. **Efecto preview T** en `MapWorkspace` dependía de `document.desde` y reseteaba Vista en T tras `loadSession`, arrastrando el default de creación de parches.

**Corrección:**
- `maps_store.rs` — `save_map_secondary` hace read-modify-write: conserva metadatos en disco y solo actualiza `drawing` + `updated_at`. Test `save_map_secondary_preserves_metadata_from_disk`.
- `useMapProject.ts` — `loadSecondaryFile(id, { force })` invalida caché; `updateSecondaryMeta` y `saveSecondary` fuerzan recarga desde disco.
- `MapWorkspace.tsx` — efecto preview T solo al cambiar mapa (`activeMapId` / `document.id`), no al refrescar `desde`.

**Verificación:** `npm test -- --run`, `npm run build`, `cargo test maps_store` (incl. test metadata preserve).

### 12.2 QA post-bugfix (sesión `1781854476345-26020`)

**Mapa:** `map_677dcb30b6effbf4` · **Parche:** `sec-b53da6ce` (`b`, `tiempoInicio: 15.7.2028`)

**Validado en OBS:**
- Meta del parche persiste tras edición (`secondaryMetaSet` L13).
- Guardado de trazos va al secundario correcto (`saveDrawing` `drawingRef: "secondary:sec-b53da6ce"` L26, L34, L50, L57).
- Principal y secundario guardan por separado (`saveDrawing` `drawingRef: "principal"` L47).
- Vista en T no dispara diálogo sucio (`previewTSet` L10, L16, L24, L29, L41, L48).
- Cambio de dibujo activo + guard sucio MAP-005b (`unsavedDialog` L33 → `saveDrawing` `reason: dialog` L34).
- Capas internas en secundario (`layerSelect` `layer-24edf2a6`, `layerCount: 2` en saves secundarios).
- Borrador scoped (`draftPersist` en verbose, `layerCount: 2` vs `1` según ref activa).

**No cubierto en sesión:** alta nuevo parche, segundo parche, `tiempoFin`, expand/crop manual, delete, compositor `activeSecondaryIds` en render log.

**Nota usuario:** «ya se ve mejor» — polish UX pendiente para fase posterior.
