# OBS-003 — Registro de acciones de usuario (action audit)

> **Estado:** 📋 Planificado (auditoría jun 2026) · **Esfuerzo:** Alto · **Riesgo:** Bajo–Medio  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md) Fase D · **Siguiente tarea D** antes de [FIX-010i](FIX-010i-calendar-structural-diff.md)  
> **Depende de:** [OBS-001](../Fase%20B/OBS-001-system-audit-log.md) ✅ · [OBS-002](../Fase%20C/OBS-002-ui-render-audit-log.md) ✅  
> **Motivación:** QA manual sin narrar pasos; reproducir bugs (010i, §13, freeze calendario) desde NDJSON.

---

## 0. Auditoría del estado actual (jun 2026)

### 0.1 Tres capas hoy — y el hueco

| Capa | ID | Qué registra | Archivo | Gap |
|------|-----|--------------|---------|-----|
| Sistema | OBS-001 | IPC, FS, editor store, watcher, proyecto | `_debug/logs/session-{bootId}.ndjson` | No sabe «abrí acordeón Meses» |
| Estado UI | OBS-002 std | Snapshots render: layout, árbol, gutter, timeline colocado | `_debug/render-logs/ui-session-*.ndjson` | Estado **resultante**, no **intención** |
| Estado UI verbose | OBS-002 verbose | Dumps grandes (vecinos escritura, árbol 500 paths) | `_debug/render-logs/ui-verbose-*.ndjson` | Idem |
| **Acciones** | **—** | **No existe** | — | **Bloqueante QA** |

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
| Instrumentación incompleta | Catálogo §4 + checklist QA por módulo |
| Duplicar OBS-002 | No loguear mismo hecho en ambos salvo `viewChange` (acción) vs `layout` (estado) |
| Migración settings | Defaults Rust rellenan campos nuevos; flags viejos clear-on-boot unificados en UI |

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

## 2. Modelo de cuatro toggles + dos acciones unificadas

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
| **Eliminar todo el registro** | Borra buffers RAM + trunca/elimina los **5** archivos de la sesión actual (y opcionalmente glob `session-*`, `ui-*`, `action-*` en sus carpetas — definir: solo bootId actual vs carpeta entera) |
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

Menú «Abrir carpeta»: opcional submenú o una carpeta `_debug/` raíz.

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

Extender `src-tauri/src/audit/` (debug only):

| Comando | Notas |
|---------|-------|
| `action_audit_bootstrap` | Crea paths ④⑤ si toggles on |
| `action_audit_append_entry` | `{ channel, entry }` |
| `audit_clear_all_logs` | **Nuevo** — system + render all + action all |
| `audit_patch_settings` | Campos `actionLogEnabled`, `actionVerboseEnabled`, buffers, clear flags |

`AuditConfigResponse` ampliado: `actionSessionLogPath`, `actionVerboseLogPath`, `actionLogsDir`.

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

Un `useUiActionAudit()` en [`WorkspaceShell.tsx`](../../../../src/modules/layout/WorkspaceShell.tsx) junto a `useUiRenderAudit()`.

### 6.3 Correlación

- Mismo `bootId` en bootstrap payload de las 5 rutas.
- Opcional: `actionAudit.beginSequence("calendar-edit")` para agrupar eliminar meses + guardar (campo `sequenceId` en payload).

---

## 7. Fases de implementación

### Fase 0 — Esqueleto + menú unificado (Medio)

- [ ] Módulo `action-audit/` + stub release
- [ ] Settings ④⑤ + paths `_debug/action-logs/`
- [ ] Rust append + bootstrap + **`audit_clear_all_logs`**
- [ ] Menú: **5 toggles**, **1 borrar todo**, **1 sesión única**
- [ ] Visor 5 pestañas
- [ ] Tests: toggles independientes; clear all; migración settings

### Fase 1 — Acciones session núcleo (Medio–Alto)

Prioridad QA (orden):

1. **Workspace** — viewChange, project open/close
2. **Calendario** — §4.6 completo session
3. **Explorador** — select, viewMode, inline create/rename, dnd
4. **Editor** — tabs, save, dirtyDiff, unsaved dialogs
5. **Timeline** — filters, openCalendar, chipClick

### Fase 2 — Verbose + resto módulos (Medio)

- [ ] Canal verbose §5
- [ ] Map/graph/consistency stubs
- [ ] Settings dialog actions

### Fase 3 — Integración planes D (Bajo)

- [ ] FIX-010i: referenciar `obs.action.calendar.*` en QA; reducir duplicación con `obs.calendar.*` dominio IPC
- [ ] `06-ARCHITECTURE.md` matriz observabilidad
- [ ] Plantilla QA: «solo activar ④ → adjuntar action-session-*.ndjson»

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

1. Activar ①②④ → abrir novel 1 → calendario → editar → quitar mes → guardar → editor.
2. Adjuntar `session-*.ndjson`, `ui-session-*.ndjson`, `action-session-*.ndjson`.
3. Verificar orden temporal y `action` names §4.6.
4. Activar ⑤ → repetir → `action-verbose-*.ndjson` contiene hovers/focus extra.
5. «Eliminar todo» → archivos vacíos o eliminados.
6. «Sesión única» → reiniciar app → logs limpios una vez.

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

**Última actualización:** 2026-06-11
