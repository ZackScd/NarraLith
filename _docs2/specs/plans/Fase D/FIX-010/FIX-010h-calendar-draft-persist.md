# FIX-010h — Borrador calendario en sesión (+ diálogos unsaved)

> **Estado:** ✅ **Cerrado** (jun 2026, decisión definitiva) · **Esfuerzo:** Bajo · **Riesgo:** Bajo  
> **Épica:** [FIX-010 índice](FIX-010-calendar-stale-time-chips.md)

---

## 1. Problema

`useCalendarViewStore.draft` + `savedRevision` viven en RAM. Con mes abierto, `CalendarSidePanel` se desmonta → `CalendarDraftDialogs` no montaba y el usuario podía salir de la vista calendario **sin aviso** de cambios sin guardar.

---

## 2. Objetivo (alcance cerrado)

| # | Criterio | Estado |
|---|----------|--------|
| O1 | Borrador sucio + `isDirty()` en RAM mientras la app está abierta | ✅ |
| O2 | `saveDraft` / `discardDraft` / reset plantilla alinean draft con disco | ✅ |
| O3 | `CalendarDraftDialogs` en `WorkspaceShell` (unsaved al cambiar vista o con mes abierto) | ✅ |
| O4 | Init borrador una vez por proyecto y sesión (`initCalendarDraftForProject`) | ✅ |

### 2.1 Fuera de producto (definitivo)

| Tema | Decisión |
|------|----------|
| Persistir borrador de calendario al **reiniciar la app** | **No.** No es requisito de producto; el calendario se edita pocas veces y con guardado consciente. |
| Paridad FIX-007 (manuscrito) en calendario | **No.** FIX-007 aplica solo a manuscrito. |
| Diff estructural / migración marcas | [010i](FIX-010i-calendar-structural-diff.md) · [010e](FIX-010e-migration-wizard.md) |

---

## 3. Diseño

### 3.1 Dirty en RAM

- `savedRevision` = huella del calendario en disco al `initFromConfig`.
- Dirty: `calendarConfigRevision(draft) !== savedRevision` (`calendarRevision.ts`).

### 3.2 Init por proyecto (sesión)

`initCalendarDraftForProject(projectKey, diskConfig)` en `useCalendarViewStore`:

- Idempotente vía `calendarDraftInitializedProjectKey`.
- `initFromConfig(diskConfig)` + marcar clave.
- Invocado desde `CalendarWorkspace` cuando `config` está cargado.

### 3.3 UI

- `<CalendarDraftDialogs />` en **`WorkspaceShell`** (junto a `UnsavedChangesDialog`).
- Quitado de `CalendarSidePanel`.
- `guardCalendarNavigation` en `WorkspaceShell` al cambiar vista principal.

---

## 4. Implementación

| # | Tarea | Archivo |
|---|-------|---------|
| 1 | Init borrador sesión | `useCalendarViewStore.ts` |
| 2 | Efecto init por proyecto | `CalendarWorkspace.tsx` |
| 3 | Diálogos globales | `WorkspaceShell.tsx`, `CalendarSidePanel.tsx` |

Checklist:

```
[x] initCalendarDraftForProject
[x] CalendarWorkspace init
[x] CalendarDraftDialogs en WorkspaceShell
```

---

## 5. QA (sesión)

| # | Acción | Esperado |
|---|--------|----------|
| S1 | Editar sin guardar → cambiar a editor/timeline | Diálogo unsaved |
| S2 | Edición sucia → salir de vista calendario (p. ej. mes abierto) | Diálogo unsaved |
| S3 | Guardar / descartar | Sin diálogo en navegación posterior |

---

## 6. Riesgos aceptados

| Riesgo | Mitigación |
|--------|------------|
| Cierre de app con calendario sucio | Pérdida de borrador **aceptada**; aviso solo en sesión |
| Confusión con manuscrito (FIX-007) | Documentación; calendario requiere guardar explícito |

---

## 7. Decisiones producto (cerradas)

| ID | Decisión |
|----|----------|
| **H-D4** | Diálogos unsaved montados en `WorkspaceShell`, no solo en panel lateral. |
| **H-D6** | **No** persistir borrador de calendario entre reinicios de app — **definitivo**, no previsto en la hoja de ruta actual. |
| **H-D7** | Alcance entregado: dirty en sesión, guardar/descartar, diálogo al navegar. |

---

## 8. Registro

| Fecha | Nota |
|-------|------|
| 2026-06-11 | Plan e implementación: diálogos en shell + init sesión |
| 2026-06-11 | **Cierre definitivo:** persistencia cross-restart descartada; plan acotado a sesión; docs épica alineados |
| 2026-06-11 | **Siguiente épica:** [010i](FIX-010i-calendar-structural-diff.md) |

---

**Anterior:** [010d](FIX-010d-edit-time-tags.md) · **Siguiente:** [010i](FIX-010i-calendar-structural-diff.md)
