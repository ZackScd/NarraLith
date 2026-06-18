# MAP-002 — Multi-mundo: apertura y selector de mapas

> **Estado:** ✅ **Cerrado** (2026-06-11) · QA manual §7 validado (`1781754152083-26128`)  
> **Esfuerzo:** Medio · **Riesgo:** Bajo–medio  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md) Fase F · **Spec:** [`maps-design.md`](../../maps-design.md) §3ter · **Previo:** [MAP-001 ✅](MAP-001-persistence-v2.md) · **Siguiente:** MAP-003

---

## 0. Convención

| Regla | Detalle |
|-------|---------|
| Flujo | Plan → ejecución → tests → QA/OBS → cerrar §8 → MAP-003 |
| Commits | Usuario |
| Evidencia | Recorrido OBS §7 (proyecto con ≥2 mapas) |

---

## 1. Problema y objetivo

### 1.1 Problema (post MAP-001)

MAP-001 entrega persistencia v2 y una UI placeholder con **rejilla de tarjetas**, pero:

| Carencia | Impacto |
|----------|---------|
| `activeMapId` **no se restaura** al entrar al módulo | Siempre null hasta clic manual |
| `openPreference` y `defaultOnOpen` existen en **tipos/index** sin UX ni lógica | Spec §3ter.1 incumplido |
| No hay `lastViewedMapId` en disco | Modo «último visto» imposible |
| Selector ausente en barra | Spec pide selector / explorador (UX pendiente §3ter.1) |

### 1.2 Objetivo MAP-002

Implementar **multi-mundo operativo** a nivel de **navegación entre mapas del proyecto**:

1. Al abrir el módulo Mapas → cargar **un mapa** según preferencia del proyecto.
2. Selector claro para cambiar de mapa en cualquier momento.
3. Marcar **un mapa fijado** (`defaultOnOpen`) — exclusivo.
4. Persistir **último visto** en `index.json` (alcance proyecto).
5. Modo **último modificado** vía `updatedAt` del índice.

### 1.3 Criterios de aceptación

| # | Criterio |
|---|----------|
| C1 | `index.json` incluye `lastViewedMapId` (opcional) |
| C2 | Rust: `resolve_initial_map_id` con reglas §3ter.1 + tests |
| C3 | IPC: leer sesión, fijar preferencia, fijar pin, registrar vista |
| C4 | Al entrar a Mapas → `activeMapId` resuelto automáticamente (si hay mapas) |
| C5 | Selector en header (dropdown) + acción «fijar al abrir» |
| C6 | Cambiar mapa → persiste `lastViewedMapId`; reabrir módulo respeta preferencia |
| C7 | Solo **un** `defaultOnOpen: true` en índice |
| C8 | Cambio de proyecto → reset store + sesión del **nuevo** proyecto |
| C9 | OBS: eventos `select`, `setDefaultOnOpen`, `setOpenPreference`, `resolveInitial` |

### 1.4 Fuera de alcance MAP-002

| Tema | Plan |
|------|------|
| Diálogo crear mapa (tamaños, import) | MAP-003 |
| Renombrar / eliminar mapa | MAP-003 o posterior |
| Canvas, estudio, compositor | MAP-004+ |
| `localStorage` para mapas (estilo FIX-007) | No — sesión en `index.json` |
| Reordenar mapas en índice (drag) | Futuro |

---

## 2. Auditoría post MAP-001 (jun 2026)

### 2.1 Rust — lo que ya existe

| Pieza | Estado |
|-------|--------|
| `MapsIndexV2.open_preference` | ✅ serializa; default `lastViewed` |
| `MapIndexEntryV2.default_on_open` | ✅ campo; **sin** API exclusiva |
| `list_maps` | ✅ devuelve `defaultOnOpen` en summary |
| `upsert_index_entry` | ⚠️ no limpia otros pins al fijar uno |
| `lastViewedMapId` | ❌ no existe |
| `resolve_initial_map` | ❌ |
| Comandos index/sesión | ❌ |

**Archivos:** `src-tauri/src/fs/maps_store.rs`, `src-tauri/src/commands/maps.rs`, `src-tauri/src/lib.rs`

### 2.2 Frontend — lo que ya existe

| Pieza | Estado |
|-------|--------|
| `MapWorkspace` | Rejilla clic → `setActiveMap`; sin auto-resolución |
| `useMapProject` | Lista + activo; no llama sesión/resolución |
| `useMapStore` | Solo `activeMapId` + reset |
| `useProjectStore` L164 | `useMapStore.reset()` al cambiar proyecto ✅ |
| `useWorkspaceActionAudit` | `obs.action.map.open` stub una vez por sesión vista |
| `useMapsRenderAudit.stub` | `mapId: null` si stub antes de selección |
| i18n `maps.json` | Sin claves selector / preferencia / pin |

### 2.3 Gaps respecto al spec §3ter.1

```text
Spec                          MAP-001              MAP-002
─────────────────────────────────────────────────────────────
N mapas ilimitados            ✅ crear/listar       (sin cambio)
Un mapa al abrir módulo       ❌                    ✅ resolver
Fijado defaultOnOpen          ❌ campo muerto       ✅ UX + exclusividad
Último visto                  ❌                    ✅ lastViewedMapId
Último modificado             ❌ (updatedAt existe) ✅ usar updatedAt
Selector en módulo            ⚠️ rejilla            ✅ dropdown header
```

---

## 3. Decisiones de diseño (cerradas para implementación)

### D1 — Dónde persiste «último visto»

**`index.json`** → campo `lastViewedMapId?: string` (proyecto, sobrevive reinicio app).

No `localStorage` (MAP-000/001: borrador de dibujo ≠ sesión de navegación).

### D2 — Resolución al abrir módulo

```text
resolve_initial_map(openPreference, index):

  pinned:
    1. Entrada con defaultOnOpen == true
    2. Fallback → lastViewedMapId (si válido)
    3. Fallback → mapa con max(updatedAt)
    4. Fallback → primer mapa del índice
    5. null (empty state)

  lastViewed:
    1. lastViewedMapId (si válido)
    2. Fallback → pinned (si hay)
    3. Fallback → max(updatedAt)
    4. Fallback → primero
    5. null

  lastModified:
    1. max(updatedAt)
    2. Fallback → lastViewedMapId
    3. Fallback → pinned
    4. Fallback → primero
    5. null
```

Devolver también `reason: "pinned" | "lastViewed" | "lastModified" | "fallbackFirst" | "none"` para OBS/tests.

**Mapa inválido** (id en índice borrado manualmente): ignorar y seguir cadena de fallback.

### D3 — UI v1 MAP-002

| Elemento | Ubicación |
|----------|-----------|
| **Selector mapa** | Header — `Select` (Shadcn) con nombre + dimensiones en ítem |
| **Preferencia al abrir** | Header — `Select` 3 opciones (último visto / fijado / último modificado) |
| **Fijar al abrir** | Botón icono `Star` en header (toggle del mapa activo) |
| **Rejilla tarjetas** | **Eliminar** — sustituida por selector (menos ruido; MAP-003 puede enriquecer) |
| **Panel detalle** | Mantener debajo del selector (ID, capas, trazos) — útil hasta MAP-004 |

### D4 — Cuándo escribir `lastViewedMapId`

| Evento | Acción |
|--------|--------|
| Usuario elige mapa en selector | `record_map_viewed_cmd` |
| Crear mapa nuevo | Registrar + activar (MAP-001 ya activa) |
| Resolución automática al abrir | **No** escribir (solo lectura) |

### D5 — Actualizar `updatedAt`

Ya se actualiza en `save_map_document` / `create_blank_map`. MAP-002: también bump en `record_map_viewed` **opcional** — **No** en v1 (solo vista no cuenta como modificación; coherente con spec «último modificado» = editado).

---

## 4. Esquema e IPC

### 4.1 `index.json` (v2, ampliado)

```typescript
interface MapsIndexV2 {
  version: 2;
  openPreference: "pinned" | "lastViewed" | "lastModified";
  lastViewedMapId?: string | null;
  maps: MapIndexEntryV2[];
}
```

Migración: proyectos existentes sin campo → `lastViewedMapId` ausente = null.

### 4.2 Nuevos tipos IPC

```typescript
interface MapSessionV2 {
  openPreference: OpenPreference;
  lastViewedMapId: string | null;
  initialMapId: string | null;
  initialReason:
    | "pinned"
    | "lastViewed"
    | "lastModified"
    | "fallbackFirst"
    | "none";
  maps: MapSummaryV2[];
}
```

### 4.3 Comandos nuevos

| Comando | Args | Returns |
|---------|------|---------|
| `get_maps_session_cmd` | — | `MapSessionV2` |
| `set_open_preference_cmd` | `openPreference` | `()` |
| `set_default_on_open_cmd` | `mapId`, `enabled: boolean` | `()` |
| `record_map_viewed_cmd` | `mapId` | `()` |

**Mantener** comandos MAP-001 sin cambio de contrato.

### 4.4 Rust — funciones nuevas en `maps_store.rs`

| Función | Rol |
|---------|-----|
| `get_maps_session` | Lista + preferencia + resolve initial |
| `resolve_initial_map_id` | Lógica §3.2 |
| `set_open_preference` | Escribe index |
| `set_default_on_open` | Exclusividad pin |
| `record_map_viewed` | `lastViewedMapId` |

### 4.5 Tests Rust (mínimo)

| Test | Escenario |
|------|-----------|
| `resolve_pinned` | Pin A → abre A |
| `resolve_pinned_fallback` | Sin pin → lastViewed |
| `resolve_last_viewed` | lastViewed válido |
| `resolve_last_viewed_stale` | id huérfano → fallback |
| `resolve_last_modified` | max updatedAt |
| `set_default_exclusive` | Pin B desmarca A |
| `record_viewed_persists` | Tras record, index actualizado |

---

## 5. Frontend — diseño

### 5.1 Flujo al entrar al módulo

```text
mainView → "map"
    │
    ▼
get_maps_session_cmd
    │
    ├─ initialMapId → setActiveMap(id)
    └─ maps[] → estado lista
    │
    ▼
OBS resolveInitial + map.open (mapId real)
```

Ejecutar en `useMapProject` cuando `rootPath` cambia **o** al montar `MapWorkspace` si `activeMapId` es null.

### 5.2 `useMapStore` (ampliación mínima)

Opcional en store: `openPreference` en RAM para UI — o leer de sesión IPC cada vez. **Recomendación:** estado en hook `useMapProject` (`session` snapshot), no store global extra.

### 5.3 Componentes

| Archivo | Cambio |
|---------|--------|
| `MapWorkspace.tsx` | Header: Select mapa + Select preferencia + Star pin; quitar rejilla |
| `useMapProject.ts` | `loadSession`, `selectMap`, `setOpenPreference`, `setDefaultOnOpen` |
| `lib/types/maps.ts` | `MapSessionV2`, `InitialMapReason` |
| `i18n/{es,en}/maps.json` | `selector.*`, `openPreference.*`, `pin.*` |
| `action-audit/events.ts` | Nuevos eventos §6 |
| `useWorkspaceActionAudit.ts` | Quitar `stub: true` en open cuando MAP-002 instrumente |
| `useMapsRenderAudit.stub.ts` | Emitir con `mapId` activo tras resolución |

---

## 6. OBS — eventos nuevos

| Evento | Cuándo | Payload |
|--------|--------|---------|
| `obs.action.map.resolveInitial` | Tras `get_maps_session` | `{ mapId, reason, openPreference }` |
| `obs.action.map.select` | Usuario cambia selector | `{ mapId, fromMapId? }` |
| `obs.action.map.setOpenPreference` | Cambia preferencia | `{ openPreference }` |
| `obs.action.map.setDefaultOnOpen` | Toggle estrella | `{ mapId, enabled }` |
| `obs.ui.maps.viewport` | Entrar / cambiar mapa | `{ mapId, stub: false }` |

---

## 7. Recorrido OBS para QA (usuario)

**Prerrequisitos:** OBS-002 activo (acción + UI); proyecto con **≥2 mapas** (p. ej. `mapTest`, `MapTest2`).

| Paso | Acción | Qué buscar en NDJSON |
|------|--------|----------------------|
| 1 | Abrir app → proyecto con 2 mapas | bootstrap |
| 2 | Ir a **Mapas** | `obs.action.map.resolveInitial` con `mapId` + `reason` · `obs.action.map.open` |
| 3 | Anotar qué mapa cargó | UI: selector muestra activo; panel detalle visible |
| 4 | Cambiar al **otro** mapa en selector | `obs.action.map.select` · `obs.ui.maps.viewport` con nuevo `mapId` |
| 5 | Salir a **Editor** y volver a **Mapas** | `resolveInitial` con `reason: "lastViewed"` (preferencia default) · mismo mapa que paso 4 |
| 6 | Preferencia → **Último modificado** | `setOpenPreference` |
| 7 | Crear mapa nuevo (nombre único) | mapa nuevo activo; lista 3 |
| 8 | Salir y reentrar Mapas | `resolveInitial` → mapa recién creado si es max `updatedAt` |
| 9 | Preferencia → **Fijado** · pin en **mapTest** (estrella) | `setDefaultOnOpen` `{ enabled: true }` |
| 10 | Pin en **MapTest2** | segundo `setDefaultOnOpen`; mapTest despin implícito |
| 11 | Reentrar Mapas | `resolveInitial` `reason: "pinned"` → mapa fijado |

**Fuera de alcance QA MAP-002:** cambio de proyecto en caliente (no hay UX de «abrir otro proyecto» sin cerrar la app; `useMapStore.reset()` al cambiar proyecto queda para cuando exista ese flujo).

**Archivos adjuntos (sesión validada):** `session-1781754152083-26128.ndjson`, `action-session-1781754152083-26128.ndjson`, `ui-session-1781754152083-26128.ndjson`.

**No hace falta** recorrido de dibujo/canvas — MAP-002 es solo navegación multi-mapa.

---

## 8. Verificación automatizada

| Comando | Esperado |
|---------|----------|
| `cargo test` | +7 tests resolve/pin/viewed |
| `npm test` | Sin regresión |
| `npm run build` | OK |

---

## 9. Fases de ejecución

```text
Fase 1  Rust: index.lastViewedMapId + resolve + APIs + tests
Fase 2  IPC + lib.rs
Fase 3  TS tipos + useMapProject session
Fase 4  MapWorkspace header UX + i18n
Fase 5  OBS hooks
Fase 6  QA manual §7
```

---

## 10. Handoff → MAP-003

MAP-003 tomará el botón «Nuevo mapa» → diálogo completo (tamaño libre, import imagen). MAP-002 deja crear con defaults 2400×1600 en header **o** mueve crear al diálogo — **recomendación:** mantener crear simple en header hasta MAP-003 refactor UX.

---

## 11. Registro

| Fecha | Evento |
|-------|--------|
| 2026-06-11 | Plan MAP-002 redactado (auditoría post MAP-001 ✅) |
| 2026-06-11 | Implementación Fases 1–5: Rust + IPC + hook + UI + OBS; 13 tests maps_store; build OK |
| 2026-06-11 | **QA cerrado** sesión `1781754152083-26128`: resolveInitial (lastViewed/lastModified/pinned), select, setOpenPreference, setDefaultOnOpen, viewport `stub:false`; paso cambio de proyecto omitido (sin UX multi-proyecto) |
