# MAP-004 — Modos vista: interactivo (default) y edición ✏️

> **Estado:** 📋 **Planificado** (2026-06-11) · **Sin implementación**  
> **Esfuerzo:** Medio–alto · **Riesgo:** Medio  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md) Fase F · **Spec:** [`maps-design.md`](../../maps-design.md) §8 · **Previo:** [MAP-003 ✅](MAP-003-create-canvas.md) · **Siguiente:** MAP-005

---

## 0. Convención

| Regla | Detalle |
|-------|---------|
| Flujo | Plan → ejecución → tests → QA/OBS → cerrar §12 → MAP-005 |
| Commits | Usuario |
| Evidencia | Recorrido OBS §10 (post-implementación) |
| OBS previo a planificar | **No requerido** — ver §2.4 |

---

## 1. Problema y objetivo

### 1.1 Problema (post MAP-003)

MAP-003 entrega creación/gestión del lienzo, pero la UI sigue siendo un **panel de metadatos** (ID, capas, trazos, expand/crop) sin vista de mapa real:

| Carencia | Impacto |
|----------|---------|
| No hay **modo interactivo** vs **modo edición** | Spec §8 incumplido |
| Sin viewport / canvas | `obs.ui.maps.compositor` sigue `stub: true` |
| `baseImageRel` en disco pero **no se muestra** | Import MAP-003 invisible al usuario |
| Trazos vectoriales no se **visualizan** | Imposible validar persistencia visualmente |
| Expand/crop en panel texto | UX provisional; debe convivir con viewport |
| `useMapStore` solo `activeMapId` | Falta estado de modo vista |

### 1.2 Objetivo MAP-004

Establecer la **arquitectura de dos modos** en una sola pantalla (sin rutas separadas):

1. **Interactivo por defecto** al entrar al módulo o cambiar de mapa.
2. Entrar a **edición ✏️** solo con botón explícito; salir con «Ver mapa interactivo».
3. **Viewport compartido** (canvas 2D): imagen base + trazos en solo lectura + rejilla en blank.
4. **Pan/zoom** básicos en ambos modos (navegación del lienzo).
5. Compositor OBS **mínimo real** (`visibleLayers`, `stub: false` en viewport renderizado).
6. Shell del **estudio** en modo edición (toolbar placeholder) — herramientas de dibujo en **MAP-005**.

### 1.3 Criterios de aceptación

| # | Criterio |
|---|----------|
| C1 | Al entrar a Mapas → `viewMode === "interactive"` |
| C2 | Botón ✏️ → `viewMode === "edit"`; botón salir → `"interactive"` |
| C3 | Cambiar mapa activo → reset a `"interactive"` |
| C4 | Cambiar proyecto → `useMapStore.reset()` incluye `viewMode` |
| C5 | Viewport muestra dimensiones correctas del lienzo (`document.width/height`) |
| C6 | Si `baseImageRel` → imagen visible en viewport |
| C7 | Trazos de `principal.json` renderizados (solo lectura) en ambos modos |
| C8 | Modo interactivo: **sin** captura de trazos nuevos (pointer no dibuja) |
| C9 | Modo edición: toolbar visible; **sin** persistencia de trazos nuevos (MAP-005) |
| C10 | Pan/zoom operativos; OBS `viewport` emite `zoom`/`pan` reales |
| C11 | OBS: `obs.action.map.setViewMode`; compositor con `visibleLayers` y `stub: false` |
| C12 | Panel metadatos MAP-003 sustituido o relegado — área principal = viewport |

### 1.4 Fuera de alcance MAP-004

| Tema | Plan |
|------|------|
| Pinceles, goma, color custom, presión, autosave trazos | **MAP-005** |
| Capas internas UI (mostrar/ocultar, reordenar) | **MAP-006** |
| Etiqueta «Desde», terreno narrativo | **MAP-007** |
| Timeline scrubber **T**, secundarios temporales | **MAP-008 / MAP-009** |
| Hotspots clic → navegación hijo | **MAP-010** |
| Marcas X manuscrito | **MAP-011** |
| Leaflet / Excalidraw | No (MAP-000) |
| Panel lateral derecho mapas (filtros) | Futuro — hoy no hay panel en `WorkspaceShell` |
| Cambio de proyecto en caliente (QA) | Fuera (igual MAP-002/003) |

---

## 2. Auditoría post MAP-003 (jun 2026)

### 2.1 Rust / IPC — lo que ya existe

| Pieza | Estado |
|-------|--------|
| `get_map_document_cmd` / `get_map_drawing_cmd` | ✅ datos para render |
| `baseImageRel` en `map.json` | ✅ MAP-003 |
| `read_project_image_cmd(relativePath)` | ✅ data URL — usable con ruta `.narralith/maps/{id}/{baseImageRel}` |
| `read_map_asset_cmd` dedicado | ❌ opcional MAP-004 (validación assets/) |
| Comandos compositor / timeline T | ❌ MAP-009 |

**Archivos:** `maps_store.rs`, `commands/maps.rs` — **sin cambios obligatorios** en MAP-004.

### 2.2 Frontend — lo que ya existe

| Pieza | Estado |
|-------|--------|
| `MapWorkspace` | Header MAP-002/003 + panel `<dl>` metadatos + expand/crop |
| `useMapStore` | `activeMapId`, `reset()` |
| `useMapProject` | document + drawing cargados por mapa activo |
| `useMapsRenderAudit.stub` | viewport `stub:false` al cambiar mapId; compositor `stub:true` |
| Canvas HTML en módulo mapas | ❌ |
| Modo vista | ❌ |
| Side panel mapas en shell | ❌ (solo hook audit `panel:"map"`) |
| Legacy purgado | `MapLeafletCanvas`, `MapDrawToolbar`, `MapDrawStudio` — referencia UX en archive |

### 2.3 Spec §8 — pendientes cerrados en este plan

| Pendiente spec | Decisión MAP-004 |
|----------------|------------------|
| Compositor con timeline T | Stub `timeT: null`; capas visibles desde `drawing.layers` |
| Scrubber en interactivo | Placeholder barra deshabilitada «Timeline MAP-009» |
| Hotspots clic vs edición | Ninguna interacción hotspot — MAP-010 |
| Barra T solo lectura en edición | Omitir en v1 — MAP-009 |
| Zoom/pan estudio | Pan/zoom **viewport** compartido; MAP-005 añade zoom herramienta dibujo si difiere |

### 2.4 ¿Recorrido OBS previo para planificar?

**No hace falta** antes de implementar.

| Motivo | Detalle |
|--------|---------|
| Estado actual = panel metadatos | Auditable en código; no hay modos que instrumentar |
| MAP-003 QA reciente | Viewport/compositor aún stub parcial |
| OBS útil **después** | Validar `setViewMode`, zoom/pan, compositor real |

Baseline opcional (1 min): entrar a Mapas con mapa importado — confirma que hoy **no** se ve la imagen (motivación MAP-004).

---

## 3. Decisiones de diseño (cerradas para implementación)

### D1 — Estado de modo vista

```typescript
type MapViewMode = "interactive" | "edit";

interface MapStoreV2 {
  activeMapId: string | null;
  viewMode: MapViewMode;           // default "interactive"
  setActiveMap(mapId: string | null): void;
  setViewMode(mode: MapViewMode): void;
  reset(): void;
}
```

| Evento | viewMode |
|--------|----------|
| Entrar módulo Mapas | `interactive` |
| Cambiar mapa (selector) | `interactive` |
| Usuario pulsa ✏️ | `edit` |
| Usuario pulsa «Ver mapa interactivo» | `interactive` |
| `reset()` (cambio proyecto) | `interactive` + `activeMapId: null` |

Persistencia: **solo RAM** (sesión UI). No `localStorage` ni `index.json`.

### D2 — Layout MapWorkspace (v1)

```text
┌─────────────────────────────────────────────────────────┐
│ Header: título · Nuevo mapa · selector · pref · pin     │
│         · [✏️ Editar]  o  [Ver mapa interactivo]        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  MapViewport (flex-1, min-h-0)                          │
│    canvas 2D + overlays pan/zoom                        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ Edit mode only: MapEditToolbar (placeholder MAP-005)    │
│   + Expandir/Recortar lienzo (movidos desde panel dl)   │
└─────────────────────────────────────────────────────────┘
```

Eliminar panel `<dl>` metadatos como área principal. Info mínima (nombre mapa) puede quedar en header o tooltip.

### D3 — Viewport compartido (`MapViewport`)

Motor: **Canvas 2D** nativo (sin Leaflet; MAP-000).

Capas de render (orden):

1. Fondo: rejilla sutil si lienzo blank; color sólido `#fafafa` / dark equivalente.
2. Imagen base: si `document.baseImageRel` → cargar vía `read_project_image_cmd` con ruta:
   `.narralith/maps/{mapId}/{baseImageRel}` (normalizar separadores).
3. Trazos: polilíneas desde `drawing.layers` visibles, opacidad por capa.

**Modo interactivo:** canvas `pointer-events` para pan/zoom solo; **no** añade trazos.

**Modo edición:** misma vista + toolbar; pointer en canvas reservado para MAP-005 (v1: cursor crosshair sin efecto).

Pan/zoom:

- Rueda → zoom hacia cursor; rango **0.25–2.0**.
- Arrastre botón central / Space+drag / botón izquierdo en fondo → pan.
- Estado `viewport: { zoom, panX, panY }` en store o hook local; reset al cambiar mapa.

Re-render on: `document`, `drawing`, `baseImageUrl`, resize observer.

### D4 — Carga imagen base

**v1:** reutilizar `read_project_image_cmd` con path construido en TS:

```typescript
function mapAssetProjectPath(mapId: string, baseImageRel: string): string {
  return `.narralith/maps/${mapId}/${baseImageRel.replace(/\\/g, "/")}`;
}
```

**Opcional MAP-004+:** `read_map_asset_cmd(mapId, assetRel)` en Rust con validación `assets/` — mayor seguridad; no bloqueante si validación TS + IPC existente basta.

### D5 — Compositor OBS (mínimo real)

Al renderizar viewport:

```typescript
renderAudit.ui(UI_EVENTS.maps.compositor, {
  stub: false,
  mapId,
  timeT: null,
  visibleLayers: drawing.layers
    .filter((l) => l.visible)
    .map((l) => l.id),
});
```

Emitir también al cambiar `viewMode` y al cambiar capas visibles (MAP-006 ampliará).

Viewport audit:

```typescript
renderAudit.ui(UI_EVENTS.maps.viewport, {
  stub: false,
  mapId,
  zoom,
  pan: { x: panX, y: panY },
  viewMode, // extensión payload acordada §6
});
```

### D6 — Modo edición shell (`MapEditView`)

Contenido v1:

| Elemento | Comportamiento |
|----------|----------------|
| Toolbar superior | Mensaje «Herramientas de dibujo — MAP-005» + botones Expandir/Recortar (de MAP-003) |
| Viewport | Igual que interactivo |
| Sin persistencia | Clic/drag no llama `save_map_drawing_cmd` |

MAP-005 sustituye placeholder por paleta/pinceles reales **sin cambiar** contrato `viewMode`.

### D7 — Integración MAP-002 / MAP-003

| Flujo | Comportamiento |
|-------|----------------|
| Selector mapa | `selectMap` → reset `viewMode` interactive |
| Crear mapa | Tras create → interactive + viewport muestra nuevo lienzo |
| Expand/crop | Solo accesible en **modo edición** (toolbar); tras operación refresh viewport |

### D8 — IPC Rust

**Sin cambios requeridos** para criterios MAP-004.

Opcional: `read_map_asset_cmd` — implementar solo si review de seguridad lo pide.

### D9 — Tests

| Ámbito | Test |
|--------|------|
| TS unit | `mapAssetProjectPath`, stroke path builder |
| TS unit | store: reset viewMode, select map resets mode |
| Rust | Ninguno obligatorio |
| Manual/OBS | §10 |

---

## 4. Esquema e IPC

### 4.1 Tipos TS nuevos

```typescript
type MapViewMode = "interactive" | "edit";

interface MapViewportState {
  zoom: number;
  panX: number;
  panY: number;
}
```

### 4.2 Sin cambios de esquema disco

`map.json` / `principal.json` sin modificación.

---

## 5. Frontend — diseño de componentes

### 5.1 Archivos

| Archivo | Rol |
|---------|-----|
| `stores/useMapStore.ts` | + `viewMode`, `setViewMode` |
| `lib/maps/mapAssetPath.ts` | Ruta proyecto para assets |
| `lib/maps/mapStrokeRender.ts` | Trazos → paths canvas |
| `lib/maps/useMapViewport.ts` | Pan/zoom + resize + redraw |
| `modules/maps/MapViewport.tsx` | Canvas + imagen + trazos |
| `modules/maps/MapEditToolbar.tsx` | Toolbar placeholder + expand/crop |
| `modules/maps/MapWorkspace.tsx` | Layout modos + toggle header |
| `hooks/useMapProject.ts` | Tras select/create → `setViewMode("interactive")` |
| `lib/render-audit/hooks/useMapsRenderAudit.stub.ts` | Ampliar emisiones zoom/pan/mode |
| `lib/action-audit/events.ts` | `setViewMode` |
| `i18n/{es,en}/maps.json` | `viewMode.*`, toolbar, timeline placeholder |

### 5.2 Flujo modo vista

```text
MapWorkspace mount / selectMap / createMap
    │
    ▼
viewMode = interactive
    │
    ▼
MapViewport render (document + drawing + image)
    │
    ├─ Usuario ✏️ → setViewMode("edit") → MapEditToolbar visible
    └─ Usuario «Ver mapa interactivo» → setViewMode("interactive")
```

### 5.3 Toggle en header

```text
viewMode === "interactive"
  → Button variant outline + Pencil icon «Editar mapa»

viewMode === "edit"
  → Button variant default + Eye/Map icon «Ver mapa interactivo»
```

---

## 6. OBS — eventos

### 6.1 Acción (nuevo)

| Evento | Cuándo | Payload |
|--------|--------|---------|
| `obs.action.map.setViewMode` | Toggle o reset automático | `{ mapId, mode, fromMode? }` |

### 6.2 UI (ampliar existentes)

| Evento | Cambio MAP-004 |
|--------|----------------|
| `obs.ui.maps.viewport` | + `viewMode`; `zoom`/`pan` reales; emitir en pan/zoom/mode |
| `obs.ui.maps.compositor` | `stub: false`; `visibleLayers[]` desde drawing |

---

## 7. Fases de ejecución

```text
Fase 1  useMapStore viewMode + integración select/create/reset
Fase 2  mapAssetPath + carga imagen + MapViewport (grid + image + strokes)
Fase 3  Pan/zoom + useMapViewport hook
Fase 4  MapWorkspace layout + toggle header + MapEditToolbar (placeholder + expand/crop)
Fase 5  OBS action + render audit ampliado + i18n
Fase 6  Tests unit TS + QA manual §10
```

---

## 8. Verificación automatizada

| Comando | Esperado |
|---------|----------|
| `cargo test maps_store` | Sin regresión (21 tests) |
| `npm test` | + tests unit viewport/store |
| `npm run build` | OK |

---

## 9. Recorrido OBS para QA (usuario, post-implementación)

**Prerrequisitos:** OBS activo; mapa con **import** (`baseImageRel`) y mapa blank; opcional mapa con trazos (añadir manualmente en JSON o esperar MAP-005).

| Paso | Acción | Qué buscar |
|------|--------|------------|
| 1 | Abrir Mapas | `viewMode` implícito interactive; viewport visible (no panel dl) |
| 2 | Mapa importado | Imagen base visible en canvas |
| 3 | Pan/zoom | `obs.ui.maps.viewport` con `zoom`/`pan` ≠ null |
| 4 | Pulsar ✏️ | `setViewMode` `{ mode:"edit" }`; toolbar visible |
| 5 | Expandir lienzo | Sigue funcionando; viewport refleja nuevo tamaño |
| 6 | «Ver mapa interactivo» | `setViewMode` `{ mode:"interactive" }` |
| 7 | Cambiar mapa en selector | vuelve a interactive |
| 8 | Compositor | `obs.ui.maps.compositor` `stub:false`, `visibleLayers` coherente |

**Fuera de alcance QA:** dibujar trazos, timeline T, hotspots, cambio proyecto.

**Archivos:** `action-session-*.ndjson`, `ui-session-*.ndjson`.

---

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Canvas grande (8192²) lento | Render a resolución documento; transform CSS pan/zoom; DPR cap |
| Data URL imagen pesada | Cache en hook por `mapId+baseImageRel`; revocar al cambiar mapa |
| Confusión MAP-004 vs MAP-005 | Toolbar dice explícitamente «próximamente»; plan §1.4 |
| Panel metadatos echa de menos | Nombre en header; expand/crop en edit toolbar |
| Doble emit Strict Mode | Igual MAP-002/003 — documentar en QA |

---

## 11. Handoff → MAP-005

MAP-005 tomará:

- `viewMode === "edit"` ya operativo.
- `MapViewport` con hook pointer listo para capturar trazos.
- `save_map_drawing_cmd` / autosave conectados al gesto de dibujo.
- Sustituir placeholder toolbar por paleta Sketchbook §3bis.

MAP-004 debe dejar **un solo viewport** compartido — MAP-005 no duplica canvas.

---

## 12. Registro

| Fecha | Evento |
|-------|--------|
| 2026-06-11 | Plan MAP-004 redactado (auditoría post MAP-003 ✅) |
