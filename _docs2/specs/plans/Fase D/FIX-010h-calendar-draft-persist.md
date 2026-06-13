# FIX-010h — Borrador calendario persistente (anti-crash)

> **Estado:** 📋 Planificado · **Esfuerzo:** Bajo–Medio · **Riesgo:** Bajo  
> **Épica:** [FIX-010 índice](FIX-010-calendar-stale-time-chips.md) · **Paridad:** [FIX-007](../Fase%20B/FIX-007-dirty-draft-persist.md)  
> **Decisiones producto:** jun 2026 (autor) — ver §3.2

---

## 1. Problema

`useCalendarViewStore.draft` + `savedRevision` solo en RAM. Cierre abrupto con calendario sucio → **pérdida** del borrador (manuscrito ya protegido por FIX-007).

Hoy `CalendarWorkspace` comenta «persiste al remontar la vista», pero eso es **solo sesión de app** (`calendarDraftInitializedProjectKey`); no sobrevive reinicio.

---

## 2. Objetivo

| # | Criterio |
|---|----------|
| O1 | Borrador sucio en `localStorage` por `projectRoot` |
| O2 | Restore **al abrir proyecto** cuando `useCalendarStore.config` ya cargó — **sin** exigir entrar a vista Calendario |
| O3 | Clear tras `saveDraft` OK, `discardDraft`, reset plantilla default/blank |
| O4 | Debounce 400 ms + `pagehide` / `beforeunload` (paridad FIX-007) |
| O5 | Cerrar proyecto con calendario sucio → persist silencioso; reabrir → restore (sin bloquear cierre) |
| O6 | `CalendarDraftDialogs` montado en `WorkspaceShell` (diálogo unsaved siempre disponible) |

### 2.1 Fuera de alcance

| Tema | Motivo |
|------|--------|
| Worldbuilding, mapas, entidades | Patrón global futuro; no mezclar con 010h |
| IPC / Rust | Solo frontend + `localStorage` |
| Diálogo «¿Guardar al cerrar app?» | Persistencia silenciosa (paridad FIX-007) |
| Diff calendario / migración marcas | [010i](FIX-010i-calendar-structural-diff.md) · [010e](FIX-010e-migration-wizard.md) |

---

## 3. Diseño

### 3.1 Modelo (`lastCalendarDraft.ts`)

Clave global: `narralith:calendar-draft` → mapa por `projectRoot` (misma convención que `narralith:last-manuscript-file`).

```typescript
type CalendarDraftPersisted = {
  draft: CalendarConfig;
  /** Huella del calendario **en disco** al abrir / último guardado — baseline para isDirty (≠ revisión del borrador). */
  savedRevision: string;
  savedAt: number; // Date.now() al persistir
};

type CalendarDraftMap = Record<string, CalendarDraftPersisted>;
```

- `savedRevision` = `calendarConfigRevision(diskConfig)` en el momento en que el usuario empezó la edición sucia (o tras último `saveDraft` OK).
- Dirty en RAM: `calendarConfigRevision(draft) !== savedRevision` (ya existe en `calendarRevision.ts`).

### 3.2 Decisiones producto (jun 2026)

| ID | Pregunta | Decisión |
|----|----------|----------|
| **H-D1** | ¿Cuándo restaurar desde LS? | **Al abrir proyecto**, tras `loadCalendar()` — aunque el usuario no entre a vista Calendario |
| **H-D2** | Disco cambió (`savedRevision` ≠ revisión actual de `config`) | **Descartar** borrador LS · cargar **solo disco** |
| **H-D3** | Borrador LS inválido (JSON roto, `validateCalendarDraft` falla) | **Descartar** LS · cargar disco (misma regla que H-D2) |
| **H-D4** | Diálogo unsaved solo en vista anual | **Arreglar en 010h** — mover `CalendarDraftDialogs` a `WorkspaceShell` |
| **H-D5** | Cerrar proyecto (Ajustes) con calendario sucio | **Persist silencioso** (FIX-007); **no** bloquear cierre |

### 3.3 Persistencia (`usePersistCalendarDraft`)

Montar en **`WorkspaceShell`** junto a `usePersistManuscriptTabs` — **no** en `CalendarWorkspace` (se desmonta al salir de vista Calendario).

| Comportamiento | Detalle |
|----------------|---------|
| Cuándo escribir | Solo si `useCalendarViewStore.isDirty()` |
| Cuándo borrar entrada | Tras save OK, discard, reset plantilla, o cuando deja de estar dirty |
| Debounce | 400 ms ante cambios en `draft`, `savedRevision` |
| Flush | `pagehide`, `beforeunload`, cleanup del effect (paridad FIX-007) |
| Cuota LS | `try/catch` en write; fallo silencioso (documentado) |

Suscripción sugerida:

```typescript
useCalendarViewStore.subscribe((state, prev) => {
  if (state.draft === prev.draft && state.savedRevision === prev.savedRevision) return;
  if (state.isDirty()) persistDebounced();
  else clearCalendarDraft(rootPath);
});
```

Audit opcional (debug): `obs.calendar.draft.persist` · restore (info): `obs.calendar.draft.restore`.

### 3.4 Restauración (`useRestoreCalendarDraft`)

Montar en **`WorkspaceShell`**. Disparar cuando `activeProject.rootPath` + `useCalendarStore.config` disponibles.

```text
configDisk = useCalendarStore.config
diskRevision = calendarConfigRevision(configDisk)
persisted = getCalendarDraft(projectRoot)

if (!persisted) → initFromConfig(configDisk) si aún no inicializado; fin

if persisted.savedRevision !== diskRevision → clearCalendarDraft; initFromConfig(disk); fin  // H-D2

if !validateCalendarDraft(normalize(persisted.draft)) → clearCalendarDraft; initFromConfig; fin  // H-D3

if calendarConfigRevision(persisted.draft) === diskRevision → clear stale LS; initFromConfig; fin

applyPersistedCalendarDraft(persisted)  // draft + savedRevision en store; isDirty true
markCalendarDraftInitialized(projectKey)
```

**Crítico:** ejecutar **antes** del efecto de `CalendarWorkspace` que hoy hace `initFromConfig(config)` ciego (L100–108). Opciones equivalentes:

- Hook restore en shell + flag «ya restaurado»; `CalendarWorkspace` no repite `initFromConfig`, **o**
- Extraer `ensureCalendarDraftInitialized(projectKey, config)` en store llamado desde un solo sitio.

### 3.5 Limpieza LS (O3)

| Evento | Acción |
|--------|--------|
| `saveDraft()` OK | `clearCalendarDraft(projectRoot)` |
| `discardDraft()` / `confirmDiscardUnsaved` | clear |
| `resetCalendarToDefault` / `Blank` OK | clear (disco + draft alineados) |
| Deja de estar dirty | clear en hook persist |

### 3.6 UI — `CalendarDraftDialogs`

Hoy vive en `CalendarSidePanel` → no monta con mes abierto (`CalendarMonthToolPanel`).

**010h:** renderizar `<CalendarDraftDialogs />` en `WorkspaceShell` (junto a `UnsavedChangesDialog`). Quitar duplicado del panel lateral.

---

## 4. Implementación

| # | Tarea | Archivo |
|---|-------|---------|
| 1 | get/set/clear + parse defensivo | `src/lib/calendar/lastCalendarDraft.ts` **Nuevo** |
| 2 | Tests parse, clear, revision mismatch | `src/lib/calendar/lastCalendarDraft.test.ts` **Nuevo** |
| 3 | `applyPersistedCalendarDraft` / helper restore | `useCalendarViewStore.ts` o `lastCalendarDraft.ts` |
| 4 | Debounce + lifecycle | `src/hooks/usePersistCalendarDraft.ts` **Nuevo** |
| 5 | Restore al open project | `src/hooks/useRestoreCalendarDraft.ts` **Nuevo** |
| 6 | Integrar hooks | `src/modules/layout/WorkspaceShell.tsx` |
| 7 | Evitar doble `initFromConfig` | `src/modules/calendar/CalendarWorkspace.tsx` |
| 8 | Clear LS en save/discard/reset | `useCalendarViewStore.ts` |
| 9 | Mover diálogos | `WorkspaceShell` + quitar de `CalendarSidePanel` |

Checklist:

```
[ ] lastCalendarDraft.ts + tests
[ ] usePersistCalendarDraft (WorkspaceShell)
[ ] useRestoreCalendarDraft (WorkspaceShell)
[ ] Parche CalendarWorkspace init
[ ] clear LS en save / discard / reset
[ ] CalendarDraftDialogs en WorkspaceShell
[ ] QA H1–H4
```

---

## 5. Archivos de referencia (FIX-007)

| FIX-007 | FIX-010h |
|---------|----------|
| `lastManuscriptFile.ts` | `lastCalendarDraft.ts` |
| `usePersistManuscriptTabs.ts` | `usePersistCalendarDraft.ts` |
| `useRestoreLastManuscriptFile.ts` | `useRestoreCalendarDraft.ts` |
| `calendarConfigRevision` / `isCalendarDraftDirty` | Ya en `calendarRevision.ts` |

---

## 6. QA

| # | Acción | Esperado |
|---|--------|----------|
| H1 | Editar meses sin guardar → cerrar app → reabrir | Borrador restaurado; panel edición sucio |
| H2 | Guardar calendario | Entrada LS eliminada; no restore stale |
| H3 | Descartar cambios | LS vacío; disco visible |
| H4 | Editar calendario → ir a **editor** (sin guardar) → cerrar app → reabrir → abrir calendario | Borrador OK (**H-D1** — restore fue al open project) |
| H5 | Editar → modificar `calendar.json` fuera de la app → reabrir | **Disco** gana; LS descartado (**H-D2**) |
| H6 | Mes abierto + cambios sucios → salir de vista calendario | Diálogo unsaved visible (**H-D4**) |
| H7 | Calendario sucio → cerrar proyecto (Ajustes) → reabrir | Borrador restaurado (**H-D5**) |

---

## 7. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Cuota `localStorage` | `try/catch`; ~8–15 KB/calendario típico |
| Doble init pisa LS | Restore en shell + guard en `CalendarWorkspace` |
| Tauri webview + `pagehide` | Patrón ya validado en FIX-007 |

---

## 8. Registro

| Fecha | Nota |
|-------|------|
| 2026-06-11 | Plan inicial |
| 2026-06-11 | Auditoría código + decisiones H-D1…H-D5; borrador inválido = descartar (H-D3) |

---

**Anterior:** [010d](FIX-010d-edit-time-tags.md) · **Siguiente:** [010i](FIX-010i-calendar-structural-diff.md)
