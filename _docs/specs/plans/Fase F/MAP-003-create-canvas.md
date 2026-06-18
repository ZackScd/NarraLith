# MAP-003 — Crear mapa y lienzo (tamaño libre, import, expandir/recortar)

> **Estado:** 📋 **Planificado** (2026-06-11) · **Sin implementación**  
> **Esfuerzo:** Medio–alto · **Riesgo:** Medio  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md) Fase F · **Spec:** [`maps-design.md`](../../maps-design.md) §3 · **Previo:** [MAP-002 ✅](MAP-002-multi-world.md) · **Siguiente:** MAP-004

---

## 0. Convención

| Regla | Detalle |
|-------|---------|
| Flujo | Plan → ejecución → tests → QA/OBS → cerrar §11 → MAP-004 |
| Commits | Usuario |
| Evidencia | Recorrido OBS §9 (post-implementación) |
| OBS previo a planificar | **No requerido** — ver §2.4 |

---

## 1. Problema y objetivo

### 1.1 Problema (post MAP-002)

MAP-002 entrega navegación multi-mapa, pero la **creación** sigue siendo un atajo rígido en el header:

| Carencia | Impacto |
|----------|---------|
| Input + botón crea siempre **2400×1600** | Spec §3.2 «tamaño libre» incumplido |
| Sin diálogo de creación | Sin presets, sin relación de aspecto, sin import |
| Sin importar imagen al crear | Spec §3.2 «lienzo vacío **e** importar imagen» |
| Sin expandir/recortar lienzo | `map.json` y `principal.json` tienen `width`/`height` fijos tras crear |
| Header saturado | Nombre + crear compite con selector/preferencia/pin (MAP-002) |

### 1.2 Objetivo MAP-003

Entregar el **flujo completo de lienzo** a nivel documento (sin canvas ni estudio — eso es MAP-004+):

1. **Diálogo «Nuevo mapa»** sustituye el input inline del header.
2. **Tamaño libre** + presets + **relación de aspecto** opcional con autoajuste.
3. **Modo importar imagen** al crear (copia a `assets/`, dimensiones desde la imagen).
4. **Expandir** y **recortar** lienzo existente (API Rust + diálogo mínimo en UI placeholder).
5. Sincronizar siempre `map.json` ↔ `drawings/principal.json` en dimensiones.

### 1.3 Criterios de aceptación

| # | Criterio |
|---|----------|
| C1 | Botón «Nuevo mapa» abre diálogo; **no** queda input de nombre en header |
| C2 | Usuario define ancho/alto (512–8192) o elige preset |
| C3 | Relación de aspecto opcional: al cambiar un lado, el otro se recalcula |
| C4 | Modo **lienzo vacío** → árbol MAP-001 igual que hoy |
| C5 | Modo **importar imagen** → archivo en `{mapId}/assets/`, dimensiones = tamaño nativo (clamp/rechazo si fuera de rango) |
| C6 | Tras crear → mapa activo + `record_map_viewed` + sesión actualizada (MAP-002) |
| C7 | **Expandir**: aumenta `width`/`height` sin mover trazos existentes |
| C8 | **Recortar**: reduce lienzo; trazos fuera del nuevo rectángulo se **eliminan** (con confirmación) |
| C9 | `save_map_document` / expand / crop actualizan `updatedAt` en índice |
| C10 | OBS: `obs.action.map.create`, `expandCanvas`, `cropCanvas` |
| C11 | Tests Rust: crear custom, import, expand, crop |

### 1.4 Fuera de alcance MAP-003

| Tema | Plan |
|------|------|
| Canvas, compositor, estudio dibujo | MAP-004 / MAP-005 |
| Etiqueta «Desde», terreno raster en vista | MAP-007 |
| Renombrar / eliminar mapa | MAP-003+ o diálogo gestión posterior |
| Vista previa visual del lienzo al expandir/recortar | MAP-004+ (diálogo numérico basta en MAP-003) |
| Migración maps v1 | No (MAP-000) |
| Carpeta legacy `Imagenes/Mapas_y_Geografia` | No — assets bajo `{mapId}/assets/` |
| Cambio de proyecto en caliente | Fuera QA (igual que MAP-002) |

---

## 2. Auditoría post MAP-002 (jun 2026)

### 2.1 Rust — lo que ya existe

| Pieza | Estado |
|-------|--------|
| `create_blank_map(name, w, h)` | ✅ árbol completo §4.1 MAP-001 |
| `validate_dimensions` 512–8192 | ✅ |
| `read_project_image_data_url` | ✅ data URL desde ruta **relativa al proyecto** |
| Crate `image` 0.25 (png/jpeg/webp) | ✅ en `Cargo.toml` — **sin uso** en maps_store aún |
| `create_map_from_image` | ❌ |
| `expand_map_canvas` / `crop_map_canvas` | ❌ |
| Campo imagen en `map.json` | ❌ — solo `desde: null` reservado MAP-007 |
| IPC `create_blank_map_cmd` | ✅ — contrato fijo `(name, width, height)` |

**Archivos:** `src-tauri/src/fs/maps_store.rs`, `src-tauri/src/commands/maps.rs`

### 2.2 Frontend — lo que ya existe

| Pieza | Estado |
|-------|--------|
| `MapWorkspace` header | Input nombre + botón → `createBlankMap(2400, 1600)` |
| `useMapProject.createBlankMap` | ✅ IPC + `setActiveMap` + `select` audit |
| `MAP_CREATE_DEFAULT_*` | ✅ `lib/types/maps.ts` |
| Diálogo crear mapa | ❌ |
| File picker Tauri | ✅ patrón en `CreateProjectDialog`, `useProjectStore.openProject` |
| Componentes UI | `Dialog`, `Input`, `Label`, `Button` — **sin** `Select` Shadcn (usar `<select>` nativo como MAP-002) |
| i18n `maps.json` | Claves create/expand/crop **ausentes** |
| OBS `map.create` | ❌ (gap anotado MAP-001 §8.3) |

### 2.3 Spec §3 — pendientes cerrados en este plan

| Pendiente spec | Decisión MAP-003 |
|----------------|------------------|
| Import: ¿imagen define tamaño o escala? | **Dimensiones nativas** de la imagen (clamp si >8192 proporcional; error si <512 tras clamp) |
| Expand: ¿qué bordes? | **Solo derecha y abajo** — origen (0,0) fijo; contenido no se escala |
| Crop: ¿contenido fuera? | **Eliminar** puntos de trazo fuera del nuevo rectángulo; diálogo confirma |
| Unidades | **Píxeles lógicos** (enteros) — coherente con MAP-001 |

### 2.4 ¿Recorrido OBS previo para planificar?

**No hace falta** antes de implementar MAP-003.

| Motivo | Detalle |
|--------|---------|
| Flujo actual documentado | Header inline + `create_blank_map_cmd` — auditable en código |
| No hay diálogo ni import | No existe UX que instrumentar de antemano |
| MAP-002 ya validó sesión mapas | Selector, pin y `resolveInitial` no son dependencia de creación |
| OBS útil **después** | Recorrido §9 confirma `create` / `expand` / `crop` una vez implementado |

Si quieres baseline opcional (1 min): crear un mapa con el flujo actual y adjuntar action log — solo sirve para comparar «antes/después», no bloquea el plan.

---

## 3. Decisiones de diseño (cerradas para implementación)

### D1 — Sustituir header inline por diálogo

| Antes (MAP-002) | Después (MAP-003) |
|-----------------|-------------------|
| `Input` nombre + botón en header | Solo botón **«Nuevo mapa»** → abre `CreateMapDialog` |
| Empty state con mismo input | Empty state: CTA abre diálogo |

El diálogo incluye: nombre, modo (vacío / import), dimensiones, presets, aspect ratio.

### D2 — Presets de tamaño (atajos, no exclusivos)

| Id | Ancho × Alto | Notas |
|----|--------------|-------|
| `default` | 2400 × 1600 | Actual MAP-001/002 |
| `hd` | 1920 × 1080 | 16:9 |
| `square` | 2048 × 2048 | 1:1 |
| `a4ish` | 2480 × 3508 | Vertical (aprox.) |
| `custom` | Campos libres | Default del diálogo |

Al elegir preset → rellena W/H; si aspect ratio bloqueado, recalcula el otro lado.

### D3 — Relación de aspecto

```text
aspectMode ∈ { none, 16:9, 4:3, 1:1, custom }

Si aspectMode != none:
  al editar width  → height = round(width / ratio)
  al editar height → width  = round(height * ratio)

custom: ratio = customWidth / customHeight (enteros > 0)
```

Solo UI — Rust valida rango final 512–8192 en ambos ejes.

### D4 — Crear desde imagen

```text
1. Usuario elige archivo (Tauri open, filtros png/jpeg/webp)
2. Rust recibe path absoluto temporal O bytes vía IPC
3. Leer dimensiones con crate `image`
4. Si w/h fuera de [512, 8192]:
     - si ambos > MAX → escalar proporcionalmente hasta caber en MAX
     - si alguno < MIN tras escalar → error.maps.image_dimensions_invalid
5. Copiar archivo a {mapId}/assets/base.{ext} (o hash si colisión)
6. map.json: añadir campo opcional baseImageRel (string relativo dentro del mapa)
7. Mismo árbol que blank; principal.json vacío (capa 1, 0 trazos)
8. La imagen NO se rasteriza en trazos — referencia para MAP-007/compositor
```

**Campo nuevo en `map.json`:**

```typescript
interface MapDocumentV1 {
  // …existente…
  /** Ruta relativa al directorio del mapa, ej. "assets/base.png" */
  baseImageRel?: string | null;
}
```

`desde` sigue reservado para etiqueta narrativa (MAP-007).

### D5 — Expandir lienzo

```text
expand_map_canvas(mapId, addRight, addBottom):
  newWidth  = doc.width  + addRight   (addRight  >= 0)
  newHeight = doc.height + addBottom  (addBottom >= 0)
  validar newWidth/newHeight ∈ [512, 8192]
  doc.width/height ← nuevos
  drawing.width/height ← nuevos
  trazos: sin cambios de coordenadas
  updatedAt ← now; index entry bump
```

UI v1: diálogo «Expandir lienzo» — campos «Añadir ancho» / «Añadir alto» (px), muestra tamaño resultante.

### D6 — Recortar lienzo

```text
crop_map_canvas(mapId, newWidth, newHeight):
  newWidth/newHeight < actuales, ∈ [512, 8192]
  Para cada trazo: filtrar points donde 0 <= x < newWidth && 0 <= y < newHeight
  Si trazo queda con < 2 puntos → eliminar trazo
  doc y drawing ← nuevas dimensiones
  updatedAt + index
```

UI v1: diálogo con confirmación destructiva («Se eliminarán trazos fuera del área»).

### D7 — IPC: unificar creación

| Comando | Args | Returns |
|---------|------|---------|
| `create_map_cmd` | `name`, `mode: "blank" \| "import"`, `width?`, `height?`, `sourcePath?` | `MapSummaryV2` |
| `expand_map_canvas_cmd` | `mapId`, `addRight`, `addBottom` | `MapDocumentV1` |
| `crop_map_canvas_cmd` | `mapId`, `newWidth`, `newHeight` | `MapDocumentV1` |

**Deprecar en frontend** la llamada directa a `create_blank_map_cmd` (mantener comando Rust interno o alias — no romper tests MAP-001).

`create_map_cmd` en modo `blank` delega en `create_blank_map`; en modo `import` usa `create_map_from_image`.

### D8 — Integración MAP-002

Tras `create_map_cmd` exitoso:

```text
setActiveMap(id)
record_map_viewed (ya en create_blank_map — replicar en import)
loadSession()
trackAction map.create { mode, width, height, baseImageRel? }
trackAction map.select { mapId, fromMapId }
```

---

## 4. Esquema e IPC

### 4.1 `map.json` (v1, ampliado)

```typescript
interface MapDocumentV1 {
  version: 1;
  id: string;
  name: string;
  width: number;
  height: number;
  desde: string | null;
  baseImageRel?: string | null;  // MAP-003
  createdAt: string;
  updatedAt: string;
}
```

Proyectos existentes sin campo → `baseImageRel` ausente = lienzo vacío.

### 4.2 Tipos TS auxiliares

```typescript
type MapCreateMode = "blank" | "import";

type MapAspectPreset = "none" | "16:9" | "4:3" | "1:1" | "custom";

interface MapCreateDraft {
  name: string;
  mode: MapCreateMode;
  width: number;
  height: number;
  aspectPreset: MapAspectPreset;
  customAspectW?: number;
  customAspectH?: number;
  importPath?: string | null;
}
```

### 4.3 Rust — funciones nuevas

| Función | Rol |
|---------|-----|
| `create_map_from_image` | Import + assets + árbol |
| `expand_map_canvas` | §D5 |
| `crop_map_canvas` | §D6 |
| `copy_import_to_map_assets` | Privada — valida mime/tamaño 50 MB |

### 4.4 Tests Rust (mínimo)

| Test | Escenario |
|------|-----------|
| `create_custom_dimensions` | 1200×800 persiste en map + drawing |
| `create_import_sets_base_image` | PNG → `baseImageRel` + dimensiones |
| `import_rejects_tiny_image` | 100×100 → error |
| `import_scales_oversized` | >8192 → escala proporcional |
| `expand_adds_space` | +100 right → trazo en (10,10) sigue en (10,10) |
| `expand_rejects_over_max` | Excede 8192 |
| `crop_clips_strokes` | Trazo fuera → eliminado |
| `crop_updates_dimensions` | map + drawing sincronizados |

---

## 5. Frontend — diseño

### 5.1 Componentes

| Archivo | Cambio |
|---------|--------|
| `CreateMapDialog.tsx` | **Nuevo** — formulario completo §D1–D3 |
| `MapCanvasSizeDialog.tsx` | **Nuevo** — expand + crop (tabs o modo prop) |
| `MapWorkspace.tsx` | Quitar input nombre; botón abre diálogo; acciones «Expandir»/«Recortar» en panel detalle |
| `useMapProject.ts` | `createMap(draft)`, `expandCanvas`, `cropCanvas` |
| `lib/types/maps.ts` | `baseImageRel`, tipos create |
| `i18n/{es,en}/maps.json` | `create.*`, `canvas.*`, errores nuevos |
| `action-audit/events.ts` | `create`, `expandCanvas`, `cropCanvas` |

### 5.2 Flujo crear mapa

```text
Usuario → «Nuevo mapa»
    │
    ▼
CreateMapDialog
    ├─ modo blank → create_map_cmd { mode: blank, width, height }
    └─ modo import → open() file → create_map_cmd { mode: import, sourcePath }
    │
    ▼
MAP-002 hook: activar + sesión + OBS
```

### 5.3 Panel detalle (placeholder MAP-003)

Mientras no hay canvas (MAP-004), el panel existente añade:

| Elemento | Acción |
|----------|--------|
| Tamaño actual | `{width} × {height}` (ya existe) |
| Botón «Expandir lienzo…» | Abre `MapCanvasSizeDialog` mode=expand |
| Botón «Recortar lienzo…» | Abre mode=crop + confirmación |
| `baseImageRel` | Mostrar ruta si import (solo informativo) |

---

## 6. OBS — eventos nuevos

| Evento | Cuándo | Payload |
|--------|--------|---------|
| `obs.action.map.create` | Tras crear OK | `{ mode, width, height, mapId, baseImageRel? }` |
| `obs.action.map.expandCanvas` | Tras expand OK | `{ mapId, addRight, addBottom, newWidth, newHeight }` |
| `obs.action.map.cropCanvas` | Tras crop OK | `{ mapId, newWidth, newHeight, strokesRemoved? }` |

---

## 7. Recorrido OBS para QA (usuario, post-implementación)

**Prerrequisitos:** OBS activo; proyecto con ≥1 mapa existente.

| Paso | Acción | Qué buscar |
|------|--------|------------|
| 1 | Mapas → «Nuevo mapa» | Diálogo abre; header **sin** input nombre |
| 2 | Blank 1600×900, nombre único | `map.create` mode blank; mapa activo |
| 3 | Import PNG conocido (ej. 800×600) | `map.create` mode import; `baseImageRel`; dimensiones en panel |
| 4 | Inspeccionar disco | `{mapId}/assets/` con archivo; `map.json` coherente |
| 5 | Expandir +200 px ancho | `expandCanvas`; panel muestra nuevo tamaño |
| 6 | Recortar (confirmar) | `cropCanvas`; dimensiones menores |
| 7 | Salir y reentrar Mapas | MAP-002: mapa importado sigue en lista con tamaño correcto |

**Fuera de alcance QA:** cambio de proyecto; preview visual del recorte.

**Archivos:** `_debug/logs/session-*.ndjson`, `action-session-*.ndjson`.

---

## 8. Verificación automatizada

| Comando | Esperado |
|---------|----------|
| `cargo test maps_store` | +8 tests §4.4 |
| `npm test` | Sin regresión |
| `npm run build` | OK |

---

## 9. Fases de ejecución

```text
Fase 1  Rust: baseImageRel + create_map_from_image + expand + crop + tests
Fase 2  IPC create_map_cmd, expand_map_canvas_cmd, crop_map_canvas_cmd + lib.rs
Fase 3  TS tipos + useMapProject
Fase 4  CreateMapDialog + MapWorkspace refactor header + MapCanvasSizeDialog
Fase 5  i18n + OBS
Fase 6  QA manual §7
```

---

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Import path absoluto vs sandbox Tauri | Usar `open()` plugin + pasar path al comando; copiar en Rust |
| Imagen enorme en memoria | Límite 50 MB ya existente; leer dimensiones sin decodificar full raster si posible (`image::image_dimensions`) |
| Crop destructivo sorprende al usuario | Diálogo confirmación + copy i18n claro |
| Expand/crop sin preview confunde | Texto explícito «solo añade espacio vacío» / «elimina trazos fuera» |
| Scope creep (renombrar mapa) | Fuera §1.4 |
| Desync map.json vs principal.json | Una función Rust `set_map_dimensions` compartida por expand/crop/create |

---

## 11. Handoff → MAP-004

MAP-004 tomará modos interactivo/edición. MAP-003 debe dejar:

- Dimensiones de lienzo **correctas y editables** en disco.
- `baseImageRel` listo para que MAP-007/compositor **muestre** la imagen importada.
- Panel detalle con acciones de tamaño (pueden migrarse a menú del estudio en MAP-005).

---

## 12. Registro

| Fecha | Evento |
|-------|--------|
| 2026-06-11 | Plan MAP-003 redactado (auditoría post MAP-002 ✅) |
