# OBS-003 — Registro de acciones de usuario (action audit)

> **Estado:** ✅ Implementado (Fases 0–3, jun 2026) · **Esfuerzo:** Alto · **Riesgo:** Bajo–Medio  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md) Fase D · **Siguiente tarea D:** [FIX-010i](FIX-010i-calendar-structural-diff.md)  
> **Depende de:** [OBS-001](../Fase%20B/OBS-001-system-audit-log.md) ✅ · [OBS-002](../Fase%20C/OBS-002-ui-render-audit-log.md) ✅  
> **Motivación:** QA manual sin narrar pasos; reproducir bugs (010i, §13, freeze calendario) desde NDJSON.

---

## 0. Auditoría del estado actual (jun 2026)

### 0.1 Cuatro capas — estado post-implementación

| Capa | ID | Qué registra | Archivo | Estado |
|------|-----|--------------|---------|--------|
| Sistema | OBS-001 | IPC, FS, editor store, watcher, proyecto | `_debug/logs/session-{bootId}.ndjson` | ✅ |
| Estado UI | OBS-002 std | Snapshots render: layout, árbol, gutter, timeline colocado | `_debug/render-logs/ui-session-*.ndjson` | ✅ |
| Estado UI verbose | OBS-002 verbose | Dumps grandes (vecinos escritura, árbol 500 paths) | `_debug/render-logs/ui-verbose-*.ndjson` | ✅ |
| **Acciones** | **OBS-003** | Clicks, toggles, guardar, navegación (intención) | `_debug/action-logs/action-session-*.ndjson` | ✅ |
| Acciones verbose | OBS-003 verbose | Focus, hover, resize, context menu | `_debug/action-logs/action-verbose-*.ndjson` | ✅ |

**Ejemplo real (sesión usuario jun 2026):** logs muestran `viewChange → calendar` y `calendarPanel.week` corrupto, pero **no** «expandí Editar calendario → Meses → Editar meses → eliminé Abril → Guardar».

### 0.2 Menú debug — fricción actual

Archivo: [`DebugNavMenu.tsx`](../../../../src/modules/debug/DebugNavMenu.tsx)

| Control hoy | Cantidad | Problema |
|-------------|----------|----------|
| Toggles activar/desactivar | 3 | OK; con OBS-003 serán **5** tipos |
| «Eliminar registro…» | **3 botones** | Usuario quiere **1** «Eliminar todo» |
| «Sesión única al reiniciar…» | **3 toggles** | Usuario quiere **1** «Sesión única» global |
| «Ver registro» / pestañas visor | 3 entradas + atajo | Ampliar a 5 pestañas o agrupar |

Settings Rust/TS: [`AuditDebugSettings`](../../../../src-tauri/src/audit/types.rs) — tres flags `*ClearLogsOnNextBoot` independientes; `audit_clear_logs` / `render_audit_clear_logs` separados.

### 0.3 Piezas que tocará el cambio (inventario)

| Área | Archivos / módulos | Tipo de cambio |
|------|-------------------|----------------|
| **Plan** | Este doc, `implementation-plan.md`, índice FIX-010 | Docs |
| **Settings** | `src/lib/audit/types.ts`, `defaults.ts`, `src-tauri/src/audit/types.rs`, `state.rs`, `storage.rs` | Campos OBS-003 + unificación clear-on-boot |
| **Rust IPC** | `audit/commands.rs`, `state.rs`; nuevo sink action o extensión render_audit | Bootstrap paths, append, clear all |
| **Frontend API** | **Nuevo** `src/lib/action-audit/` | Espejo render-audit: dual channel |
| **Bootstrap** | `useAuditBootstrap`, `useAuditStore`, `action-audit/bootstrap.ts` | Paths, handlers, bootId |
| **Menú + visor** | `DebugNavMenu.tsx`, `AuditLogViewer.tsx`, `debug.json` i18n | UX unificada |
| **Instrumentación** | Hooks por módulo + puntos en componentes con estado local | Fases 1–N |
| **Release** | `stub.ts`, `vite` `__AUDIT_ENABLED__`, grep checklist | Sin strings en prod |
| **Docs arquitectura** | `06-ARCHITECTURE.md` § Observabilidad | Actualizar matriz 4 capas |

**No mezclar:** acciones **no** van a `audit.info("ui", …)` ni a `renderAudit.ui` — dominio y módulo propios (regla OBS-002 §5.2).

### 0.4 Relación OBS-002 ↔ OBS-003

| Pregunta | OBS-002 | OBS-003 |
|----------|---------|---------|
| «¿Qué semana dibujó el panel?» | `calendarPanel.week` | — |
| «¿El usuario abrió Editar calendario?» | — | `obs.action.calendar.panel.toggle` |
| «¿Guardó borrador calendario?» | — (010i propone `obs.calendar.save` en dominio distinto) | `obs.action.calendar.draft.save` + payload `reconcileBaseline` |
| Mismo `bootId` | Sí | Sí — correlación temporal por `ts` |

Eventos de **dominio** post-guardado (`obs.calendar.*`, `obs.ipc.*`) pueden seguir en OBS-001; OBS-003 registra el **click/intent** y contexto UI mínimo.

### 0.5 Riesgos del cambio

| Riesgo | Mitigación |
|--------|------------|
| Archivos enormes (verbose) | Off por default; buffer 600/300; debounce; catálogo explícito |
| Fugas de contenido manuscrito | Prohibido texto Lexical; solo paths, ids, índices |
| Instrumentación incompleta | Catálogo §4 + §0.8 + checklist QA por módulo |
| Duplicar OBS-002 | No loguear mismo hecho en ambos salvo `viewChange` (acción) vs `layout` (estado) |
| Migración settings | Defaults Rust rellenan campos nuevos; flags viejos clear-on-boot unificados en UI |
| Duplicar OBS-001 | Ver §0.7 — convivencia deliberada en archivos distintos |

### 0.6 Auditoría de código (segunda pasada — jun 2026)

Revisión archivo a archivo del repo frente al plan v1. Objetivo: que **nada quede fuera** del alcance de implementación.

#### 0.6.1 Infraestructura existente (patrón a copiar)

| Pieza | Ubicación | Notas para OBS-003 |
|-------|-----------|-------------------|
| Ring buffer dual | [`createRenderAuditApi.ts`](../../../../src/lib/render-audit/createRenderAuditApi.ts) | Copiar estructura `standard` + `verbose` + persist handlers |
| Persistencia NDJSON | [`audit/storage.rs`](../../../../src-tauri/src/audit/storage.rs) `append_entry` | Reutilizar; ampliar `SessionLogPaths` |
| Paths sesión | [`audit/paths.rs`](../../../../src-tauri/src/audit/paths.rs) | Añadir `action_logs_dir()` + `ensure_debug_dirs` |
| Bootstrap único | [`audit/state.rs`](../../../../src-tauri/src/audit/state.rs) `bootstrap()` | **Extender** (no comando `action_audit_bootstrap` separado): mismo `bootId`, 5 paths |
| IPC TS | [`lib/audit/ipc.ts`](../../../../src/lib/audit/ipc.ts) | `auditAppendActionEntry`, `auditClearAllLogs`, `auditSetActionLogEnabled`… |
| Tipos IPC FE | [`lib/types/audit.ts`](../../../../src/lib/types/audit.ts) | Ampliar `AuditConfigResponse`, `AuditLogPathResponse`, `AuditViewerTab` |
| Store UI | [`useAuditStore.ts`](../../../../src/stores/useAuditStore.ts) | Paths action, toggles, `clearAllLogs`, buffers action |
| Render bootstrap | [`render-audit/bootstrap.ts`](../../../../src/lib/render-audit/bootstrap.ts) | Espejo: `applyActionAuditConfig`, `ensureActionAuditPersistHandlers`, `logActionAuditBootstrap` |
| Compuerta release | [`vite.config.ts`](../../../../vite.config.ts) `__AUDIT_ENABLED__` | Stub `action-audit/stub.ts` |
| Comandos Tauri | [`lib.rs`](../../../../src-tauri/src/lib.rs) L106–126 | Registrar nuevos `audit_*` bajo `#[cfg(debug_assertions)]` |
| Tests referencia | [`render-audit.test.ts`](../../../../src/lib/render-audit/render-audit.test.ts), [`audit/storage.rs`](../../../../src-tauri/src/audit/storage.rs) tests | `action-audit.test.ts` + test `clear_all_logs` |

#### 0.6.2 Menú / visor — delta concreto

| Archivo | Cambio |
|---------|--------|
| [`DebugNavMenu.tsx`](../../../../src/modules/debug/DebugNavMenu.tsx) | 5 toggles; 1 `MenuAction` borrar; 1 toggle sesión única; quitar 3+3 actuales; 5º punto indicador |
| [`AuditLogViewer.tsx`](../../../../src/modules/debug/AuditLogViewer.tsx) | `AuditViewerTab`: `"action"` \| `"actionVerbose"`; `useAuditEntries` → `actionAudit` |
| [`GlobalNav.tsx`](../../../../src/modules/layout/GlobalNav.tsx) | Indicador 🐛 (5 puntos o agrupación ④⑤) |
| [`i18n/es/debug.json`](../../../../src/i18n/es/debug.json) + `en` | Keys toggles, borrar todo, sesión única, pestañas, carpetas |
| [`useAuditLogShortcut.ts`](../../../../src/hooks/useAuditLogShortcut.ts) | Sin cambio funcional; verificar con 5 pestañas |

#### 0.6.3 Bootstrap — hueco crítico

Hoy [`useAuditBootstrap`](../../../../src/hooks/useAuditBootstrap.ts) solo monta en [`WorkspaceShell`](../../../../src/modules/layout/WorkspaceShell.tsx). [`ProjectLauncher`](../../../../src/modules/project/ProjectLauncher.tsx) **no** tiene menú debug ni audit.

| Consecuencia | Acción plan |
|--------------|-------------|
| Abrir proyecto desde launcher no genera `action-session-*` hasta entrar al workspace | **Mover** `useAuditBootstrap` + `DebugNavMenu` a [`App.tsx`](../../../../src/App.tsx) (o shell común launcher+workspace) en Fase 0 |
| `obs.project.open` ya existe en OBS-001 ([`useProjectStore`](../../../../src/stores/useProjectStore.ts)) | OBS-003 re-emite `obs.action.project.open` en action log al abrir (mismo handler store) |

#### 0.6.4 `clear_logs` — comportamiento actual vs «eliminar todo»

| Comando hoy | Qué hace realmente |
|-------------|-------------------|
| `audit_clear_logs` | Borra **toda** `_debug/logs/`; regenera `bootId` y paths de system **y** asigna nuevos paths render en memoria **sin** borrar archivos render en disco |
| `audit_clear_render_logs` | Borra `ui-session-*` y/o `ui-verbose-*` en `_debug/render-logs/` |
| Sesión única | Tres flags independientes en bootstrap ([`state.rs`](../../../../src-tauri/src/audit/state.rs) L48–61) |

**Decisión implementación:** `audit_clear_all_logs` debe:

1. Vaciar buffers RAM (audit + renderAudit + actionAudit).
2. Borrar archivos en `logs/`, `render-logs/`, **`action-logs/`** (toda la carpeta, igual que hoy system/render).
3. Rotar `bootId` una vez y actualizar los 5 paths en `AuditState`.

UI «Sesión única» escribe los **cinco** flags clear-on-boot (o un solo `clearAllLogsOnNextBoot` que bootstrap interpreta).

#### 0.6.5 Navegación `setMainView` — bypass del guard calendario

[`useWorkspaceStore.setMainView`](../../../../src/stores/useWorkspaceStore.ts) es el punto único ideal para `obs.action.workspace.viewChange`, **pero** hay llamadas directas que **saltan** [`guardCalendarNavigation`](../../../../src/modules/layout/WorkspaceShell.tsx):

| Archivo | Riesgo QA |
|---------|-----------|
| [`TimelineSidePanel.tsx`](../../../../src/modules/timeline/TimelineSidePanel.tsx) | → calendar sin guard |
| [`CalendarEditPanel.tsx`](../../../../src/modules/calendar/CalendarEditPanel.tsx) | → editor |
| [`CalendarSidePanel.tsx`](../../../../src/modules/calendar/CalendarSidePanel.tsx) | usa guard ✓ |
| [`TimelineHorizontal.tsx`](../../../../src/modules/timeline/TimelineHorizontal.tsx) | → editor |
| [`GraphView.tsx`](../../../../src/modules/graph/GraphView.tsx) | → editor |
| [`ConsistencyPanel.tsx`](../../../../src/modules/consistency/ConsistencyPanel.tsx) | → editor |
| [`WorkspaceShell.tsx`](../../../../src/modules/layout/WorkspaceShell.tsx) Settings | → consistency / editor |

**Plan:** log en `setMainView` siempre `{ from, to, source?: string }`; opcional `source` en llamadas directas. Los bloqueos por guard se loguean en `useCalendarViewStore.guardNavigation` → `obs.action.calendar.draft.unsavedDialog` `{ result: "blocked" }`.

### 0.7 Convivencia OBS-001 ↔ OBS-003 (eventos ya instrumentados)

OBS-001 ya registra acciones técnicas en `session-*.ndjson`. OBS-003 **no las elimina**; duplica en `action-session-*` con nombres orientados a QA.

| Dominio OBS-001 (existente) | Equivalente OBS-003 | Estrategia |
|----------------------------|---------------------|------------|
| `obs.project.open` / `close` | `obs.action.project.*` | Hook en `useProjectStore` emite action si ④ ON |
| `obs.editor.tab.*` | `obs.action.editor.tab*` | Hook subscribe `useEditorStore` o re-emit en store |
| `obs.editor.save.start/end` | `obs.action.editor.save` | Unificar en action log (una línea por guardado) |
| `obs.editor.unsaved.dialog` | `obs.action.editor.unsavedDialog` | Misma transacción |
| `obs.explorer.inline_*` | `obs.action.explorer.*` | Mapeo 1:1 |
| `obs.editor.diff.open` | `obs.action.editor.dirtyDiffToggle` | Plugin + store |

**Regla:** action log = **crónica legible**; system log = **profundidad técnica** (duraciones IPC, fs.sync, saveAll cache).

### 0.8 Huecos del catálogo §4 (faltaban en plan v1)

| Área | Eventos a añadir | Dónde instrumentar |
|------|------------------|-------------------|
| Calendario | `monthDelete.confirm` / `cancel` | [`CalendarEditPanel`](../../../../src/modules/calendar/CalendarEditPanel.tsx) + `monthDeletePending` |
| Calendario | `deleteCalendar.restoreDefault` / `leaveBlank` | [`CalendarDraftDialogs`](../../../../src/modules/calendar/CalendarDraftDialogs.tsx) |
| Calendario | `season.*` / `specialYear.*` / `recurring.*` edit toggles | `CalendarEditPanel` secciones locales |
| Calendario | `day.select` / `month.shift` | `useCalendarViewStore` |
| Calendario | `topBar.yearJump` | [`CalendarTopBar`](../../../../src/modules/calendar/CalendarTopBar.tsx) |
| Calendario | Ajustes globales (fuera vista) | [`CalendarSettingsSection`](../../../../src/modules/settings/CalendarSettingsSection.tsx) si existe · **v1 session** |
| Editor | `saveAll` | `useEditorStore` saveAll |
| Editor | `externalReload.dialog` | `useEditorStore` reload dialog |
| Editor | `wikiLink.open` | WikiLinkClickPlugin — **verbose** |
| Launcher | `recent.remove` | `ProjectLauncher` |
| Launcher | `createDialog.open` | `CreateProjectDialog` |
| Settings | `closeProject` / tema / locale / autosave | `SettingsDialog` + `useSettingsStore` |
| Layout | `explorer.resize` / `panel.resize` | `useLayoutStore` — **verbose** |
| Explorador | `search.query` | `useFileTreeStore` — **verbose** |
| Timeline | `focusDate.change` | `useTimelineStore` |
| Side panel | `tab.change` (editor/timeline/calendar) | Ya OBS-002 `sidePanel.tab` → action espejo |

### 0.9 Inventario ampliado de archivos (checklist implementación)

**Rust:** `types.rs`, `state.rs`, `storage.rs`, `paths.rs`, `commands.rs`, `mod.rs`, tests en `storage.rs`.

**TypeScript core:** `lib/audit/types.ts`, `defaults.ts`, `ipc.ts`, `lib/types/audit.ts`, `stores/useAuditStore.ts`, `hooks/useAuditBootstrap.ts`, **`App.tsx`** (bootstrap global).

**Nuevo módulo:** `lib/action-audit/**` (§3.2) + `action-audit.test.ts`.

**UI debug:** `DebugNavMenu.tsx`, `AuditLogViewer.tsx`, `GlobalNav.tsx`, `i18n/*/debug.json`.

**Hooks acción:** `lib/action-audit/hooks/*` (§3.2) montados desde `WorkspaceShell` vía `useUiActionAudit()`.

**Componentes con estado local (handlers obligatorios Fase 1 calendario):**

- [`CalendarEditPanel.tsx`](../../../../src/modules/calendar/CalendarEditPanel.tsx) — `monthsExpanded`, `monthsEditEnabled`, `seasons*`, `specialYears*`
- [`CalendarSidePanel.tsx`](../../../../src/modules/calendar/CalendarSidePanel.tsx) — `editExpanded` vía store ✓
- [`PanelSectionHeader`](../../../../src/components/workspace-ui/PanelSectionHeader.tsx) — lápiz editar meses/estaciones (prop `onEditToggle`)
- [`monthListDnD.tsx`](../../../../src/modules/calendar/monthListDnD.tsx) — reorder
- [`CalendarMonthRows`](../../../../src/modules/calendar/CalendarMonthRows.tsx) — remove month
- [`CalendarDraftDialogs.tsx`](../../../../src/modules/calendar/CalendarDraftDialogs.tsx)
- [`CalendarSidePanel`](../../../../src/modules/calendar/CalendarSidePanel.tsx) `PanelDraftFooter` onSave/onDiscard

**Stores middleware / subscribe:**

- `useWorkspaceStore.ts` — **wrap `setMainView`**
- `useCalendarViewStore.ts` — save/discard/guard/confirmUnsaved/openMonth/…
- `useFileTreeStore.ts` — bridge desde eventos explorer existentes
- `useEditorStore.ts` — bridge tabs/save/unsaved
- `useProjectStore.ts` — open/close/create
- `useTimelineStore.ts` — filters (parcialmente ya en render audit)

**Docs:** [`06-ARCHITECTURE.md`](../../archive/retired-cadence/06-ARCHITECTURE.md), [OBS-001 §2.4](../Fase%20B/OBS-001-system-audit-log.md) nota «fuera de v1» actualizar.

**No tocar en v1:** `logStorePatches` flag OBS-001 (sigue off); macro `audited_command` Rust.

---

## 1. Problema y objetivo

### 1.1 Problema

OBS-001 + OBS-002 no bastan para decir **qué hizo el usuario** en orden. Obliga a reproducir paso a paso en chat o adivinar desde snapshots.

### 1.2 Objetivo OBS-003

1. **Diario de acciones** estructurado, multi-módulo, mismo `bootId` que el resto.
2. **Dos canales** (como interfaz): **session** (semántico) y **verbose** (ruido opcional).
3. **Menú debug simplificado:** un borrado total, una sesión única; toggles solo para encender/apagar cada **tipo** de log.
4. **Cobertura completa** de la app actual (no solo calendario); stubs para MAP/WB futuro.

### 1.3 No es

| Incorrecto | Realidad |
|------------|----------|
| Reemplazo de OBS-001/002 | Tercera capa complementaria |
| Grabación de pantalla | NDJSON acciones |
| Log de cada render React | Solo verbose acotado |
| Automático 100% sin tocar código | Catálogo + hooks/handlers en puntos semánticos |

---

## 2. Modelo de cinco toggles + dos acciones unificadas

### 2.1 Toggles (únicos controles separados)

| # | Toggle (i18n ES propuesto) | Canal | Archivo |
|---|----------------------------|-------|---------|
| ① | Registro del sistema | OBS-001 | `_debug/logs/session-{bootId}.ndjson` |
| ② | Registro de interfaz | OBS-002 std | `_debug/render-logs/ui-session-{bootId}.ndjson` |
| ③ | Registro de interfaz (detallado) | OBS-002 verbose | `_debug/render-logs/ui-verbose-{bootId}.ndjson` |
| ④ | **Registro de acciones** | OBS-003 session | `_debug/action-logs/action-session-{bootId}.ndjson` |
| ⑤ | **Registro de acciones (detallado)** | OBS-003 verbose | `_debug/action-logs/action-verbose-{bootId}.ndjson` |

Indicador 🐛: hasta **5 puntos** (verde / cielo / ámbar / violeta / rosa) o agrupar ④⑤ en un solo punto si ambos off/on juntos — decisión implementación Fase 0.

### 2.2 Acciones unificadas (UX)

| Acción única | Comportamiento |
|--------------|----------------|
| **Eliminar todo el registro** | Borra buffers RAM (3 APIs) + **todos** los `.ndjson` en `logs/`, `render-logs/`, `action-logs/` + rota `bootId` (comportamiento alineado con `clear_log_files` actual, no solo el archivo de la sesión corriente) |
| **Sesión única al reiniciar** | Un toggle marca **todos** los `*ClearOnNextBoot` → true; al próximo bootstrap se limpian las 5 rutas y el flag vuelve a false |

**Migración settings (interno):**

- Añadir `clearAllLogsOnNextBoot: boolean` **o** mantener flags granulares pero UI solo expone uno (patch escribe los 5).
- Comando Rust `audit_clear_all_logs` reemplaza tres diálogos de confirmación por uno.

### 2.3 Visor

| Pestaña | Fuente |
|---------|--------|
| Sistema | OBS-001 |
| Interfaz | OBS-002 std |
| Interfaz (det.) | OBS-002 verbose |
| **Acciones** | OBS-003 session |
| **Acciones (det.)** | OBS-003 verbose |

Atajo `Ctrl+Shift+L`: abre última pestaña o Sistema.

Menú «Abrir carpeta»: **una** entrada «Abrir carpeta `_debug`» (raíz repo) + opcional submenú por subcarpeta.

---

## 3. Formato y API

### 3.1 Convención eventos

- Prefijo: `obs.action.<área>.<verbo>`
- `domain: "action"` (nuevo en `AuditDomain` TS)
- Payload estándar:

```typescript
interface ActionAuditPayload {
  channel: "session" | "verbose";
  area: ActionArea;           // "workspace" | "explorer" | "calendar" | ...
  action: string;             // "panel.toggle" | "draft.save" | "month.remove"
  target?: string;            // "editCalendar.months" | path relativo | id
  result?: "ok" | "cancel" | "blocked" | "error";
  /** Contexto mínimo post-acción — sin PII ni cuerpos */
  context?: Record<string, string | number | boolean | null>;
}
```

### 3.2 API pública (frontend)

```text
src/lib/action-audit/
  types.ts
  events.ts              # catálogo §4
  defaults.ts
  createActionAuditApi.ts
  sanitizeActionPayload.ts
  instance.ts            # actionAudit
  bootstrap.ts
  stub.ts
  hooks/
    useActionAuditBootstrap.ts
    useWorkspaceActionAudit.ts
    useExplorerActionAudit.ts
    useEditorActionAudit.ts
    useTimelineActionAudit.ts
    useCalendarActionAudit.ts
    useDialogActionAudit.ts
    useSettingsActionAudit.ts
    useProjectActionAudit.ts
    index.ts               # useUiActionAudit() en WorkspaceShell
  trace/
    tracePanelToggle.ts    # helpers finos opcionales
```

```text
actionAudit.track(area, action, payload?, opts?)
  opts.channel: "session" | "verbose" | "both"  // default "session"
  opts.level: override

actionAudit.isSessionEnabled()
actionAudit.isVerboseEnabled()
```

**Early exit** si toggle off — coste ~0.

### 3.3 Backend Rust

Extender [`src-tauri/src/audit/`](../../../../src-tauri/src/audit/) (debug only) — **sin** módulo paralelo:

| Comando / método | Notas |
|------------------|-------|
| `audit_bootstrap` (existente) | Ampliar `SessionLogPaths`: `action_session`, `action_verbose`; clear-on-boot ④⑤ |
| `audit_append_action_entry` | `{ channel: ActionLogChannel, entry }` — espejo de `append_render_entry` |
| `audit_clear_all_logs` | **Nuevo** — system + render all + action all + buffers vía respuesta config |
| `audit_set_action_log_enabled` / `audit_set_action_verbose_enabled` | Espejo render toggles |
| `audit_patch_settings` | Campos `actionLogEnabled`, `actionVerboseEnabled`, buffers, `actionClearLogsOnNextBoot`, `actionVerboseClearLogsOnNextBoot` |
| `audit_get_log_path` | + `actionLogsDir`, paths action |

`AuditConfigResponse` ampliado: `actionSessionLogPath`, `actionVerboseLogPath`, `actionLogsDir`.

`ActionLogChannel` enum: `Session` \| `Verbose` (nombre archivo `action-session-` / `action-verbose-`).

---

## 4. Catálogo de acciones (objetivo cobertura)

Convención: **session** = fila en catálogo salvo nota «solo verbose».

### 4.1 Workspace / navegación

| Evento | Cuándo | Canal |
|--------|--------|-------|
| `obs.action.workspace.viewChange` | `setMainView` / guard calendar leave | session |
| `obs.action.workspace.explorerToggle` | Abrir/cerrar panel izquierdo | session |
| `obs.action.workspace.rightPanelToggle` | Colapsar panel derecho | session |
| `obs.action.workspace.settingsOpen` | Ajustes | session |
| `obs.action.workspace.versionsOpen` | Historial (aunque roto) | session |

### 4.2 Proyecto

| Evento | Cuándo |
|--------|--------|
| `obs.action.project.open` | Abrir reciente / carpeta · `{ name, pathHash }` |
| `obs.action.project.close` | Cerrar proyecto |
| `obs.action.project.create` | Crear proyecto |

### 4.3 Explorador

| Evento | Cuándo |
|--------|--------|
| `obs.action.explorer.select` | Selección nodo |
| `obs.action.explorer.viewMode` | manuscript / worldbuilding / all |
| `obs.action.explorer.expand` | Toggle carpeta |
| `obs.action.explorer.inlineCreate` | Inicio create/rename inline |
| `obs.action.explorer.inlineCommit` | Confirmar create/rename |
| `obs.action.explorer.inlineCancel` | Esc cancel |
| `obs.action.explorer.dnd` | Drop completado · `{ intent, source, target }` |
| `obs.action.explorer.contextMenu` | Solo verbose · `{ action }` |

### 4.4 Editor (manuscrito / entidad)

| Evento | Cuándo |
|--------|--------|
| `obs.action.editor.tabOpen` | Nueva pestaña |
| `obs.action.editor.tabClose` | Cerrar pestaña |
| `obs.action.editor.tabSwitch` | Cambio activo |
| `obs.action.editor.save` | Ctrl+S / botón · `{ scope: file\|all }` |
| `obs.action.editor.dirtyDiffToggle` | FIX-013 GitCompare |
| `obs.action.editor.sidePanelTab` | Etiquetas / tiempo / etc. |
| `obs.action.editor.insertTimeTag` | Inserción marca |
| `obs.action.editor.editTimeTag` | 010d inline edit commit |
| `obs.action.editor.eventFrameToggle` | `[+]` / `[-]` marco |
| `obs.action.editor.unsavedDialog` | `{ choice: save\|discard\|cancel }` |
| `obs.action.editor.focus` | Solo verbose |

### 4.5 Timeline

| Evento | Cuándo |
|--------|--------|
| `obs.action.timeline.filterToggle` | Filtro panel |
| `obs.action.timeline.chipClick` | Abrir documento |
| `obs.action.timeline.chipHover` | Solo verbose · enter/leave |
| `obs.action.timeline.connectorToggle` | Conectores / orden lectura |
| `obs.action.timeline.openCalendar` | Botón ir a calendario |

### 4.6 Calendario (prioridad QA 010)

| Evento | Cuándo |
|--------|--------|
| `obs.action.calendar.panel.editToggle` | Acordeón «Editar calendario» |
| `obs.action.calendar.section.toggle` | Meses / Estaciones / Años especiales / … `{ section }` |
| `obs.action.calendar.months.editMode` | Lápiz «Editar meses» on/off |
| `obs.action.calendar.month.add` | Añadir mes |
| `obs.action.calendar.month.remove` | Eliminar · `{ index, name }` |
| `obs.action.calendar.month.reorder` | DnD · `{ from, to }` |
| `obs.action.calendar.month.daysChange` | Cambio días |
| `obs.action.calendar.openMonth` | Click rejilla → detalle mes |
| `obs.action.calendar.closeMonth` | Volver vista anual |
| `obs.action.calendar.yearChange` | Cambio año visible |
| `obs.action.calendar.draft.save` | Guardar · `{ dirty, validationKey?, reconcileBaseline? }` |
| `obs.action.calendar.draft.discard` | Descartar |
| `obs.action.calendar.draft.unsavedDialog` | `{ context, choice }` |
| `obs.action.calendar.deleteCalendar` | Flujo eliminar calendario |
| `obs.action.calendar.deleteCalendar.choice` | `{ choice: restoreDefault \| leaveBlank \| cancel }` |
| `obs.action.calendar.monthDelete.dialog` | Confirmar eliminar mes · `{ choice }` |
| `obs.action.calendar.season.editMode` | Lápiz estaciones |
| `obs.action.calendar.specialYear.editMode` | Lápiz años especiales |
| `obs.action.calendar.day.select` | Día en detalle mes |
| `obs.action.calendar.month.shift` | Flechas mes detalle |
| `obs.action.calendar.topBar.yearChange` | Salto año cabecera |

### 4.7 Mapas / grafo / consistencia / WB

| Evento | Cuándo |
|--------|--------|
| `obs.action.map.open` | Entrar vista mapa · stub MAP |
| `obs.action.graph.nodeOpen` | Click nodo |
| `obs.action.consistency.issueNavigate` | Click issue |
| `obs.action.entity.open` | Tarjeta WB |

### 4.8 Diálogos globales

| Evento | Cuándo |
|--------|--------|
| `obs.action.dialog.confirm` | `{ dialogId, choice }` |
| `obs.action.dialog.dismiss` | Cancel / overlay |

### 4.9 Launcher y ajustes (antes del workspace)

| Evento | Cuándo |
|--------|--------|
| `obs.action.launcher.createOpen` | Diálogo crear proyecto |
| `obs.action.launcher.recentRemove` | Quitar reciente |
| `obs.action.settings.open` / `close` | Modal ajustes |
| `obs.action.settings.theme` / `locale` | Cambio apariencia |
| `obs.action.settings.autosave` | Toggle autoguardado |
| `obs.action.settings.closeProject` | Cerrar proyecto desde ajustes |
| `obs.action.settings.calendar` | Guardar calendario desde [`CalendarSettingsSection`](../../../../src/modules/settings/CalendarSettingsSection.tsx) — **v1** |

### 4.10 Editor — ampliación

| Evento | Cuándo |
|--------|--------|
| `obs.action.editor.saveAll` | Ctrl+Shift+S |
| `obs.action.editor.externalReload` | Diálogo recarga externa · `{ choice }` |
| `obs.action.editor.wikiLink.open` | Solo verbose |

---

## 5. Session vs verbose — regla de reparto

| Canal | Incluir | Excluir |
|-------|---------|---------|
| **session** | Navegación, toggles panel, CRUD estructural, guardar/descartar, DnD commit, diálogos con elección | Cada keystroke, scroll, hover sin cambio de estado |
| **verbose** | Focus/blur, hover timeline, context menu, resize panel (>8px), reintentos debounced, **pre-state** de acordeones locales antes de commit | Cuerpos editor, argumentos IPC completos |

Duplicar en **both** solo eventos críticos opcionales (p. ej. `draft.save` session + verbose con payload extendido).

---

## 6. Arquitectura de instrumentación

### 6.1 Estrategia (evitar 200 `onClick` sueltos)

1. **Hooks store-first** — suscribir `useWorkspaceStore`, `useFileTreeStore`, `useCalendarViewStore`, etc. y emitir en transiciones (como OBS-002).
2. **Helpers en componentes con estado local** — `CalendarEditPanel` (`monthsExpanded`, `monthsEditEnabled`) llama `actionAudit.track` en handlers existentes.
3. **Wrappers finos** — `tracePanelToggle(section, nextExpanded)` para acordeones repetidos.
4. **No** delegación global de clicks en `document` (frágil, no sabe semántica).

### 6.2 Montaje

- `useUiActionAudit()` en [`WorkspaceShell.tsx`](../../../../src/modules/layout/WorkspaceShell.tsx) junto a `useUiRenderAudit()`.
- **`useAuditBootstrap()` en [`App.tsx`](../../../../src/App.tsx)** (Fase 0) para capturar abrir proyecto y exponer menú debug en launcher.

### 6.3 Correlación

- Mismo `bootId` en bootstrap payload de las 5 rutas.
- Opcional: `actionAudit.beginSequence("calendar-edit")` para agrupar eliminar meses + guardar (campo `sequenceId` en payload).

---

## 7. Fases de implementación

### Fase 0 — Esqueleto + menú unificado (Medio)

- [x] Módulo `action-audit/` + stub release + tests Vitest
- [x] Rust: `action_logs_dir`, ampliar `SessionLogPaths`, settings ④⑤, `append_action_entry`, **`clear_all_logs`**
- [x] TS: `lib/types/audit.ts`, `audit/ipc.ts`, `useAuditStore`, `action-audit/bootstrap.ts`
- [x] **Mover** `useAuditBootstrap` (+ menú debug accesible) a `App.tsx`
- [x] Menú: **5 toggles**, **1 borrar todo**, **1 sesión única**, **1 abrir `_debug`**
- [x] Visor **5 pestañas** + tipos `AuditViewerTab`
- [x] i18n ES/EN completo
- [x] Tests Rust: clear all borra tres carpetas; settings migración; append action NDJSON
- [x] Corregir inconsistencia actual `audit_clear_logs` (regenera paths render sin vaciar disco) dentro de `clear_all_logs`

### Fase 1 — Acciones session núcleo (Medio–Alto)

Prioridad QA (orden):

1. **Workspace** — wrap `setMainView`; layout toggles; settings/versions open
2. **Proyecto** — bridge `useProjectStore` (open/close/create)
3. **Calendario** — §4.6 + §0.8 completo (EditPanel local state, DraftDialogs, store)
4. **Explorador** — bridge eventos OBS-001 existentes + select/viewMode/dnd
5. **Editor** — tabs, save, dirtyDiff toggle, unsaved dialogs
6. **Timeline** — filters, openCalendar, chipClick

> **Residual v1.1:** `editTimeTag`, `eventFrameToggle`, algunos toggles calendario secundarios del catálogo §4 — no bloquean FIX-010i.

### Fase 2 — Verbose + resto módulos (Medio)

- [x] Canal verbose §5 + §4.10
- [x] Map/graph/consistency/entity stubs
- [x] Settings + launcher §4.9
- [x] Layout resize verbose

### Fase 3 — Integración planes D (Bajo)

- [x] FIX-010i: QA §8 solo con ④; opcional ① para `reconcileBaseline` en system log
- [x] `06-ARCHITECTURE.md` matriz 4 capas observabilidad
- [x] Actualizar OBS-002 §8 menú (referencia menú unificado)
- [x] Plantilla QA agente: adjuntar `action-session-{bootId}.ndjson` obligatorio (§13)

---

## 8. Criterios de aceptación

1. Cinco toggles independientes; cinco archivos posibles con mismo `bootId`.
2. Un botón elimina todo; un toggle sesión única limpia todo en próximo arranque.
3. Recorrido calendario §4.6 en **session** produce secuencia legible sin narración manual.
4. Con solo ④ activo, verbose action file no crece.
5. Release: cero action audit en bundle/IPC.
6. Caso canónico FIX-010 §13 reproducible leyendo action log: edit → remove month → save → view editor.

---

## 9. QA manual (plantilla post-implementación)

1. Activar **④** (y opcionalmente ①②) → abrir novel 1 → calendario → editar → quitar mes → guardar → editor.
2. Adjuntar **`action-session-{bootId}.ndjson`** (obligatorio) + opcionales según toggles.
3. Verificar orden temporal y eventos `obs.action.*` §4.6.
4. Activar **⑤** → repetir → `action-verbose-*.ndjson` contiene hovers/focus/resize extra.
5. «Eliminar todo» → archivos vacíos o eliminados en `logs/`, `render-logs/`, `action-logs/`.
6. «Sesión única» → reiniciar app → logs limpios una vez.

Ver **§13** para instrucciones dirigidas a agentes Cursor.

---

## 13. Plantilla QA agente

Copiar/pegar al iniciar un hilo de depuración manual. El agente **debe** pedir o recibir el action log antes de inferir pasos del usuario.

### Entrada obligatoria

```markdown
## Sesión QA NarraLith

- **Modo:** `npm run tauri dev` (no release)
- **bootId:** `{bootId}` (del nombre de archivo o evento bootstrap)
- **Toggles activos:** ④ obligatorio · ①②③⑤ opcional según necesidad

### Archivos adjuntos

- [ ] `@_debug/action-logs/action-session-{bootId}.ndjson` **← obligatorio**
- [ ] `@_debug/logs/session-{bootId}.ndjson` (① — IPC, reconcileBaseline, duraciones)
- [ ] `@_debug/render-logs/ui-session-{bootId}.ndjson` (② — estado UI)
- [ ] `@_debug/render-logs/ui-verbose-{bootId}.ndjson` (③)
- [ ] `@_debug/action-logs/action-verbose-{bootId}.ndjson` (⑤ — focus/hover/resize)

### Resultado observado

(1–3 frases: qué falló vs qué esperabas)

### Escenario (solo si ④ no basta)

(Pasos extra no capturados en action log)
```

### Reglas para el agente

1. **No reconstruir** la secuencia de clics desde OBS-002 si existe OBS-003 ④ — priorizar `obs.action.*`.
2. Correlacionar por `ts` y mismo `bootId` entre archivos.
3. Calendario §13 / FIX-010i: buscar cadena `panel.editToggle` → `months.editMode` → `month.remove` → `draft.save` → `viewChange`.
4. Si el usuario solo adjunta `ui-session-*` sin `action-session-*`, pedir re-ejecutar con toggle ④ ON.
5. `reconcileBaseline` y profundidad IPC → canal ① (`obs.calendar.*` post-010i); no confundir con `obs.action.calendar.draft.save`.

### Ejemplo mínimo válido

Un solo archivo `@_debug/action-logs/action-session-1781394483671-9472.ndjson` + nota «eliminé Abril, guardé, chips no pasaron a rojo» es suficiente para triage calendario pre-010i.

---

## 10. Impacto en tareas D existentes

| Tarea | Cambio |
|-------|--------|
| **FIX-010i** | QA §8 usa OBS-003; eventos dominio `obs.calendar.save` opcionales en OBS-001 |
| **FIX-010e** | Wizard: log `obs.action.calendar.migration.*` |
| **VER-001** | Fuera de alcance OBS-003 v1 |

**Orden recomendado:** **OBS-003 Fase 0–1** → **FIX-010i** → 010e.

---

## 11. Referencias

- OBS-001: [`OBS-001-system-audit-log.md`](../Fase%20B/OBS-001-system-audit-log.md)
- OBS-002: [`OBS-002-ui-render-audit-log.md`](../Fase%20C/OBS-002-ui-render-audit-log.md)
- Menú actual: [`DebugNavMenu.tsx`](../../../../src/modules/debug/DebugNavMenu.tsx)
- Sesión QA problemática: `bootId` `1781391642866-21776`, `1781392144324-3928`

---

## 12. Registro

| Fecha | Nota |
|-------|------|
| 2026-06-11 | Plan inicial + menú unificado |
| 2026-06-11 | **Auditoría código v2:** §0.6–0.9; bootstrap en App; clear_all; bypass setMainView; duplicación OBS-001; catálogo §4.9–4.10; inventario archivos completo |
| 2026-06-11 | **Fases 0–3 ✅:** implementación + docs; FIX-010i desbloqueado; §13 plantilla QA agente |

---

**Última actualización:** 2026-06-11 (implementación completa)
