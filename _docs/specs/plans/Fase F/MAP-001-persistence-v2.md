# MAP-001 — Persistencia v2 + purga legacy

> **Estado:** ✅ **Cerrado** (2026-06-11) · QA smoke sesiones `9392` + `15572` · Commits: usuario  
> **Esfuerzo:** Alto · **Riesgo:** Medio (purga grande + app debe compilar)  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md) Fase F · **Spec:** [`maps-design.md`](../../maps-design.md) §9 · **Previo:** [MAP-000 ✅](MAP-000-inventory-purge.md) · **Siguiente:** MAP-002

---

## 0. Convención de trabajo

| Regla | Detalle |
|-------|---------|
| Flujo | **Plan (este doc) → ejecución → pruebas → validación/QA → cerrar §8 → MAP-002** |
| Evidencia | QA manual + NDJSON `_debug/logs/` si el usuario recorre el módulo Mapas |
| Commits | Los hace el usuario |
| MAP-000 D7 | La **purga física** legacy es la **Fase 0** de este plan |

---

## 1. Problema y objetivo

### 1.1 Problema

El módulo mapas actual (~14 TSX + `maps_store.rs` ~1000 líneas) implementa un modelo **legacy** (Leaflet, `manifest.json`, `layers.json` vectorial, Excalidraw, overlays imagen) **incompatible** con el spec Era III (§4, §8, §9).

Persistir sobre ese código es deuda compuesta. MAP-000 cerró: **tierra quemada** + esquema JSON v2.

### 1.2 Objetivo MAP-001

Entregar la **capa de persistencia v2** en Rust + tipos TS + IPC, tras **eliminar** el stack legacy, con una **UI mínima** que permita abrir el módulo Mapas sin romper la app ni el build.

### 1.3 Criterios de aceptación

| # | Criterio |
|---|----------|
| C1 | Código legacy MAP-000 §2 **eliminado**; `npm run build` y `cargo test` verdes |
| C2 | Esquema disco v2 bajo `.narralith/maps/` según §4 |
| C3 | Rust: tipos serializables + validación + tests unitarios round-trip |
| C4 | IPC v2 registrado en `lib.rs`; TS espeja tipos |
| C5 | `create_blank_map` v2 crea mapa + `principal.json` vacío (1 capa default) |
| C6 | `get` / `save` de `map.json` y dibujo principal funcionan |
| C7 | `MapWorkspace` placeholder: lista mapas o empty state; **sin** Leaflet/Excalidraw |
| C8 | `useProjectStore` resetea store mapas v2 al cambiar proyecto |
| C9 | Errores i18n `errors.*` coherentes (reutilizar patrón `mapErrors.ts`) |

### 1.4 Fuera de alcance MAP-001 (tareas posteriores)

| Tema | Plan |
|------|------|
| Autosave debounced al dibujar | **MAP-005** (MAP-001 solo expone `save_map_drawing_cmd`) |
| Multi-mundo UX (fijado / último visto) | **MAP-002** |
| Diálogo crear mapa (tamaño libre, import imagen) | **MAP-003** |
| Modos interactivo / edición ✏️ | **MAP-004** |
| Estudio canvas, presión, pinceles | **MAP-005** |
| Capas internas UI | **MAP-006** |
| «Desde», secundarios, compositor, T | **MAP-007…009** |
| Hotspots, marcas X MS | **MAP-010…011** |
| Quitar deps npm Leaflet/Excalidraw | **MAP-012** (imports ya no existirán tras purga) |
| Migración datos legacy | **Ninguna** |
| `localStorage` borrador (FIX-007) | **No** |
| `*.autosave.json` crash recovery | Opcional MAP-001; **recomendado** write atómico §5.4 |

---

## 2. Auditoría pre-implementación (estado repo jun 2026)

### 2.1 Backend Rust

| Pieza | Ubicación | Notas |
|-------|-----------|-------|
| Store legacy | `src-tauri/src/fs/maps_store.rs` | `write_json`/`read_json` reutilizables como patrón; lógica legacy reemplazar entera |
| IPC | `src-tauri/src/commands/maps.rs` | 14 comandos — reescribir |
| Registro | `src-tauri/src/lib.rs` L88–101 | Actualizar lista |
| Scaffold | `scaffold.rs` L102 `ensure_maps_dir` | Mantener |
| Tests | `maps_store.rs` `mod tests` | Reemplazar por tests v2 |

**Patrón I/O existente** (`write_json` L849): escribe directo, sin rename atómico. MAP-001 debe usar **escritura atómica** para dibujos (§5.4).

**Generación ID** (`generate_map_id` L857): hash SHA256 — **conservar patrón**.

### 2.2 Frontend

| Pieza | Ubicación | Notas |
|-------|-----------|-------|
| Orquestador | `MapWorkspace.tsx` | Reemplazar por placeholder |
| Datos | `useMapProject.ts` | Debounced save 500 ms a `save_map_data_cmd` — patrón referencia para MAP-005, **no** reutilizar tipos |
| UI state | `useMapStore.ts` | Reemplazar store mínimo v2 |
| Tipos | `lib/types/maps.ts`, `mapDrawing.ts` | Reemplazar |
| Integración | `WorkspaceShell.tsx` L118–119 | Mantener `<MapWorkspace />` |
| Reset proyecto | `useProjectStore.ts` L164 | Adaptar a store v2 |
| OBS | `useMapsRenderAudit.stub.ts` | Mantener stub; opcional emitir `mapId` real en QA |
| i18n | `i18n/{es,en}/maps.json` | Podar claves Leaflet; añadir placeholder v2 |

### 2.3 Dependencias npm (no tocar en MAP-001)

`leaflet`, `react-leaflet`, `@excalidraw/excalidraw` quedan en `package.json` hasta **MAP-012**; tras purga **no** deben importarse (build debe pasar sin ellas).

---

## 3. Fases de ejecución (orden obligatorio)

```text
Fase 0  Purga legacy (commit 1 — árbol roto intermedio aceptable si compila al final)
Fase 1  Rust: tipos v2 + maps_store.rs nuevo
Fase 2  Rust: commands + lib.rs + tests
Fase 3  TS: tipos + mapErrors + hook mínimo
Fase 4  UI: MapWorkspace placeholder + store v2
Fase 5  Verificación: cargo test, npm test, npm run build, QA manual
```

**Un solo PR/commit lógico del usuario** puede agrupar 0–4; lo importante es que **al cerrar MAP-001** el repo compila y los tests pasan.

---

## 4. Esquema disco v2 (canónico MAP-001)

### 4.1 Layout

```text
.narralith/maps/
  index.json
  {mapId}/
    map.json
    drawings/
      principal.json
    hotspots.json          # [] vacío en MAP-001
    assets/                # carpeta creada vacía
```

**MAP-001 no crea** `drawings/secondary/` ni `drawings/nav/` — se añaden en MAP-008/010.

### 4.2 `index.json` (version 2)

```typescript
interface MapsIndexV2 {
  version: 2;
  /** MAP-002 implementará UX; default en MAP-001 */
  openPreference?: "pinned" | "lastViewed" | "lastModified";
  maps: Array<{
    id: string;
    name: string;
    defaultOnOpen?: boolean;
    updatedAt: string; // ISO 8601
  }>;
}
```

### 4.3 `map.json` (version 1)

```typescript
interface MapDocumentV1 {
  version: 1;
  id: string;
  name: string;
  width: number;
  height: number;
  /** MAP-007 — null en MAP-001 */
  desde: string | null;
  createdAt: string;
  updatedAt: string;
}
```

Validación: `width`/`height` en rango **512…8192** (heredar límites legacy `create_blank_map` L268).

### 4.4 `drawings/principal.json` (version 2)

```typescript
interface MapDrawingV2 {
  version: 2;
  width: number;  // espejo map.json al crear; editable al expandir lienzo (MAP-003)
  height: number;
  layers: MapDrawingLayerV2[];
}

interface MapDrawingLayerV2 {
  id: string;
  name: string;
  visible: boolean;
  opacity: number; // 0..1
  locked: boolean;
  strokes: MapStrokeV2[];
}

interface MapStrokeV2 {
  id: string;
  tool: "brush" | "eraser";
  brush: string;       // preset id — MAP-005 cerrará lista
  color: string;       // #RRGGBB
  baseSize: number;
  baseOpacity: number;
  points: MapStrokePointV2[];
}

interface MapStrokePointV2 {
  x: number;
  y: number;
  pressure?: number;   // 0..1 omitido = ratón
}
```

**Capa default al crear:** `{ id: "layer-1", name: "Capa 1", visible: true, opacity: 1, locked: false, strokes: [] }`.

### 4.5 `hotspots.json` (version 1)

```typescript
interface MapHotspotsFileV1 {
  version: 1;
  hotspots: [];  // MAP-010
}
```

---

## 5. Backend Rust — diseño

### 5.1 Módulo `maps_store.rs` (reescritura)

| Función pública | Rol |
|-----------------|-----|
| `ensure_maps_dir` | Crear `.narralith/maps/` + `index.json` v2 si falta |
| `list_maps` | → `Vec<MapSummaryV2>` desde index |
| `get_map_document` | Leer `map.json` |
| `save_map_document` | Escribir `map.json` + actualizar index entry `updatedAt` |
| `get_map_drawing` | Leer `drawings/principal.json` (MAP-001 solo principal) |
| `save_map_drawing` | Escritura atómica principal |
| `create_blank_map` | Crear árbol completo §4.1 |
| `read_project_image_data_url` | **Conservar** — utilidad genérica imágenes |

Eliminar: sketch Excalidraw, overlays, layers vectoriales, `get_map_state_at`, PNG canvas bake, `Imagenes/Mapas_y_Geografia` como requisito de mapa blank (MAP-003 decidirá import imagen).

### 5.2 `MapSummaryV2` (IPC list)

```typescript
interface MapSummaryV2 {
  id: string;
  name: string;
  width: number;
  height: number;
  updatedAt: string;
  defaultOnOpen?: boolean;
}
```

Sin `parentMapId`, `imagePath` — modelo viejo eliminado.

### 5.3 Comandos IPC v2

| Comando | Args | Returns |
|---------|------|---------|
| `list_project_maps` | — | `MapSummaryV2[]` |
| `get_map_document_cmd` | `mapId` | `MapDocumentV1` |
| `save_map_document_cmd` | `MapDocumentV1` | `()` |
| `get_map_drawing_cmd` | `mapId`, `drawing?: "principal"` | `MapDrawingV2` |
| `save_map_drawing_cmd` | `mapId`, `drawing: MapDrawingV2` | `()` |
| `create_blank_map_cmd` | `name`, `width`, `height` | `MapSummaryV2` |
| `read_project_image_cmd` | `relativePath` | `string` (data URL) |

Nombres pueden mantenerse **sin sufijo `_v2`** porque los legacy se eliminan en la misma entrega.

### 5.4 Escritura atómica (recomendado MAP-001)

```text
save_map_drawing:
  1. Serializar JSON
  2. Escribir principal.json.tmp
  3. fs::rename → principal.json
```

Evita JSON corrupto si la app muere mid-write. El hermano `*.autosave.json` queda **opcional**; el rename basta para MAP-001.

### 5.5 Errores Rust

Reutilizar claves `error.maps.*` existentes donde aplique:

| Clave | Cuándo |
|-------|--------|
| `name_required` | Nombre vacío al crear |
| `not_found` | mapId inexistente |
| `invalid_json` | JSON corrupto |
| `invalid_dimensions` | width/height fuera de rango |

Añadir si hace falta: `drawing_not_found`, `schema_version_unsupported`.

### 5.6 Tests Rust (mínimo)

| Test | Assert |
|------|--------|
| `list_maps_empty` | Proyecto nuevo → `[]` |
| `create_blank_map_creates_tree` | Existen `map.json`, `principal.json`, `hotspots.json`, `assets/` |
| `map_document_round_trip` | save + load |
| `drawing_round_trip` | strokes con/ sin `pressure` |
| `create_blank_map_default_layer` | 1 capa, 0 strokes |
| `invalid_dimensions_rejected` | width 100 → error |

Eliminar tests legacy (`map_round_trip` manifest/layers, sketch, overlay…).

---

## 6. Frontend — diseño mínimo

### 6.1 Store `useMapStore` v2

Estado mínimo MAP-001:

```typescript
interface MapStoreV2 {
  activeMapId: string | null;
  setActiveMap: (id: string | null) => void;
  reset: () => void;
}
```

Eliminar en v2: `mapStack`, `mapEditorMode`, `drawMode`, `previewTimestamp`, Leaflet-specific.

### 6.2 Hook `useMapProjectV2` (nombre provisional)

| Responsabilidad | MAP-001 |
|-----------------|---------|
| Cargar lista al abrir proyecto | ✅ |
| Cargar `map.json` + `principal.json` del activo | ✅ |
| Debounced autosave | ❌ MAP-005 |
| Flush `pagehide` | ❌ MAP-005 |

### 6.3 `MapWorkspace` placeholder

UX mínima aceptable:

```text
┌─────────────────────────────────────┐
│ Mapas                    [+ Nuevo]* │
├─────────────────────────────────────┤
│ Empty: «Crea tu primer mapa»        │
│   o lista simple de mapas existentes│
│   al clic → muestra id + dimensiones│
│   (sin canvas aún)                  │
└─────────────────────────────────────┘
* «Nuevo» puede ser botón dev que llama create_blank_map_cmd
  con defaults 2400×1600 — UX real en MAP-003
```

No montar Leaflet, Excalidraw ni canvas de dibujo.

### 6.4 i18n

Podar claves legacy (overlays, Leaflet, sketch, childMap…). Mantener / añadir:

- `emptyTitle`, `emptyDescription` (texto alineado a Era III, sin Leaflet)
- `createMap`, `loadingMaps`, `loadFailed`
- `errors.*` alineados a Rust

---

## 7. Checklist purga (Fase 0)

Ejecutar **antes** de escribir código v2 (o en el mismo commit final):

### Eliminar archivos

- [x] `src/modules/maps/*` (legacy)
- [x] `src/hooks/useMapProject.ts` (reescrito v2)
- [x] `src/hooks/useMapImageUrl.ts`
- [x] `src/lib/maps/mapMutations.ts`
- [x] `src/lib/types/mapDrawing.ts`

### Reescribir desde cero

- [x] `src-tauri/src/fs/maps_store.rs`
- [x] `src-tauri/src/commands/maps.rs`
- [x] `src/lib/types/maps.ts`
- [x] `src/stores/useMapStore.ts`
- [x] `src/modules/maps/MapWorkspace.tsx`
- [x] `src/lib/maps/mapErrors.ts` (sin cambio de patrón)

### Actualizar referencias

- [x] `src-tauri/src/lib.rs`
- [x] `src/stores/useProjectStore.ts` (reset sin cambio)
- [x] `src/i18n/{es,en}/maps.json`

### Verificar cero referencias legacy

```text
rg "MapLeaflet|excalidraw|leaflet|layers\.json|manifest\.json|MapSketch|mapMutations|get_map_data_cmd|save_map_data_cmd|get_map_state_at"
```

(resultado vacío salvo docs y MAP-012 package.json)

---

## 8. Verificación y QA

### 8.1 Automatizado

| Comando | Esperado |
|---------|----------|
| `cargo test` | Tests maps_store v2 pasan |
| `npm test` | Sin regresión (203+ tests) |
| `npm run build` | Build OK sin import Leaflet/Excalidraw |

### 8.2 Manual

| # | Acción | Esperado | Resultado |
|---|--------|----------|-----------|
| R1 | Abrir proyecto sin `.narralith/maps/` | Empty state | ✅ (sesión previa a creación) |
| R2 | Crear mapa blank | Árbol §4.1 en disco | ✅ `mapTest`, `MapTest2` creados |
| R3 | Inspeccionar `principal.json` | v2, 1 capa, 0 trazos | ✅ UI: capas 1, trazos 0 (`MapTest2`) |
| R4 | Cerrar y reabrir app/proyecto | Mapas en lista | ✅ sesión `15572` — usuario confirma |
| R5 | Cambiar de proyecto y volver | Store resetea | ⏸ no recorrido |
| R6 | Legacy `.narralith/maps/` v1 | Ignorar / vacío | ⏸ no recorrido (proyecto v2 limpio) |

### 8.3 OBS

| Sesión | Archivos | Hallazgos |
|--------|----------|-----------|
| **1** `1781752675290-9392` | `action-session-…9392.ndjson`, `ui-session-…9392.ndjson` | L2 `viewChange` editor→map · L3 `obs.action.map.open` · L18–21 `obs.ui.maps.viewport/compositor` stub |
| **2** `1781752775763-15572` | `action-session-…15572.ndjson`, `ui-session-…15572.ndjson` | Misma secuencia al reabrir · mapas persistidos visibles en UI |

**Captura QA:** `mapTest` + `MapTest2` (2400×1600); detalle `MapTest2` → `map_6d1eb17e9f8d1310`, 1 capa, 0 trazos.

**Nota:** `obs.ui.maps.viewport` con `mapId: null` — stub emite al entrar al módulo antes de selección; esperado MAP-001. Instrumentar `mapId` post-selección → MAP-004.

**Gap:** no hay aún `obs.action.map.create` — añadir en MAP-003 si hace falta trazabilidad de creación.

---

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Build roto tras purga | Placeholder `MapWorkspace` en la misma entrega |
| Proyecto dev con maps legacy | Documentar: borrar `.narralith/maps/` o proyecto entero |
| Scope creep (canvas en MAP-001) | Criterios §1.4 estrictos; canvas → MAP-005 |
| JSON grande corrupto | Escritura atómica §5.4 |
| Tipos TS/Rust desincronizados | Tipos espejo + test round-trip Rust |

---

## 10. Entregables al cerrar MAP-001

| Entregable | Ubicación |
|------------|-----------|
| Store + IPC v2 | `maps_store.rs`, `commands/maps.rs` |
| Tipos TS | `lib/types/maps.ts` |
| UI placeholder | `MapWorkspace.tsx`, `useMapStore.ts`, hook proyecto |
| Tests | `maps_store.rs` mod tests |
| Plan cerrado | §11 Registro + ✅ `implementation-plan.md` |
| Spec | Actualizar `maps-design.md` §9 si el esquema final difiere en detalle |

---

## 11. Registro

| Fecha | Evento |
|-------|--------|
| 2026-06-11 | Plan MAP-001 redactado (post MAP-000 ✅) |
| 2026-06-11 | **Implementación** — purga legacy + maps_store v2 + IPC + MapWorkspace placeholder |
| 2026-06-11 | **Tests auto:** `cargo test` maps_store 6/6 · `npm test` 203/203 · `npm run build` OK |
| 2026-06-11 | **MAP-001 ✅ cerrado** — QA smoke NDJSON `9392`+`15572`; R4 persistencia disco confirmada |

---

## 12. Handoff → MAP-002

MAP-002 tomará:

- `index.json` `openPreference` + `defaultOnOpen`
- Selector mapas en UI
- Persistir «último visto» (campo en index o settings proyecto)

MAP-001 solo debe dejar **`defaultOnOpen` opcional en index** y **`openPreference` en index con default `"lastViewed"`** sin UX de selección aún.
