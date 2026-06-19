# MAP-005 — Estudio dibujo Sketchbook (captura, presión, autosave)

> **Estado:** 🔨 **En progreso** (2026-06-11) · Fases 1–4 implementadas · Fase 5+ pendiente  
> **Esfuerzo:** Alto · **Riesgo:** Medio (↓ tras revisión; goma/capas offscreen acotadas)  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md) Fase F · **Spec:** [`maps-design.md`](../../maps-design.md) §3bis · **Previo:** [MAP-004 ✅](MAP-004-view-modes.md) · **Siguiente:** MAP-006

---

## 0. Convención

| Regla | Detalle |
|-------|---------|
| Flujo | Plan → ejecución → tests → QA/OBS → cerrar §12 → MAP-006 |
| Commits | Usuario |
| Evidencia | Recorrido OBS §10 (post-implementación) |
| OBS previo a planificar | **No requerido** — MAP-004 QA reciente; baseline opcional §2.4 |

---

## 1. Problema y objetivo

### 1.1 Problema (post MAP-004)

MAP-004 entrega viewport compartido y modos vista, pero el estudio **no persiste trazos**:

| Carencia | Impacto |
|----------|---------|
| Modo edición sin captura pointer | Spec §3bis incumplido |
| `MapEditToolbar` = placeholder | Usuario no puede dibujar |
| `save_map_drawing_cmd` sin uso en FE | Persistencia v2 sin ciclo de escritura |
| `mapStrokeRender` ignora `pressure` | Tableta futura sin render coherente |
| Pan con botón izquierdo siempre activo | Impide trazo con ratón en edit |
| Sin autosave debounced | §9.4 — riesgo de pérdida al cerrar |
| Sin undo/redo sesión | UX Sketchbook incompleta |
| `save_map_drawing` no toca `index.updatedAt` | Preferencia «último modificado» (MAP-002) no refleja dibujo |

### 1.2 Objetivo MAP-005

Conectar el **estudio de dibujo** al viewport MAP-004 en `viewMode === "edit"`:

1. **Herramientas:** pincel + goma; **3 pinceles v1** (`pen`, `pencil`, `marker`).
2. **Color:** paleta 9 swatches + **color personalizado** (hex).
3. **Presión:** `pressure` 0–1 por punto vía Pointer Events; ratón → trazo uniforme.
4. **Captura:** trazos nuevos en capa activa (`layer-1` por defecto) → `principal.json`.
5. **Render:** preview en vivo + trazos guardados con motor de pincel (presión al dibujar y al re-render).
6. **Autosave:** debounced ~500 ms + flush en `pagehide` / `visibilitychange`.
7. **Undo/redo** en memoria (sesión UI, no persistido).
8. Sustituir placeholder `MapEditToolbar` por **estudio Sketchbook** (toolbar + controles mínimos).
9. **Un solo viewport** — no duplicar canvas (handoff MAP-004).

### 1.3 Criterios de aceptación

| # | Criterio |
|---|----------|
| C1 | Solo en `viewMode === "edit"`: arrastre con pincel activo **añade** trazo a `drawing` |
| C2 | Modo `interactive`: **sin** captura de trazos (MAP-004 intacto) |
| C3 | Trazo persiste tras autosave; reabrir mapa / reentrar módulo → trazo visible |
| C4 | Paleta 9 colores + selector custom; color activo visible |
| C5 | 3 pinceles seleccionables; tamaño/opacidad base ajustables (sliders) |
| C6 | Goma (`tool: "eraser"`) borra visualmente (composite canvas) y persiste en JSON |
| C7 | Tableta: puntos con `pressure` distinto de uniforme; ratón: sin `pressure` o `1.0` |
| C8 | `pencil`: presión modula **grosor y opacidad** al renderizar |
| C9 | Pan en edición: Space+drag, botón central, o herramienta «Mano» — **no** con pincel+goma |
| C10 | Autosave debounced; indicador guardado/error; flush al cerrar pestaña/app |
| C11 | Undo/redo al menos del último trazo completado |
| C12 | OBS: `drawStroke`, `saveDrawing`, `brushChange`, `colorChange`, `undo`/`redo` |
| C13 | Tras guardar dibujo, `lastModified` coherente si Rust actualiza index (D10) |

### 1.4 Fuera de alcance MAP-005

| Tema | Plan |
|------|------|
| Panel capas (mostrar/ocultar, reordenar, renombrar) | **MAP-006** |
| Multiselección de capa activa (más allá de `layer-1`) | **MAP-006** |
| Pinceles extra (`soft`, aerógrafo, tilt) | Post-v1 / MAP-006+ |
| Cuentagotas, relleno, texto | Spec §3bis.4 futuro |
| Secundarios, timeline T, hotspots | MAP-008–010 |
| `*.autosave.json` hermano para crash recovery | Opcional post-v1 |
| Export PNG/TIFF del lienzo | Fuera Era III |
| Cambio de proyecto en caliente (QA) | Fuera (MAP-002/004) |
| QA obligatoria con tableta Wacom | Recomendada; ratón cubre C7 parcial |

---

## 2. Auditoría post MAP-004 (jun 2026)

### 2.1 Rust / IPC — lo que ya existe

| Pieza | Estado |
|-------|--------|
| `MapDrawingV2` / `MapStrokeV2` / `pressure?` | ✅ esquema v2 |
| `validate_drawing` — `pressure` 0..1 | ✅ |
| `get_map_drawing_cmd` / `save_map_drawing_cmd` | ✅ escritura atómica |
| `save_map_drawing` → index `updatedAt` | ❌ **gap** — **obligatorio** MAP-005 (D10, C13) |
| Límite payload IPC | Sin límite explícito en FE; trazos largos = riesgo perf |

**Archivos:** `maps_store.rs`, `commands/maps.rs` — cambio Rust **obligatorio** (D10).

### 2.5 Revisión implementabilidad (2026-06-11)

Veredicto: **seguro de implementar** si se respetan D12–D16. Sin ellos hay regresiones probables.

| # | Hallazgo | Severidad | Resolución en plan |
|---|----------|-----------|-------------------|
| R1 | Goma `destination-out` sobre canvas unificado **borra la imagen base** | 🔴 Bloqueante | D7 + D12: trazos en buffer offscreen |
| R2 | `event.pressure > 0` excluye punta de tableta y ratón inconsistente | 🔴 Bloqueante | D13: presión por `pointerType` |
| R3 | Doble fuente de verdad (`useMapProject.drawing` vs session) | 🟠 Alto | D14: session autoritativa en edit |
| R4 | Cambiar mapa con `isDirty` pierde trazos | 🟠 Alto | D15: flush antes de `selectMap` |
| R5 | `expand/crop` → `refreshActiveMap` pisa session sin flush | 🟠 Alto | D15 |
| R6 | `useMapViewport` ya ~370 LOC; mezclar dibujo = deuda | 🟡 Medio | D16: hook `useMapDrawGesture` separado |
| R7 | D10 marcado «opcional» pero C13 lo exige | 🟡 Medio | D10 **obligatorio** |
| R8 | Atajos Ctrl+Z globales compiten con editor | 🟡 Medio | D8: solo si `mainView === "map"` |
| R9 | Puntos cada `pointermove` → JSON/IPC enorme | 🟡 Medio | D13: distancia mínima 1.5 px doc |
| R10 | `drawing.width/height` debe coincidir con `document` al save | 🟡 Medio | Validar en FE antes de IPC |

**OBS previo:** sigue sin ser necesario.

### 2.2 Frontend — lo que ya existe

| Pieza | Estado |
|-------|--------|
| `MapViewport` + `useMapViewport` | ✅ pan/zoom, render trazos read-only |
| `mapStrokeRender.ts` | ✅ polilíneas; **sin** presión ni goma |
| `MapEditToolbar` | Placeholder + expand/crop |
| `useMapProject` | Carga drawing; **sin** `saveDrawing` |
| `useMapStore.viewMode` | ✅ |
| Legacy `MapDrawStudio` / `mapDrawing.ts` | Purgados — referencia UX en spec §3bis.1 |

### 2.3 Spec §3bis — pendientes cerrados en este plan

| Pendiente spec | Decisión MAP-005 |
|----------------|------------------|
| Lista pinceles v1 | **Cerrada:** `pen`, `pencil`, `marker` (D2) |
| Color custom | Popover hex + swatches 9 (D3) |
| Presión por punto | Pointer Events; motor `mapBrushEngine` (D4) |
| Estudio ↔ capas | Escribe en **capa activa** = primera `layers[]` no `locked` (hoy `layer-1`) |
| Undo/redo | Stack in-memory, max 50 ops (D8) |
| Zoom herramienta dibujo | **No** — reutilizar pan/zoom viewport MAP-004 |

### 2.4 ¿Recorrido OBS previo para planificar?

**No hace falta** antes de implementar.

| Motivo | Detalle |
|--------|---------|
| MAP-004 QA reciente | `1781831409032-13548` — viewport/compositor OK |
| MAP-005 añade acciones nuevas | Validar post-implementación |

Baseline opcional: entrar edición → confirmar que hoy **no** se guarda trazo al dibujar.

---

## 3. Decisiones de diseño (cerradas para implementación)

### D1 — Estado del estudio (RAM)

```typescript
type MapStudioTool = "brush" | "eraser" | "pan";

interface MapStudioState {
  tool: MapStudioTool;
  brushId: MapBrushId;           // "pen" | "pencil" | "marker"
  color: string;                 // #RRGGBB
  baseSize: number;              // px document space, clamped
  baseOpacity: number;           // 0..1
  setTool(...): void;
  setBrush(...): void;
  setColor(...): void;
  setBaseSize(...): void;
  setBaseOpacity(...): void;
  reset(): void;                 // on project change
}
```

| Evento | Comportamiento |
|--------|----------------|
| Cambio proyecto | `reset()` defaults |
| Cambio mapa | Conservar preferencias herramienta (RAM sesión) |
| Salir de edición | Conservar tool/color; no afecta drawing en disco |

Persistencia preferencias estudio: **solo RAM** v1 (no `localStorage`).

### D2 — Pinceles v1 (lista cerrada)

| `brushId` | Etiqueta ES | `baseSize` | `baseOpacity` | Presión → size | Presión → opacity |
|-----------|-------------|------------|---------------|----------------|-------------------|
| `pen` | Pluma | 2 | 1.0 | fuerte | no |
| `pencil` | Lápiz | 4 | 0.85 | fuerte | **sí** (prioridad UX spec) |
| `marker` | Rotulador | 12 | 0.55 | suave | suave |

Definición en `lib/maps/mapBrushes.ts` — única fuente de verdad FE (+ tests).

### D3 — Paleta de color

**9 swatches** (alineado spec legacy + contraste):

```typescript
export const MAP_STUDIO_PALETTE = [
  "#000000", "#ffffff", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#78716c",
] as const;
```

**Color custom:** `input[type=color]` o popover hex validado `#RRGGBB`. Swatch activo + preview en toolbar.

### D4 — Motor de pincel (`mapBrushEngine.ts`)

```typescript
interface BrushPointStyle {
  size: number;
  opacity: number;
}

function strokePointStyle(
  brush: MapBrushPreset,
  baseSize: number,
  baseOpacity: number,
  pressure: number, // 0..1, ratón → 1
): BrushPointStyle;
```

Curvas por pincel (funciones puras, testeables):

- `pen`: `size = baseSize * (0.35 + 0.65 * pressure)`
- `pencil`: size + opacity modulados (ej. opacity `baseOpacity * (0.25 + 0.75 * pressure)`)
- `marker`: size suave; opacity casi fija

**Render segmentos:** interpolar estilo entre puntos consecutivos (lineCap round); MAP-005 v1 puede usar grosor por segmento medio (no variable intra-segmento) — suficiente para QA ratón/tableta.

**Persistencia:** guardar `{ x, y, pressure? }` — **no** size/opacity calculados (spec §3bis.2.1).

### D5 — Gestos pointer vs pan (conflicto MAP-004)

| Modo | Botón izquierdo | Space + izq | Central | Rueda |
|------|-----------------|-------------|---------|-------|
| `interactive` | pan | pan | pan | zoom |
| `edit` + `pan` tool | pan | pan | pan | zoom |
| `edit` + `brush`/`eraser` | **dibujar** | pan | pan | zoom |

Implementación: bifurcar en `useMapViewport` según `viewMode`, `studio.tool` y `event.button` / `spacePressed`.

Coordenadas trazo: **espacio documento** — invertir transform viewport:

```typescript
function screenToDocument(
  clientX: number, clientY: number,
  rect: DOMRect, viewport: MapViewportState,
): { x: number; y: number };
```

Clamp opcional a `[0, document.width]` × `[0, document.height]` — **no** clamp v1 (permite trazos en expand futuro).

### D6 — Sesión de dibujo + capa activa

```typescript
interface MapDrawingSession {
  drawing: MapDrawingV2;          // copia editable (sync desde hook al cargar mapa)
  activeLayerId: string;          // v1: "layer-1" fijo hasta MAP-006
  isDirty: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  currentStroke: MapStrokeV2 | null;  // preview en vivo
}
```

Flujo trazo:

1. `pointerdown` → crear stroke con `id` único (`stroke-${crypto.randomUUID()}`).
2. `pointermove` → append point si distancia ≥ 1.5 px (D13).
3. `pointerup` → push stroke a `layers[activeLayer].strokes`; push undo stack; mark dirty → autosave.

**Capa locked:** no dibujar; mostrar toast i18n.

### D7 — Goma

| Aspecto | Decisión |
|---------|----------|
| Modelo disco | `tool: "eraser"`, `brush: "pen"`, color irrelevante |
| Render | `globalCompositeOperation = "destination-out"` **solo dentro del buffer de trazos** (D12) |
| Tamaño | `baseSize` del estudio (slider compartido con pincel) |

No boolean-op vectorial avanzado v1. La goma **no** debe afectar imagen base ni rejilla.

### D12 — Capa offscreen de trazos (obligatorio)

`paintMapViewport` pasa a **dos pasos** en espacio documento:

```text
1. Fondo viewport + translate/scale
2. Base: color sólido + grid O baseImage
3. Buffer offscreen (document.width × document.height):
     drawMapStrokes(bufferCtx, drawing + preview)
     — eraser usa destination-out aquí
4. ctx.drawImage(buffer, 0, 0)
```

Reutilizar un `OffscreenCanvas` / canvas auxiliar reciclado por mapId para no allocar cada frame. Tests: eraser sobre trazo no transparenta imagen import debajo.

### D13 — Presión y muestreo de puntos

**Presión** (no usar `pressure > 0` como gate):

```typescript
function samplePoint(event: PointerEvent, rect: DOMRect, viewport: MapViewportState) {
  const { x, y } = screenToDocument(...);
  const pressure =
    event.pointerType === "pen"
      ? clamp(event.pressure, 0.05, 1) // punta tableta puede ser ~0
      : undefined; // ratón: omitir campo (spec §3bis.2.1)
  return pressure === undefined ? { x, y } : { x, y, pressure };
}
```

**Muestreo:** añadir punto solo si distancia euclídea ≥ **1.5 px** (doc space) respecto al anterior — reduce JSON y suaviza trazo.

### D14 — Fuente de verdad del dibujo

| Contexto | Autoridad |
|----------|-----------|
| Modo `interactive` | `useMapProject` → `drawing` IPC (solo lectura) |
| Modo `edit` | `useMapDrawingSession.drawing` (copia editable) |
| Tras save OK | Patch `activeSnapshot` en `useMapProject` **o** `session.syncFromServer(drawing)` |
| Init / cambio `activeKey` | Session **reset** desde `drawing` cargado; descartar undo stack |

`MapViewport` recibe `drawing` + `previewStroke` desde session — **no** leer directamente snapshot de project mientras edit+dirty.

Función pura: `resolveActiveLayer(drawing): MapDrawingLayerV2` — primera capa `visible && !locked`.

### D15 — Flush antes de operaciones destructivas

Secuencia obligatoria antes de:

- `selectMap(otherId)`
- `expandCanvas` / `cropCanvas`
- salir de `viewMode: edit` (opcional v1: autosave ya debounced — **sí** flush sync si `isDirty`)
- cambio proyecto (`useMapStore.reset`)

```typescript
if (session.isDirty) await flushAutosave({ reason: "mapSwitch" | "canvasOp" | "pagehide" });
```

Si flush falla: **bloquear** cambio de mapa y mostrar error (no perder trazos silently).

### D16 — Separación hooks (no inflar `useMapViewport`)

| Hook | Responsabilidad |
|------|-----------------|
| `useMapViewport` | Pan/zoom, resize, paint pipeline, audit viewport |
| `useMapDrawGesture` | pointer draw vs pan (D5), `currentStroke`, callbacks a session |
| `MapViewport.tsx` | Compone ambos; pasa `studioTool`, `viewMode` |

`paintMapViewport` acepta `previewStroke?: MapStrokeV2 | null`.

### D8 — Undo / redo

| Regla | Valor |
|-------|-------|
| Alcance | Solo sesión UI |
| Unidad | Añadir / quitar stroke completo |
| Profundidad | 50 operaciones |
| Persistencia | No en disco |
| Atajos | `Ctrl+Z` / `Ctrl+Y` solo con `mainView === "map"` **y** `viewMode === "edit"` (`preventDefault`) |

Redo invalidado al trazo nuevo post-undo.

### D9 — Autosave

| Parámetro | Valor |
|-----------|-------|
| Debounce | **500 ms** tras último cambio (`MAP_AUTOSAVE_DEBOUNCE_MS`) |
| IPC | `save_map_drawing_cmd({ mapId, drawing })` |
| Flush | `pagehide`, `visibilitychange` → hidden |
| Tras éxito | `isDirty = false`; opcional `loadSession()` para index |
| Tras error | `saveStatus: "error"`; mantener dirty |
| Concurrencia | Cancelar save pendiente si mapa cambia |

Patrón referencia: espíritu `useMapProject` MAP-001 / editor debounce — **no** reutilizar tipos legacy.

Indicador UI: «Guardando…» / «Guardado» / error en footer estudio.

### D10 — Rust: `updatedAt` al guardar dibujo (**obligatorio**)

Extender `save_map_drawing`:

```rust
pub fn save_map_drawing(...) -> Result<(), AppError> {
    // ... validate + write_json_atomic principal.json
    let doc = get_map_document(project_root, map_id)?;
    let now = timestamp_now();
    upsert_index_entry(project_root, map_id, &doc.name, &now, None)?;
    Ok(())
}
```

+ test Rust: `save_map_drawing` → `index.maps[].updatedAt` avanza.

**Nota:** no hace falta reescribir `map.json` en v1; MAP-002 `lastModified` lee index.

### D11 — Layout estudio (reemplaza placeholder)

```text
┌─────────────────────────────────────────────────────────┐
│ Header MAP-004 (sin cambios)                            │
├─────────────────────────────────────────────────────────┤
│ MapViewport (captura + preview trazo en edit)          │
├─────────────────────────────────────────────────────────┤
│ MapEditStudio (footer, sustituye MapEditToolbar)        │
│  [Mano|Pincel|Goma] · pinceles · paleta · custom color  │
│  · sliders tamaño/opacidad · Undo Redo · estado save    │
│  · [Expandir|Recortar] (MAP-003)                        │
└─────────────────────────────────────────────────────────┘
```

Inspiración Sketchbook: compacto en footer v1; columna lateral de pinceles **opcional** si footer queda apretado — preferir footer horizontal + dropdown pinceles antes de nueva columna.

---

## 4. Esquema e IPC

### 4.1 Sin cambio de versión `drawing.json`

Sigue `version: 2`. Campos stroke ya soportan `pressure`.

### 4.2 IPC

| Comando | MAP-005 |
|---------|---------|
| `save_map_drawing_cmd` | **Usar** — principal entrega |
| `get_map_drawing_cmd` | Recargar tras save conflict (v1 omitir conflict) |
| Nuevo comando | **No requerido** |

### 4.3 Tipos TS nuevos

```typescript
type MapBrushId = "pen" | "pencil" | "marker";
type MapStudioTool = "brush" | "eraser" | "pan";

interface MapBrushPreset {
  id: MapBrushId;
  labelKey: string;
  defaultSize: number;
  defaultOpacity: number;
  pressureSize: "none" | "soft" | "strong";
  pressureOpacity: boolean;
}
```

---

## 5. Frontend — diseño de componentes

### 5.1 Archivos

| Archivo | Rol |
|---------|-----|
| `stores/useMapStudioStore.ts` | Tool, brush, color, size, opacity |
| `lib/maps/mapBrushes.ts` | Presets v1 |
| `lib/maps/mapBrushEngine.ts` | Presión → size/opacity |
| `lib/maps/mapDrawCoords.ts` | screen ↔ document |
| `lib/maps/mapDrawingSession.ts` | Pure: append stroke, undo/redo ops |
| `hooks/useMapDrawingSession.ts` | Estado editable + undo + dirty |
| `hooks/useMapAutosave.ts` | Debounce + flush |
| `lib/maps/mapStrokeRender.ts` | **Ampliar:** presión, goma, preview stroke |
| `lib/maps/useMapViewport.ts` | Pan/zoom, offscreen compositor (D12), audit |
| `hooks/useMapDrawGesture.ts` | **Nuevo** — pointer draw vs pan (D16) |
| `modules/maps/MapEditStudio.tsx` | Toolbar estudio (reemplaza placeholder) |
| `modules/maps/MapColorPicker.tsx` | Swatches + custom |
| `modules/maps/MapWorkspace.tsx` | Cablear session + autosave |
| `hooks/useMapProject.ts` | `saveDrawing(drawing)` wrapper IPC |
| `i18n/{es,en}/maps.json` | `studio.*`, save status |
| `src-tauri/src/fs/maps_store.rs` | D10 index touch (recomendado) |

**Eliminar / sustituir:** lógica placeholder en `MapEditToolbar.tsx` → migrar a `MapEditStudio.tsx` (renombrar o deprecar archivo).

### 5.2 Flujo datos

```text
get_map_drawing_cmd (MAP-004 load)
    │
    ▼
useMapDrawingSession — copia editable + undo stack
    │
    ├─ pointer en edit → currentStroke → layers[].strokes
    ├─ mapStrokeRender (preview + committed)
    │
    ▼
useMapAutosave (debounce 500ms)
    │
    ▼
save_map_drawing_cmd → principal.json
    │
    └─ (Rust D10) index.updatedAt
```

### 5.3 Integración MAP-004

| Pieza MAP-004 | MAP-005 |
|---------------|---------|
| `viewMode` | Dibujo solo si `edit` |
| Viewport único | Preview `currentStroke` en mismo canvas |
| Pan/zoom | Compartido; reglas D5 |
| Compositor OBS | Emitir al cambiar strokes (debounce audit) |
| Expand/crop | Flush dirty (D15) → IPC → session `resetFromDrawing(server)` |

---

## 6. OBS — eventos

### 6.1 Acciones (nuevas)

| Evento | Cuándo | Payload |
|--------|--------|---------|
| `obs.action.map.drawStroke` | Fin de trazo | `{ mapId, strokeId, tool, brush, pointCount, hadPressure }` |
| `obs.action.map.saveDrawing` | Autosave OK / flush | `{ mapId, strokeCount, layerCount }` |
| `obs.action.map.brushChange` | Cambio pincel | `{ mapId, brushId }` |
| `obs.action.map.colorChange` | Cambio color | `{ mapId, color }` |
| `obs.action.map.toolChange` | brush/eraser/pan | `{ mapId, tool }` |
| `obs.action.map.undo` | Undo | `{ mapId, depth }` |
| `obs.action.map.redo` | Redo | `{ mapId, depth }` |

### 6.2 UI (ampliar)

| Evento | Cambio MAP-005 |
|--------|----------------|
| `obs.ui.maps.compositor` | Emitir al cambiar stroke count / layers (debounced) |
| `obs.ui.maps.viewport` | Sin cambio de contrato |

---

## 7. Fases de ejecución

```text
Fase 1  mapBrushes + mapBrushEngine + mapDrawCoords + resolveActiveLayer + tests
Fase 2  useMapStudioStore + useMapDrawingSession (sin IPC)
Fase 3  Offscreen stroke compositor (D12) + presión render + preview
Fase 4  useMapDrawGesture + cableado MapViewport (dibujar vs pan)
Fase 5  MapEditStudio UI (tools, palette, sliders, undo/redo)
Fase 6  useMapAutosave + flush D15 + save_map_drawing_cmd + indicador
Fase 7  Rust D10 (index updatedAt) + test maps_store
Fase 8  OBS acciones + i18n
Fase 9  QA manual §9
```

**Checkpoint intermedio (recomendado):** tras Fase 4, QA mínimo ratón (trazo visible, pan Space+drag) **antes** de autosave — detecta R1/R2 pronto.

---

## 8. Verificación automatizada

| Comando | Esperado |
|---------|--------|
| `cargo test maps_store` | + test save actualiza index (D10) |
| `npm test` | + brushEngine, coords, session undo, store |
| `npm run build` | OK |

---

## 9. Recorrido OBS para QA (usuario, post-implementación)

**Prerrequisitos:** OBS activo; mapa blank + mapa import; opcional tableta.

| Paso | Acción | Qué buscar |
|------|--------|------------|
| 1 | Editar mapa blank | Trazo visible; grid bajo trazo |
| 2 | Cambiar color/pincel | `colorChange`, `brushChange` |
| 3 | Dibujar varios trazos | `drawStroke` por trazo |
| 4 | Esperar ~1 s | `saveDrawing`; trazo en disco (`principal.json`) |
| 5 | Salir edición → reentrar | Trazos persisten |
| 6 | Undo / redo | `undo` / `redo`; canvas coherente |
| 7 | Goma en mapa **import** | Trazo borrado; **imagen base intacta** (D12) |
| 8 | Space+drag | Pan sin dibujar con pincel activo |
| 9 | (Opcional) tableta | `hadPressure: true` en `drawStroke` |
| 10 | Expandir lienzo en edit | Trazos conservados; save OK |

**Fuera de alcance QA:** capas UI, timeline, hotspots, crop (opcional).

**Archivos:** `action-session-*.ndjson`, `ui-session-*.ndjson`.

---

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Eraser borra imagen import | Buffer offscreen D12 — **no** destination-out en canvas final |
| Pan vs dibujo confuso | Tool «Mano» explícita; Space+drag documentado en UI |
| Eraser vectorial imperfecto | destination-out solo entre trazos en buffer |
| Strict Mode doble mount | Igual MAP-004 — documentar |
| Save race al cambiar mapa | D15 flush/sync; bloquear switch si save falla |
| Presión no disponible | Ratón: omitir `pressure`; QA tableta opcional |
| Trazos muy largos | Muestreo 1.5 px + debounce save |
| expand/crop pisa session | Flush previo + reset session desde servidor |

---

## 11. Handoff → MAP-006

MAP-006 tomará:

- Estudio operativo escribiendo en `layers[]`.
- `activeLayerId` en session → UI selector capas.
- Panel capas: visible, opacity, reorder, lock.
- Compositor OBS ampliado al togglear capas.

MAP-005 debe **no** hardcodear solo `layer-1` en más de un sitio — usar `resolveActiveLayer(drawing)`.

---

## 12. Registro

| Fecha | Evento |
|-------|--------|
| 2026-06-11 | Plan MAP-005 redactado (auditoría post MAP-004 ✅, QA `1781831409032-13548`) |
| 2026-06-11 | **Revisión implementabilidad** — D12–D16, D10 obligatorio, fases reordenadas |
| 2026-06-11 | **Fases 1–3** — libs, stores, session, offscreen compositor, presión/goma render |
| 2026-06-11 | **Fase 4** — `useMapDrawGesture`, pan vs dibujo (D5), preview en vivo |
