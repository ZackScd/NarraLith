# MAP-006 — Capas internas por dibujo

> **Estado:** ✅ **Implementado + QA OK** (2026-06-11)  
> **Esfuerzo:** Medio · **Riesgo:** Medio-bajo (schema ya existe; UI + dirty + OBS)  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md) Fase F · **Spec:** [`maps-design.md`](../../maps-design.md) §4.1 · **Previo:** [MAP-005 ✅](MAP-005-draw-studio.md) + [MAP-005b ✅](MAP-005b-save-undo-persistence.md) · **Siguiente:** MAP-007

---

## 0. Convención

| Regla | Detalle |
|-------|---------|
| Flujo | Plan → ejecución → tests → QA/OBS → cerrar §12 → MAP-007 |
| Commits | Usuario |
| Evidencia | Recorrido QA §9 + sesión OBS post-implementación |
| OBS previo a planificar | **No requerido** — auditoría código + spec §4.1 suficiente (ver §2.4) |

---

## 1. Problema y objetivo

### 1.1 Problema (post MAP-005 + MAP-005b)

El estudio dibuja y persiste en `layers[]`, pero el producto de **capas internas** no existe en UI:

| Carencia | Impacto |
|----------|---------|
| Una sola capa efectiva (`layer-1`) | Spec §4.1 incumplido en UX |
| `activeLayerId` definido en MAP-005 D6 **no implementado** | Dibujo va a la primera capa `visible && !locked` |
| Sin panel visible / opacidad / orden / bloqueo | Usuario no puede organizar trazos |
| Cambios de metadata de capa **no marcan sucio** | MAP-005b baseline ignora `visible`, `opacity`, `locked`, `name`, orden |
| Sin OBS de operaciones de capa | QA futuro imposible de auditar |
| Toast capa bloqueada (MAP-005 D6) | Solo `canDraw=false` silencioso |

**Lo que ya funciona (no reimplementar):**

- Schema `MapDrawingLayerV2` en TS + Rust + `principal.json`.
- Render multi-capa: `drawMapStrokes` respeta `visible`, `opacity`, orden de `layers[]`.
- Undo/redo de **trazos** con `layerId` en cada op.
- Guardado manual, borrador localStorage, diálogo sucio (MAP-005b).

### 1.2 Objetivo MAP-006

Entregar el **panel de capas internas** del estudio y la **selección explícita de capa activa**:

1. `activeLayerId` en sesión de dibujo → trazos van a la capa elegida.
2. Panel lateral (derecha, spec §3bis) con: listar, añadir, eliminar, renombrar, reordenar, visible, opacidad, bloqueo.
3. Integración con MAP-005b: edits de capa marcan `isDirty`; borrador persiste `activeLayerId`.
4. Validación Rust mínima de integridad de `layers[]`.
5. OBS action + compositor ampliados para operaciones de capa.

### 1.3 Criterios de aceptación

| # | Criterio |
|---|----------|
| C1 | Modo edición muestra **panel de capas** a la derecha del viewport |
| C2 | Mapa nuevo sigue con capa default `layer-1` / «Capa 1»; usuario puede **añadir** capas |
| C3 | Usuario **selecciona capa activa**; trazos nuevos van solo a esa capa (`drawStroke` OBS incluye `layerId`) |
| C4 | Toggle **visible** oculta capa en viewport (interactivo y edición) sin borrar trazos |
| C5 | Slider **opacidad** 0–1 por capa; render coherente |
| C6 | Toggle **bloqueo** impide dibujar en esa capa; toast i18n si intento de trazo |
| C7 | **Reordenar** capas (drag) cambia z-order; índice 0 = fondo, último = arriba |
| C8 | **Renombrar** capa inline o diálogo compacto |
| C9 | **Eliminar** capa: confirmación si tiene trazos; **siempre ≥ 1 capa** en el dibujo |
| C10 | Cambios de capa (visible/opacidad/lock/reorder/rename/add/delete) marcan **Sin guardar** y persisten en **borrador** localStorage |
| C11 | Undo/redo de **trazos** sigue operativo cross-layer; ops de capa **fuera de undo v1** (ver D8) |
| C12 | OBS: eventos `layer.*` + `drawStroke.layerId` + compositor con `activeLayerId` y snapshot capas |
| C13 | Tests unitarios session mutators, baseline fingerprint capas, validación Rust, panel básico |
| C14 | Guards MAP-005b (salir edición, cambiar mapa/vista/proyecto) respetan sucio por edits de capa |

### 1.4 Fuera de alcance MAP-006

| Tema | Plan |
|------|------|
| Undo/redo de ops de capa (reorder, delete layer) | v2 / post-MAP-006 — ver D8 |
| Campo `order` / `zIndex` separado del array | Orden = índice en `layers[]` |
| Agrupación / carpetas de capas | Futuro |
| Blend modes por capa | Fuera Era III v1 |
| Capas compartidas entre mapas o dibujos | Spec §4.1 — ámbito por archivo |
| Etiqueta «Desde», dibujo principal narrativo | **MAP-007** |
| Secundarios temporales, compositor T | **MAP-008 / MAP-009** |
| Eraser cross-layer (borra trazos inferiores en buffer) | Comportamiento actual — documentar, no cambiar |
| Pinceles extra (`soft`, aerógrafo) | Post-v1 |

---

## 2. Auditoría (estado repo jun 2026)

### 2.1 Lo que ya existe (reutilizar)

| Pieza | Archivo | Notas |
|-------|---------|-------|
| Tipos capa | `lib/types/maps.ts` | `MapDrawingLayerV2`, `MapDrawingV2.layers[]` |
| Persistencia | `src-tauri/src/fs/maps_store.rs` | `get/save_map_drawing`, default `layer-1` |
| Resolver capa | `lib/maps/mapDrawingSession.ts` | `resolveActiveLayer`, `pushStrokeToLayer`, undo ops |
| Sesión | `hooks/useMapDrawingSession.ts` | Undo trazos; **sin** `activeLayerId` state |
| Render | `lib/maps/mapStrokeRender.ts` | Multi-capa + preview |
| Compositor | `lib/maps/useMapViewport.ts` + `mapStrokeBuffer.ts` | Offscreen; OBS `visibleLayers[]` |
| Guardado sucio | MAP-005b | baseline, draft, guards, Ctrl+S |
| OBS compositor | `useMapViewport.ts` | Debounce 300 ms; ampliar en MAP-006 |

### 2.2 Gaps a cerrar

| Gap | Severidad |
|-----|-----------|
| Sin `activeLayerId` en session | 🔴 Bloqueante producto |
| Sin panel UI capas | 🔴 Bloqueante producto |
| Sin mutators CRUD/reorder capa | 🔴 Bloqueante |
| Fingerprint baseline sin metadata capa | 🟠 Alto — MAP-005b roto para edits capa |
| Preview duplica lógica activa | 🟡 Medio |
| Validación Rust capas mínima | 🟡 Medio |
| OBS sin eventos `layer.*` | 🟡 Medio — QA |
| Toast capa locked ausente | 🟡 Medio — MAP-005 D6 |

### 2.3 Hardcodes `layer-1`

| Ámbito | Archivos |
|--------|----------|
| Producción Rust | `maps_store.rs` — default al crear mapa ✅ |
| Producción TS | **Ninguno** — usa `resolveActiveLayer` ✅ |
| Tests | Fixtures en `mapDrawingSession.test.ts`, baseline, draft, stats |

### 2.4 OBS previo a planificar

**No requerido.** La auditoría de código + handoff MAP-005 §11 + spec §4.1 bastan para redactar este plan.

**Opcional:** editar manualmente un JSON con 2 capas para validar z-order visual antes de diseñar el panel.

**Requerido al cerrar §12:** recorrido §9 con OBS activo.

---

## 3. Decisiones de diseño

### D1 — Orden z (stack)

| Parámetro | Valor |
|-----------|-------|
| Modelo | Orden = **posición en `layers[]`** |
| Índice 0 | Capa **inferior** (fondo) |
| Último índice | Capa **superior** (encima) |
| Campo `zIndex` | **No añadir** en v1 |

Coherente con `drawMapStrokes` actual (itera `layers` en orden).

### D2 — Layout panel capas

Spec [`maps-design.md` §3bis](maps-design.md): panel **derecha**.

```text
┌──────────────────────────────────────────┬─────────────┐
│ Header MAP-004 (sin cambios)             │             │
├──────────────────────────────────────────┤  MapLayers  │
│ MapViewport                              │  Panel      │
│                                          │  (derecha)  │
├──────────────────────────────────────────┤             │
│ MapEditStudio (footer)                   │             │
└──────────────────────────────────────────┴─────────────┘
```

Solo visible en `viewMode === "edit"`. Modo interactivo: sin panel (capas visibles según `visible` en JSON).

Lista UI: capa **superior arriba** (convención Photoshop); drag reorder invierte/sincroniza con índices del array.

### D3 — `activeLayerId` en sesión

```typescript
interface MapDrawingSessionState {
  drawing: MapDrawingV2;
  activeLayerId: string;
  isDirty: boolean;
  // … undo, preview, saveStatus
}
```

**Resolver:**

```typescript
function resolveActiveLayer(
  drawing: MapDrawingV2,
  activeLayerId: string | null,
): MapDrawingLayerV2 | null {
  const byId = activeLayerId
    ? drawing.layers.find((l) => l.id === activeLayerId)
    : null;
  const candidate = byId ?? drawing.layers.find((l) => l.visible && !l.locked);
  if (!candidate || !candidate.visible || candidate.locked) return null;
  return candidate;
}
```

**Reglas de reasignación automática:**

| Evento | Acción |
|--------|--------|
| Eliminar capa activa | `activeLayerId` → capa adyacente válida |
| Ocultar/bloquear capa activa | → siguiente `visible && !locked` |
| Cargar mapa / reset session | `activeLayerId` → primera capa o la del borrador |
| Capa activa inválida en JSON | Fallback primera válida |

### D4 — Mutaciones puras de capa

Nuevo módulo o ampliación de `mapDrawingSession.ts`:

| Función | Comportamiento |
|---------|----------------|
| `addLayer(drawing, name?)` | Append capa; id `layer-${uuid8}`; default visible, opacity 1, unlocked |
| `removeLayer(drawing, layerId)` | Error si única capa; elimina capa y trazos |
| `updateLayer(drawing, layerId, patch)` | Partial: `name`, `visible`, `opacity`, `locked` |
| `reorderLayers(drawing, fromIndex, toIndex)` | Mutar orden array |
| `cloneDrawing` | Ya existe — mantener |

Todas devuelven **nuevo** `MapDrawingV2` (inmutable).

### D5 — Límites

| Límite | Valor v1 |
|--------|----------|
| Mínimo capas | **1** |
| Máximo capas | Sin tope duro; UI scroll |
| Nombre capa | 1–64 chars; trim |
| Opacidad | Clamp 0–1 en UI y validación Rust |

### D6 — Eliminar capa con trazos

Diálogo confirmación i18n (`studio.layers.deleteConfirm`). Si confirma → eliminar capa + trazos; marcar dirty. **No undo v1** (ver D8).

### D7 — Baseline / borrador (MAP-005b)

**Extender** `fingerprintMapDrawing`:

```typescript
// Incluir por capa (en orden array):
// id, name, visible, opacity, locked
// + huella trazos existente
```

Borrador (`mapDrawingDraft.ts`): añadir campo opcional `activeLayerId` al snapshot exportado por `exportDraftSnapshot`.

### D8 — Undo de operaciones de capa

| Alcance | v1 MAP-006 |
|---------|------------|
| Undo trazo (`addStroke` / futuro `removeStroke`) | ✅ Mantener |
| Undo reorder / delete layer / rename | ❌ **Fuera v1** |
| Edits capa marcan dirty + guard manual | ✅ Obligatorio |

**Motivo:** nuevos `kind` en undo stack (`reorderLayer`, `deleteLayer`, …) elevan riesgo y esfuerzo; trazos cross-layer ya funcionan.

### D9 — Capa bloqueada — feedback

Al `pointerdown` en brush/eraser con capa activa `locked` (o sin capa válida):

- No iniciar trazo.
- Toast i18n `studio.layers.lockedToast` (sonner o patrón existente en app).

### D10 — Integración MAP-005b guards

`isDirty` debe reflejar fingerprint ampliado → guards existentes (`exitEdit`, `viewChange`, `selectMap`, `project`) **sin cambio de wiring**, solo baseline fix.

Flush antes expand/crop: si dirty por capa → mismo diálogo sucio.

### D11 — Validación Rust

Ampliar `validate_drawing` en `maps_store.rs`:

| Regla | Acción |
|-------|--------|
| `layers.len() >= 1` | Error |
| IDs únicos en `layers[]` | Error |
| `opacity` en 0.0..=1.0 | Error |
| `name` no vacío tras trim | Error o default «Capa N» |
| Strokes / pressure | Sin cambio (ya validado) |

### D12 — Preview trazo

`mapStrokeRender.drawMapStrokes`: preview usa **`activeLayerId`** pasado como argumento — eliminar `find(visible && !locked)` duplicado.

### D13 — Resaltado capa activa en panel (post-QA)

Tras QA sesión 1: el estilo inicial (`bg-primary/5`) era **demasiado sutil**. Corrección en `MapLayersPanel`:

| Elemento | Estilo activo |
|----------|----------------|
| Contenedor fila | `ring-2 ring-primary ring-offset-1`, `bg-muted`, `border-primary/60` |
| Etiqueta | `studio.layers.active` («Activa») en color primario |
| Accesibilidad | `aria-selected`, `aria-current="true"` en la fila activa |

Coherente con swatches de color (`ring-primary ring-offset-1`) y herramientas del footer (`variant="default"`).

---

## 4. Esquema e IPC

### 4.1 Sin cambio de versión `drawing.json`

Sigue `version: 2`. Campos capa ya existen en schema §9.3.

### 4.2 IPC

| Comando | MAP-006 |
|---------|---------|
| `save_map_drawing_cmd` | Sin cambio — guarda `layers[]` completo |
| `get_map_drawing_cmd` | Sin cambio |
| Nuevo comando | **No requerido** |

### 4.3 Borrador localStorage

Campo nuevo en payload draft (no en disco):

```typescript
interface MapDrawingDraft {
  drawing: MapDrawingV2;
  undoOps: MapDrawingUndoOp[];
  redoOps: MapDrawingUndoOp[];
  activeLayerId?: string;
  savedAt: number;
}
```

Backward compatible: drafts sin `activeLayerId` → fallback D3.

---

## 5. Frontend — diseño de componentes

### 5.1 Archivos

| Archivo | Rol |
|---------|-----|
| `lib/maps/mapDrawingSession.ts` | **Ampliar:** mutators capa, `resolveActiveLayer(drawing, activeLayerId)` |
| `lib/maps/mapLayerOps.ts` | **Nuevo (opcional):** CRUD/reorder puros si session crece mucho |
| `hooks/useMapDrawingSession.ts` | State `activeLayerId`, setters, wire mutators, OBS `layerId` en draw |
| `lib/maps/mapDrawingBaseline.ts` | Fingerprint metadata capas (D7) |
| `lib/maps/mapDrawingDraft.ts` | `activeLayerId` en draft |
| `modules/maps/MapLayersPanel.tsx` | **Nuevo** — UI panel derecha |
| `modules/maps/MapWorkspace.tsx` | Layout edit: viewport + panel |
| `lib/maps/mapStrokeRender.ts` | Preview con `activeLayerId` |
| `modules/maps/MapViewport.tsx` | Pasar activeLayer; callback locked toast |
| `lib/maps/useMapViewport.ts` | OBS compositor ampliado |
| `lib/action-audit/events.ts` | Eventos `layer.*` |
| `i18n/{es,en}/maps.json` | `studio.layers.*` |
| `src-tauri/src/fs/maps_store.rs` | `validate_drawing` D11 |

**Sin nuevo store obligatorio:** mutaciones viven en `useMapDrawingSession`; panel recibe props/callbacks.

### 5.2 MapLayersPanel — controles v1

| Control | Comportamiento |
|---------|----------------|
| Lista capas | Una fila por capa; highlight capa activa |
| Click fila | Seleccionar `activeLayerId`; fila activa resaltada (D13) |
| Ojo | Toggle `visible` |
| Candado | Toggle `locked` |
| Slider opacidad | 0–100% UI → 0–1 modelo |
| Nombre | Click → input inline; blur/Enter confirma |
| Drag handle | Reorder (dnd-kit o HTML5 drag — seguir convención repo) |
| `+` | `addLayer` |
| Papelera | `removeLayer` con confirm D6 |

### 5.3 Flujo datos

```text
get_map_drawing_cmd
    │
    ▼
useMapDrawingSession
    ├─ activeLayerId
    ├─ MapLayersPanel → mutators → setDrawing → isDirty
    ├─ commitStroke → pushStrokeToLayer(activeLayer)
    │
    ▼
usePersistMapDrawingDraft (MAP-005b) — drawing + activeLayerId
    │
    ▼
save_map_drawing_cmd (manual / dialog / autosave ON)
```

---

## 6. OBS — eventos

### 6.1 Acciones (nuevas)

| Evento | Cuándo | Payload |
|--------|--------|---------|
| `obs.action.map.layerSelect` | Usuario elige capa activa | `{ mapId, layerId, previousLayerId? }` |
| `obs.action.map.layerCreate` | Añadir capa | `{ mapId, layerId, index }` |
| `obs.action.map.layerDelete` | Eliminar capa | `{ mapId, layerId, strokeCount }` |
| `obs.action.map.layerRename` | Renombrar | `{ mapId, layerId, nameLength }` |
| `obs.action.map.layerReorder` | Drag reorder | `{ mapId, layerId, fromIndex, toIndex }` |
| `obs.action.map.layerVisible` | Toggle ojo | `{ mapId, layerId, visible }` |
| `obs.action.map.layerOpacity` | Cambio opacidad | `{ mapId, layerId, opacity }` |
| `obs.action.map.layerLock` | Toggle candado | `{ mapId, layerId, locked }` |

Canal: `session` (info). Opacidad: emitir en `pointerup` del slider, no cada tick (debounce 300 ms opcional en verbose).

### 6.2 Acciones (ampliar existentes)

| Evento | Añadir |
|--------|--------|
| `drawStroke` | `layerId` |
| `undo` / `redo` | `layerId?`, `strokeId?` |
| `saveDrawing` | `activeLayerId`, `visibleLayerIds[]` |
| `draftPersist` | `activeLayerId`, `layerCount` |

### 6.3 UI render

Ampliar `obs.ui.maps.compositor`:

```typescript
{
  stub: false,
  mapId,
  timeT: null,
  layerCount,
  strokeCount,
  visibleLayers: string[],
  activeLayerId: string | null,
  layers: Array<{
    id: string;
    visible: boolean;
    locked: boolean;
    opacity: number;
  }>,
}
```

Emitir al togglear capa visible/opacidad (MAP-004 D5: «MAP-006 ampliará»), no solo al cambiar stroke count.

---

## 7. Fases de ejecución

```text
Fase 1  Mutators capa + resolveActiveLayer(activeLayerId) + tests unit
Fase 2  useMapDrawingSession: activeLayerId, setters, commitStroke/preview
Fase 3  Baseline fingerprint capas + draft activeLayerId + tests MAP-005b
Fase 4  MapLayersPanel UI + i18n + layout MapWorkspace
Fase 5  Toast locked + MapViewport/mapStrokeRender coherencia
Fase 6  validate_drawing Rust + cargo test maps_store
Fase 7  OBS action + compositor ampliado
Fase 8  Tests integración + npm test + build
Fase 9  QA manual §9 + cerrar §12
```

**Checkpoint recomendado:** tras Fase 4, QA mínimo manual (2 capas, dibujar en cada una, toggle visible) **antes** de OBS completo.

---

## 8. Verificación automatizada

| Comando | Esperado |
|---------|----------|
| `npm test -- --run` | + tests session, baseline, layer ops, panel (RTL opcional) |
| `npm run build` | OK |
| `cd src-tauri && cargo test maps_store` | + tests validación capas |

---

## 9. Recorrido OBS para QA (usuario, post-implementación)

**Prerrequisitos:** OBS activo; MAP-005b operativo (guardado manual por defecto); mapa en modo edición.

| Paso | Acción | Qué buscar |
|------|--------|------------|
| A1 | Entrar edición | Panel capas visible a la derecha; 1 capa default |
| A2 | Añadir capa 2; seleccionar; dibujar | `layerCreate`, `layerSelect`, `drawStroke.layerId` = capa 2 |
| A3 | Seleccionar capa 1; dibujar | Trazos distintos por capa; z-order correcto |
| A4 | Ocultar capa 2 | `layerVisible`; viewport sin trazos capa 2; compositor `visibleLayers` |
| A5 | Opacidad 50% capa 1 | `layerOpacity`; render atenuado |
| A6 | Bloquear capa activa; intentar dibujar | `layerLock`; toast; sin `drawStroke` |
| A7 | Reordenar capas | `layerReorder`; stacking visual cambia |
| A8 | Renombrar capa | `layerRename` |
| A9 | Editar capa sin guardar; salir edición | Diálogo sucio MAP-005b |
| A10 | Guardar manual | `saveDrawing` con `activeLayerId`, `layerCount` ≥ 2 |
| A11 | Reload app; reabrir edición | Borrador restaura capas + `activeLayerId` si sucio |
| A12 | Eliminar capa vacía / con trazos | `layerDelete`; confirm si trazos; ≥ 1 capa siempre |

**Archivos:** `action-session-*.ndjson`, `action-verbose-*.ndjson`, `ui-session-*.ndjson`.

**Fuera de alcance QA:** timeline T, secundarios, hotspots, undo de reorder capa.

### 9.1 Resultados QA (2026-06-11)

**Sesiones OBS:** `1781849729654-28232` (recorrido principal) · `1781849859879-28232` (delete/create) · `1781850121442-8924` (verificación post-fix D13 resaltado activo)

**Mapa:** `map_d99c452cdeefe916` · **Evidencia:** `action-session-*.ndjson`, `action-verbose-*.ndjson`, `ui-session-*.ndjson`

| Criterio | Resultado | Evidencia log |
|----------|-----------|---------------|
| C1 Panel derecha en edición | ✅ | `setViewMode` edit + eventos `layer.*` |
| C2 Añadir capas | ✅ | `layerCreate` (`layer-75b9f061`, `layer-f7b78a42`, …) |
| C3 Selección + `drawStroke.layerId` | ✅ | `layerSelect` + trazos en `layer-75b9f061` / `layer-1` / `layer-f7b78a42` |
| C4 Toggle visible | ✅ | `layerVisible` true/false ambas capas |
| C5 Opacidad | ✅ | `layerOpacity` 0→1 en ambas capas |
| C6 Bloqueo | ✅ | `layerLock` locked:true; trazos siguen en capa activa no bloqueada |
| C7 Reordenar | ✅ | `layerReorder` fromIndex/toIndex |
| C8 Renombrar | ✅ | `layerRename` nameLength 6, 9 |
| C9 Eliminar capa | ✅ | `layerDelete` (vacía y con trazos) |
| C10 Dirty MAP-005b | ✅ | `unsavedDialog` viewChange + `unsavedChoice` discard |
| C11 OBS `layer.*` | ✅ | Todos los eventos §6.1 en session log |
| C12 Resaltado capa activa (D13) | ✅ | Usuario OK visual sesión 3; `layerSelect` en `1781850121442` |

**Corrección post-QA:** resaltado capa activa (D13) — única queja del usuario en QA inicial.

**Afinado UI panel** (espaciado, densidad, drag reorder) — diferido a iteración futura de interfaz.

---

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| `activeLayerId` desincronizado tras mutación | Reasignación automática D3 |
| Edits capa no sucios (baseline viejo) | D7 fingerprint — test regresión MAP-005b |
| Panel apretado en ventanas estrechas | Panel colapsable v2; v1 min-width razonable |
| Reorder + borrador stale | Fingerprint incluye orden |
| Eraser borra capas inferiores | Documentar §1.4; QA consciente |
| Delete capa sin undo | Confirm D6; usuario guarda antes si duda |
| Strict Mode doble emit | Igual MAP-004/005 — documentar en QA |

---

## 11. Handoff → MAP-007

MAP-007 tomará:

- Estudio con **stack de capas internas** operativo en `principal.json`.
- Compositor viewport ya compone multi-capa — base para dibujo principal + metadato «Desde».
- Panel capas reutilizable cuando existan secundarios (MAP-008+) en el mismo esquema `layers[]`.

MAP-006 debe dejar **`layers[]` como fuente de verdad** del arte vectorial — MAP-007 no introduce segundo modelo de capas.

---

## 12. Registro

| Fecha | Evento |
|-------|--------|
| 2026-06-11 | Plan MAP-006 redactado (auditoría post MAP-005 ✅ + MAP-005b ✅) |
| 2026-06-11 | **Fases 1–8 implementadas** — mutators, session, baseline/draft, panel UI, toast locked, Rust validate, OBS, tests 276 + cargo 24 |
| 2026-06-11 | **QA usuario** — sesiones `1781849729654-28232` + `1781849859879-28232`; criterios §9 C1–C11 ✅ |
| 2026-06-11 | **Fix D13** — resaltado capa activa en panel (`ring-primary`, etiqueta «Activa»); verificado sesión `1781850121442-8924` |
| 2026-06-11 | **§12 cerrado** — MAP-006 ✅ → handoff MAP-007 |
