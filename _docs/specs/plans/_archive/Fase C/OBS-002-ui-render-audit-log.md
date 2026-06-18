# OBS-002 — Registro de interfaz (UI render audit)

> Plan de diseño e implementación. **Estado:** ✅ Completo · **Esfuerzo:** Medio–Alto · **Riesgo:** Bajo  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md) Fase C · **Motivación:** debug visual de **toda la app**; OBS-001 no cubre layout ni dibujo.  
> **Depende de:** OBS-001 ✅ (patrones, compuertas release, `_debug/`).  
> **Alcance del módulo:** catálogo completo `obs.ui.*` preparado para todos los módulos visuales actuales y futuros (mapas, WB).

---

## 1. Problema y objetivo

### 1.1 Problema

OBS-001 registra **lógica** (IPC, FS, stores, tabs). No responde preguntas visuales:

- ¿Qué chip se dibujó dónde y con qué enlace?
- ¿Qué ve el explorador vs qué hay en disco?
- ¿Qué marco de evento está visible en el editor?
- ¿Qué panel lateral está activo y con qué filtros?

Mezclar eso en `session-*.ndjson` genera ruido. Mezclar **eventos semánticos** con **snapshots voluminosos** genera archivos ilegibles.

### 1.2 Objetivo OBS-002

1. **Módulo único reutilizable** (`render-audit`) con catálogo completo de eventos UI para NarraLith hoy y extensiones futuras.
2. **Tres opciones independientes** en el menú debug (ver §2).
3. **Dos archivos NDJSON de interfaz** (estándar vs verbose) + el archivo de sistema existente.
4. **Misma compuerta release** que OBS-001: ausente en producción.
5. **Implementación por fases**, pero el **contrato del módulo** (tipos, eventos, hooks) se define **completo desde Fase 0** para no reescribir después.

### 1.3 No es

| Expectativa incorrecta | Realidad |
|------------------------|----------|
| Screenshot / video | Solo datos estructurados |
| Log de cada re-render React | Solo en canal **verbose** y acotado; nunca en release |
| Sustituto de OBS-001 | Complemento |
| Contenido del manuscrito | Prohibido en cualquier canal |
| Tres módulos de código distintos | **Un** módulo, **tres** toggles de persistencia |

---

## 2. Tres opciones de debug (menú 🐛)

Todas solo en `tauri dev` / `__AUDIT_ENABLED__`. **Independientes entre sí** (8 combinaciones posibles; uso habitual: 1+2 o solo 2).

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  Menú Debug                                                              │
├─────────────────────┬──────────────────────┬─────────────────────────────┤
│ ① Registro del      │ ② Registro de        │ ③ Registro de interfaz      │
│    sistema          │    interfaz          │    (detallado / verbose)    │
│    OBS-001          │    OBS-002 estándar  │    OBS-002 verbose          │
├─────────────────────┼──────────────────────┼─────────────────────────────┤
│ _debug/logs/        │ _debug/render-logs/  │ _debug/render-logs/         │
│ session-{bootId}    │ ui-session-{bootId}  │ ui-verbose-{bootId}         │
├─────────────────────┼──────────────────────┼─────────────────────────────┤
│ ipc, fs, editor,    │ obs.ui.* nivel       │ Snapshots completos,        │
│ store, watcher…     │ info+ (semántico)    │ dumps, pre-debounce, trace  │
│                     │ QA visual habitual   │ Solo depuración profunda    │
└─────────────────────┴──────────────────────┴─────────────────────────────┘
                              bootId compartido en los tres archivos
```

| Toggle | Setting | Default | Archivo |
|--------|---------|---------|---------|
| ① Sistema | `enabled` | `false` | `logs/session-{bootId}.ndjson` |
| ② Interfaz | `renderLogEnabled` | `false` | `render-logs/ui-session-{bootId}.ndjson` |
| ③ Interfaz detallada | `renderVerboseEnabled` | `false` | `render-logs/ui-verbose-{bootId}.ndjson` |

**Reglas de activación:**

- ③ **no implica** ②: puede activarse solo para dumps puntuales (con coste alto).
- ② **no escribe** en archivo verbose ni viceversa.
- Borrado en menú: **tres acciones** («Borrar registro del sistema», «Borrar registro de interfaz», «Borrar registro detallado») + opcional «Borrar todo _debug/logs» en fase 2.
- Buffers en memoria: tres ring buffers independientes (2000 / 800 / 400 entradas).

**Indicador botón 🐛 (fase 2):** hasta tres puntos (verde / azul / ámbar) según toggles activos.

---

## 3. Catálogo completo de eventos UI

Convención: `obs.ui.<área>.<acción>`, `domain: "ui"`, `level: "info"` en canal estándar; `"debug"` o `"trace"` en verbose.

### 3.1 Workspace y shell

| Evento | Canal | Payload (resumen) | Cuándo |
|--------|-------|-------------------|--------|
| `obs.ui.workspace.bootstrap` | std | `mainView`, `bootId`, toggles activos | Al activar ② o ③ |
| `obs.ui.workspace.viewChange` | std | `from`, `to` | Cambio `mainView` (editor, timeline, mapas…) |
| `obs.ui.workspace.layout` | std | `width`, `height`, paneles visibles | Resize debounced (300 ms) |
| `obs.ui.workspace.layout` | **verbose** | + breakpoints, ratios split | Cada resize significativo (>8 px) |
| `obs.ui.workspace.theme` | std | `theme`, `density?` | Si afecta tokens visuales |

### 3.2 Explorador

| Evento | Canal | Payload | Cuándo |
|--------|-------|---------|--------|
| `obs.ui.explorer.selection` | std | `path`, `isDir` | `selectNode` |
| `obs.ui.explorer.viewMode` | std | `viewMode`, `layout` tree/cards | Cambio vista |
| `obs.ui.explorer.expanded` | std | `path`, `expanded` | Toggle carpeta (batch: solo último) |
| `obs.ui.explorer.visibleTree` | std | `paths[]` trunc 60, `total` | Tras loadTree / filtro búsqueda |
| `obs.ui.explorer.visibleTree` | **verbose** | `paths[]` completo hasta 500 | Mismo trigger |
| `obs.ui.explorer.dnd` | std | `intent`, `source`, `target` | Drag over / drop intent |
| `obs.ui.explorer.inlineEdit` | std | `kind` create/rename, `parentPath` | Estado inline activo |

### 3.3 Editor (manuscrito / entidad)

| Evento | Canal | Payload | Cuándo |
|--------|-------|---------|--------|
| `obs.ui.editor.activeDocument` | std | `path`, `kind`, `tabIndex` | Tab activo cambia |
| `obs.ui.editor.viewport` | std | `scrollTop`, `visibleLineRange` | Scroll debounced |
| `obs.ui.editor.viewport` | **verbose** | + `lineHeights[]` muestra, caret line | Scroll / focus |
| `obs.ui.editor.eventFrames` | std | `frames[]` `{ blockIndex, top, height, label }` trunc 20 | Layout overlay eventos |
| `obs.ui.editor.gutter` | std | `markers[]` ids/tipos | Decoraciones gutter visibles |
| `obs.ui.editor.dirtyDiff` | std | `regions[]` `{ from, to }` | FIX-013 highlights activos |
| `obs.ui.editor.focus` | std | `hasFocus`, `path` | Focus/blur editor |

### 3.4 Timeline y calendario lateral

| Evento | Canal | Payload | Cuándo |
|--------|-------|---------|--------|
| `obs.ui.timeline.layout` | std | `zoom`, `range`, `placedSummary[]` trunc 40 | Layout estable 150 ms debounce |
| `obs.ui.timeline.layout` | **verbose** | `placed[]` completo `{ id,x,y,width,lane,path,sortKey }` | Mismo trigger |
| `obs.ui.timeline.links.event` | std | `links[]` `{ fromId, toId, segmentId }` | Cambio `eventLinks` |
| `obs.ui.timeline.links.writingOrder` | std | `hoveredId`, `prevId`, `nextId`, `linksDrawn[]` | Hover / cambio vecinos |
| `obs.ui.timeline.hover` | std | `id`, `phase` enter/leave | Pointer chip file |
| `obs.ui.timeline.filters` | std | snapshot filtros + toggles conectores | Cambio filtro panel |
| `obs.ui.timeline.writingOrderIndex` | **verbose** | `pathIndex` muestra o map completo trunc | Tras recalcular índice |
| `obs.ui.timeline.writingOrderNeighbors` | **verbose** | map `id → { prevId, nextId }` trunc 80 | Tras recalcular vecinos |
| `obs.ui.calendarPanel.week` | std | `focusDate`, `weekDays[]` | Semana visible panel derecho |
| `obs.ui.calendarPanel.miniTimeline` | std | `markerCount`, `range` | Mini timeline etiquetas |

### 3.5 Paneles laterales y filtros globales

| Evento | Canal | Payload | Cuándo |
|--------|-------|---------|--------|
| `obs.ui.sidePanel.tab` | std | `panel`, `tab` | Cambio pestaña lateral |
| `obs.ui.sidePanel.dimensions` | std | `width`, `height` | Resize panel |
| `obs.ui.filters.global` | std | módulo + flags | Filtros timeline / WB compartidos |

### 3.6 Worldbuilding / entidades (vista actual)

| Evento | Canal | Payload | Cuándo |
|--------|-------|---------|--------|
| `obs.ui.entity.workspace` | std | `entityPath`, `layout` | Entidad abierta |
| `obs.ui.entity.cardGrid` | std | `cardPath`, `visibleCards` trunc | Vista tarjetas WB |

### 3.7 Mapas (Era III — hooks stub desde Fase 0)

| Evento | Canal | Payload | Cuándo |
|--------|-------|---------|--------|
| `obs.ui.maps.viewport` | std | `mapId`, `zoom`, `pan` | *(stub no-op hasta MAP)* |
| `obs.ui.maps.compositor` | std | `timeT`, `visibleLayers[]` | *(stub)* |

> Los stubs exportan la función hook vacía para que MAP-004+ solo rellenen el cuerpo sin cambiar la API.

### 3.8 Principios permanentes (ambos canales)

**Nunca registrar:** cuerpo Lexical, párrafos, contenido `+++event`, HTML, pixels de canvas mapas, argumentos IPC completos.

**Límite payload:** 2 KiB por entrada (estándar); verbose puede usar 8 KiB con truncado explícito `{ truncated: true, total: N }`.

---

## 4. Persistencia y settings

### 4.1 Archivos

| Ruta | Toggle |
|------|--------|
| `_debug/settings.json` | Campos ①②③ |
| `_debug/logs/session-{bootId}.ndjson` | ① |
| `_debug/render-logs/ui-session-{bootId}.ndjson` | ② |
| `_debug/render-logs/ui-verbose-{bootId}.ndjson` | ③ |

### 4.2 Settings ampliados

```json
{
  "enabled": false,
  "clearLogsOnNextBoot": false,
  "level": "info",
  "logIpcArgs": false,
  "logStorePatches": false,
  "maxBufferSize": 2000,

  "renderLogEnabled": false,
  "renderClearLogsOnNextBoot": false,
  "renderMaxBufferSize": 800,
  "renderLevel": "info",

  "renderVerboseEnabled": false,
  "renderVerboseClearLogsOnNextBoot": false,
  "renderVerboseMaxBufferSize": 400,
  "renderVerboseLevel": "debug"
}
```

| Campo | Default | Canal |
|-------|---------|-------|
| `renderLogEnabled` | `false` | ② estándar |
| `renderVerboseEnabled` | `false` | ③ verbose |
| `renderVerboseMaxBufferSize` | `400` | Menor — entradas más grandes |
| `renderVerboseLevel` | `debug` | Mínimo para verbose file |

Migración: `Default` en Rust rellena campos ausentes.

### 4.3 Formato NDJSON

Reutilizar struct `AuditEntry` con `domain: "ui"`. Campo opcional `channel: "standard" | "verbose"` en payload meta o duplicar en `message` para filtrado en visor.

---

## 5. Arquitectura frontend

### 5.1 Módulo único

```text
src/lib/render-audit/
  types.ts                 # settings, UiArea, event names const
  events.ts                # catálogo §3 (const + doc)
  defaults.ts
  createRenderAuditApi.ts    # dual sink: standard + verbose
  stub.ts
  instance.ts              # renderAudit
  ipc.ts
  sanitizeUiPayload.ts
  useRenderAuditBootstrap.ts
  hooks/
    useWorkspaceRenderAudit.ts
    useExplorerRenderAudit.ts
    useEditorRenderAudit.ts
    useTimelineRenderAudit.ts
    useSidePanelRenderAudit.ts
    useEntityRenderAudit.ts
    useMapsRenderAudit.stub.ts
    index.ts               # useUiRenderAudit() — registra todos en WorkspaceShell
```

### 5.2 API pública

```text
renderAudit.ui(area, event, payload, opts?)
  opts.channel: "standard" | "verbose" | "both"  // default "standard"
  opts.level: override

renderAudit.isStandardEnabled()
renderAudit.isVerboseEnabled()
```

**Early exit:** hooks comprueban `isStandardEnabled()` / `isVerboseEnabled()` antes de construir payload (coste ~0 en prod y toggles off).

**Regla:** producto importa `@/lib/render-audit` — **nunca** `audit.info("ui", …)`.

### 5.3 Montaje central

Un solo `useUiRenderAudit()` en `WorkspaceShell` (junto a bootstrap), que internamente monta sub-hooks por área. Cada sub-hook vive junto a su módulo **o** en `render-audit/hooks/` leyendo stores existentes (preferido: hooks en render-audit leyendo stores — un punto de instrumentación, sin tocar 20 componentes).

Excepción aceptable: timeline pasa refs de layout desde `TimelineHorizontal` al hook (datos no en store).

### 5.4 Visor

`AuditLogViewer` — **tres pestañas:**

| Pestaña | Fuente buffer | Filtro default |
|---------|---------------|----------------|
| Sistema | `audit` | dominios OBS-001 |
| Interfaz | `renderAudit` standard | `domain === ui` && !verbose |
| Detallado | `renderAudit` verbose | `domain === ui` && verbose |

Menú debug: tres toggles + tres «borrar» + «Ver registro» (recuerda última pestaña).

---

## 6. Arquitectura backend (Rust)

Ampliar `src-tauri/src/audit/` (`#[cfg(debug_assertions)]`):

| Comando | Canal |
|---------|-------|
| `render_audit_bootstrap` | Crea paths ② y ③ si toggles on; aplica clear-on-boot |
| `render_audit_append_entry` | `{ channel: "standard" \| "verbose", entry }` |
| `render_audit_patch_settings` | Persiste campos render* |
| `render_audit_clear_logs` | `{ channel: "standard" \| "verbose" \| "all" }` |

Estado: `RenderAuditState { standard_log_path, verbose_log_path }`.

---

## 7. Compuertas release

Idénticas a OBS-001. **Una** compuerta `__AUDIT_ENABLED__` cubre ② y ③.

Checklist cierre:

- [x] `grep dist/` sin `renderVerbose`, `ui-verbose`, `obs.ui.`
- [x] Release sin IPC `render_audit_*`
- [x] `_debug/**` en gitignore

---

## 8. Menú debug (UX) — i18n sugerido

> **Actualización OBS-003 (jun 2026):** el menú debug pasó a **cinco toggles** unificados (①–⑤), **un** botón «Eliminar todo el registro» y **un** toggle «Sesión única al reiniciar». Ver [`OBS-003 §2`](../../Fase%20D/OBS-003-action-audit-log.md#2-modelo-de-cinco-toggles--dos-acciones-unificadas). Esta sección documenta los toggles **②③** de OBS-002; el catálogo i18n completo vive en `src/i18n/*/debug.json`.

| Control | Key ES |
|---------|--------|
| Toggle ① | «Registro del sistema» (OBS-001) |
| Toggle ② | «Registro de interfaz» |
| Toggle ③ | «Registro de interfaz (detallado)» |
| Toggle ④ | «Registro de acciones» (OBS-003 session) |
| Toggle ⑤ | «Registro de acciones (detallado)» (OBS-003 verbose) |
| Borrar todo | «Eliminar todo el registro» (único — vacía logs/, render-logs/, action-logs/) |
| Sesión única | «Sesión única al reiniciar» (marca los cinco clear-on-boot) |
| Visor tab ② | «Interfaz» |
| Visor tab ③ | «Interfaz (detallado)» |
| Visor tab ④ | «Acciones» |
| Visor tab ⑤ | «Acciones (detallado)» |

Subtítulo toggle ③ / ⑤: «Snapshots completos; puede generar archivos grandes».

**Histórico (pre-OBS-003):** tres botones «Borrar registro…» independientes — reemplazados por acción unificada.

---

## 9. Rendimiento

| Canal | Riesgo | Mitigación |
|-------|--------|------------|
| ② estándar | Hover / scroll flood | Debounce; enter/leave; hash de estado |
| ③ verbose | Archivos MB | Buffer 400; off por default; warning en menú |
| Off | Cualquier coste | Stub + early return en hooks |

**No implementar en ②:** `pathIndex` completo, `placed[]` completo, resize sin debounce.  
**Solo en ③:** dumps completos, pre-debounce samples, neighbor maps.

---

## 10. Fases de implementación

### Fase 0 — Esqueleto completo (Medio)

- [x] Tipos, catálogo `events.ts`, API dual-channel, stub release.
- [x] Rust: settings, dos paths, append con channel, clear selectivo.
- [x] `useRenderAuditBootstrap` + `useUiRenderAudit` (stubs vacíos por área).
- [x] Tests: standard/verbose independientes; truncado 8 KiB verbose.
- [x] Menú: **tres toggles** + tres borrados.

### Fase 1 — Instrumentación estándar ② (Medio–Alto)

Prioridad de implementación hooks (orden QA):

1. **Timeline** — FIX-009d (inmediato) ✅
2. **Workspace** — view + layout ✅
3. **Explorador** — selection + visibleTree ✅
4. **Editor** — activeDocument + eventFrames + viewport ✅
5. **Side panel / calendar** — tab + week strip ✅
6. **Entity/WB** — si aplica vista activa ✅

Cada hook emite solo eventos **std** de §3.

### Fase 2 — Verbose ③ + visor (Medio)

- [x] Verbose en timeline: `writingOrderIndex`, `writingOrderNeighbors`, `placed[]` full.
- [x] Verbose explorador: árbol completo trunc 500.
- [x] Verbose editor: viewport extendido.
- [x] Visor tres pestañas + export clipboard por canal.

### Fase 3 — Mantenimiento y extensiones (Bajo, continuo)

- [x] Stubs `obs.ui.maps.*` (hook `useMapsRenderAuditStub` no-op documentado).
- [x] Correlación opcional con OBS-001: `systemSessionPath` en bootstrap payload.
- [x] Documentar en `06-ARCHITECTURE.md` § Observabilidad.

---

## 11. Criterios de aceptación

1. **Tres toggles** independientes; tres archivos posibles con mismo `bootId`.
2. Solo ② activo: `ui-session-*.ndjson` con eventos semánticos multi-módulo al navegar la app; sin dumps en verbose file.
3. Solo ③ activo: `ui-verbose-*.ndjson` crece; `ui-session-*` no (o vacío).
4. ②+③: mismos triggers generan entrada ligera + detallada en archivos distintos.
5. FIX-009d reproducible con ②: hover D muestra `prevId`/`nextId` en NDJSON estándar.
6. Release: cero toggles, cero IPC, cero strings debug en bundle.

---

## 12. QA manual (plantilla)

1. Activar solo ② → recorrer explorador, editor, timeline → un archivo `ui-session-*` legible (<500 líneas sesión corta).
2. Activar solo ③ → hover timeline → `ui-verbose-*` contiene `writingOrderNeighbors` o `placed[]` full.
3. Activar ①②③ → tres archivos emparejados por `bootId`.
4. Desactivar ③ → interactuar → verbose file no crece.
5. `npm run build` → grep limpio.

---

## 13. Referencias

- OBS-001: [`OBS-001-system-audit-log.md`](../Fase%20B/OBS-001-system-audit-log.md)
- OBS-003 (menú unificado + acciones): [`OBS-003-action-audit-log.md`](../Fase%20D/OBS-003-action-audit-log.md)
- FIX-009d: [`FIX-009d-audit-writing-order-path-index.md`](FIX-009d-audit-writing-order-path-index.md)
- Workspace: `WorkspaceShell`, `useWorkspaceStore`, `GlobalNav`
- Stores: `useFileTreeStore`, `useEditorStore`, `useTimelineStore`

---

**Última actualización:** 2026-06-11
