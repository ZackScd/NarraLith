# MAP-000 — Inventario conservar/purgar + decisiones Era III

> **Estado:** ✅ **Cerrado** (2026-06-11) · D1–D6 documentación · D7 purga física → **MAP-001** · Barrido final → **MAP-012**  
> **Esfuerzo:** Bajo (documentación) · **Riesgo:** Bajo  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md) Fase F · **Spec:** [`maps-design.md`](../../maps-design.md) §2 · §9 · **Roadmap:** [`maps-roadmap.md`](../../maps-roadmap.md)

---

## 0. Convención

| Regla | Detalle |
|-------|---------|
| Plan antes de código | Este documento cierra MAP-000; **MAP-001** implementa persistencia + purga grande |
| Sin migración legacy | Solo entorno dev; borrar proyecto de prueba si hace falta |
| Alcance Era III | Módulo completo MAP-000…012 al cerrar Fase F; ejecutar en tareas pequeñas |

---

## 1. Decisiones cerradas (jun 2026)

### 1.1 Estrategia frente al código actual

| Decisión | Veredicto |
|----------|-----------|
| Enfoque general | **Tierra quemada** — reescribir; conservar solo lo listado en §3 |
| Purga física | **Un commit al inicio de MAP-001** (módulo mapas roto/vacío hasta reconstruir) |
| Barrido final | **MAP-012** — `grep`, deps npm, docs, tests huérfanos |
| Migración `.narralith/maps/` | **Ninguna** |
| Comparar viejo vs nuevo en smoke | **No** — no mantener legacy conviviendo semanas |

### 1.2 Stack técnico

| Decisión | Veredicto |
|----------|-----------|
| Vista interactiva | **Compositor canvas 2D propio** — sin Leaflet |
| Estudio dibujo | **Canvas 2D propio** — sin Excalidraw |
| Persistencia dibujos | **JSON estructurado** — no TIFF/PSD como formato de trabajo |
| SQLite para trazos | **No** v1 — JSON en `.narralith/maps/` |
| Imágenes importadas | **PNG / WebP / JPEG** en `assets/` (fondos, overlays raster) |
| Export usuario (TIFF/PNG) | **Fuera de Era III** — solo persistencia interna + import |

### 1.3 Formato de dibujo

| Decisión | Veredicto |
|----------|-----------|
| Unidad de archivo | **Un JSON por dibujo** (principal, secundario, hijo nav.) — no un archivo por capa interna |
| Capas internas | **Array `layers[]` dentro** de cada `drawing.json` |
| Trazos | Vectoriales: puntos `(x, y)` + `pressure` opcional 0.0–1.0 (§3bis.2.1 spec) |
| Versión esquema | Campo `version` en cada documento; migradores al evolucionar |
| Caché render | PNG opcional regenerable — **no** fuente de verdad |

Ver esquema canónico: [`maps-design.md`](../../maps-design.md) §9.

### 1.4 Borrador sucio / no perder trabajo

| Decisión | Veredicto |
|----------|-----------|
| Objetivo UX | Misma **sensación** que manuscrito: cerrar app sin perder el dibujo en curso |
| Mecanismo | **Autosave debounced a disco** + **flush en `pagehide`** — **no** replicar FIX-007 (`localStorage`) para trazos |
| Motivo | Trazos pueden ser MB; calendario fue complejo por **reconciliación cruzada**, no por guardar al cerrar — mapas es auto-contenido |
| Opcional v1 | Hermano `*.autosave.json` si hace falta recuperación ante crash mid-write |
| Reconciliación global | **No** (sin baseline tipo FIX-010i) |

Implementación detallada: **MAP-001** (persistencia) + **MAP-005** (estudio + autosave).

### 1.5 Alcance producto

| Decisión | Veredicto |
|----------|-----------|
| Entrega Fase F | **Módulo mapas completo** MAP-001…012 |
| Ejecución | Planificar bien; **una tarea MAP a la vez** con criterios de done |
| Post-WB | Visualización rica ubicación, edición bidireccional — **WB-001…003** |

---

## 2. Inventario código legacy — purgar

### 2.1 UI (`src/modules/maps/` — eliminar **todo**)

| Archivo | Rol legacy |
|---------|------------|
| `MapWorkspace.tsx` | Orquestador Leaflet + estudio + paneles |
| `MapLeafletCanvas.tsx` | Vista Leaflet (pines, polígonos) |
| `MapImageOverlayLayer.tsx` | Overlays imagen Leaflet |
| `MapLayerPanel.tsx` | Capas vectoriales + propiedades entidad |
| `MapOverlayPanel.tsx` | Overlays históricos por imagen |
| `MapSketchPanel.tsx` | Excalidraw |
| `MapDrawToolbar.tsx` | Herramientas dibujo en mapa Leaflet |
| `MapBreadcrumb.tsx` | Navegación padre/hijo (modelo viejo) |
| `CreateMapDialog.tsx` | Crear mapa (3 presets) |
| `MapEmptyState.tsx` | Estado vacío |
| `studio/MapDrawStudio.tsx` | Canvas 2D sin presión |
| `studio/useMapDrawing.ts` | Lógica trazos v1 |

### 2.2 Estado, hooks, lib (reescribir)

| Archivo | Acción |
|---------|--------|
| `src/stores/useMapStore.ts` | Eliminar → store nuevo |
| `src/hooks/useMapProject.ts` | Eliminar → hook nuevo |
| `src/hooks/useMapImageUrl.ts` | Eliminar o reemplazar — patrón IPC imagen reutilizable |
| `src/lib/types/maps.ts` | Eliminar → tipos v2 |
| `src/lib/types/mapDrawing.ts` | Eliminar → esquema v2 en tipos mapas |
| `src/lib/maps/mapMutations.ts` | Eliminar |
| `src/lib/maps/mapErrors.ts` | Reescribir claves — conservar **patrón** i18n |

### 2.3 Rust (reescribir store + comandos)

| Archivo | Acción |
|---------|--------|
| `src-tauri/src/fs/maps_store.rs` | Eliminar lógica legacy (~1000 líneas) |
| `src-tauri/src/commands/maps.rs` | Eliminar → comandos v2 |
| `src-tauri/src/lib.rs` | Quitar 14 comandos legacy; registrar v2 |
| `src-tauri/src/fs/mod.rs` | Mantener `pub mod maps_store` (implementación nueva) |

**Comandos IPC legacy (eliminar):**  
`list_project_maps`, `get_map_data_cmd`, `save_map_data_cmd`, `create_map_cmd`, `create_blank_map_cmd`, `import_map_image_cmd`, `import_overlay_image_cmd`, `get_map_state_at_cmd`, `get_map_sketch_cmd`, `save_map_sketch_cmd`, `get_map_drawing_cmd`, `save_map_drawing_cmd`, `save_map_canvas_png_cmd`

**Candidato a conservar como utilidad genérica:** `read_project_image_cmd` (carga imagen del proyecto).

### 2.4 Formato disco legacy storage legacy (descartar esquema)

```text
.narralith/maps/
  index.json
  {mapId}/
    manifest.json
    layers.json
    drawing.json
    sketches/default.excalidraw.json
Imagenes/Mapas_y_Geografia/   # PNGs base y overlays
```

### 2.5 Dependencias npm (eliminar en MAP-012)

`leaflet`, `react-leaflet`, `@types/leaflet`, `@excalidraw/excalidraw`

### 2.6 Tests

| Qué | Acción |
|-----|--------|
| Tests en `maps_store.rs` | Eliminar con legacy; nuevos en MAP-001+ |
| Tests frontend mapas | Ninguno hoy |

---

## 3. Inventario — conservar / reenganchar

| Pieza | Acción en rebuild |
|-------|-------------------|
| `WorkspaceShell.tsx` | Mantener rama `mainView === "map"`; montar UI nueva |
| `GlobalNav.tsx` | Botón Mapas |
| `useProjectStore.ts` | Reset store mapas al cambiar proyecto |
| `scaffold.rs` / `adopt.rs` | `ensure_maps_dir()` — carpeta `.narralith/maps/` |
| `useMapsRenderAudit.stub.ts` + `events.ts` | Stubs OBS `obs.ui.maps.*` — adaptar a UI v2 |
| `src/i18n/{es,en}/maps.json` | Reescribir strings; conservar namespace |
| `src/i18n/config.ts` | Registro namespace maps |

### 3.1 No confundir con módulo mapas

| Archivo | Motivo |
|---------|--------|
| `template_map.json` | Plantillas WB — **no** es persistencia de mapas |
| `worldbuilding.json` `mapImage` | Campo ficha WB |

---

## 4. Criterios de aceptación MAP-000

| # | Criterio | Estado |
|---|----------|--------|
| D1 | Tabla conservar/purgar documentada | ✅ §2–3 |
| D2 | Decisión stack (canvas, sin Leaflet/Excalidraw) | ✅ §1.2 |
| D3 | Decisión formato persistencia (JSON, un archivo/dibujo) | ✅ §1.3 · spec §9 |
| D4 | Decisión borrador sucio (autosave disco) | ✅ §1.4 |
| D5 | Estrategia purga (MAP-001 + MAP-012) | ✅ §1.1 |
| D6 | Spec `maps-design.md` + `maps-roadmap.md` alineados | ✅ |
| D7 | Purga física en repo | ➡️ **MAP-001** (fuera de alcance MAP-000) |

---

## 5. Siguiente paso

1. **MAP-001** — commit de purga + esquema disco v2 + IPC mínimo + placeholder UI si hace falta.
2. Seguir [`maps-roadmap.md`](../../maps-roadmap.md) en orden de dependencias.

---

## 6. Registro

| Fecha | Evento |
|-------|--------|
| 2026-06-11 | Plan MAP-000 redactado; decisiones jun 2026 incorporadas desde chat Era III |
| 2026-06-11 | **MAP-000 ✅ cerrado** — D1–D6 completos; D7 delegado a MAP-001 |
