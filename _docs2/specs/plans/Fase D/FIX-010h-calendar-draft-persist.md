# FIX-010h — Borrador calendario persistente (anti-crash)

> **Estado:** 📋 Planificado · **Esfuerzo:** Bajo–Medio · **Riesgo:** Bajo  
> **Épica:** [FIX-010 índice](FIX-010-calendar-stale-time-chips.md) · **Paridad:** [FIX-007](../Fase%20B/FIX-007-dirty-draft-persist.md)

---

## 1. Problema

`useCalendarViewStore.draft` solo en RAM. Cierre abrupto con calendario sucio → **pérdida** (manuscrito ya protegido por FIX-007).

---

## 2. Objetivo

| # | Criterio |
|---|----------|
| O1 | Borrador en `localStorage` por `projectRoot` |
| O2 | Restore al abrir proyecto / vista calendario |
| O3 | Clear tras `saveDraft` OK o `discardDraft` |
| O4 | Debounce + `pagehide` / `beforeunload` |

---

## 3. Diseño

| Pieza | Detalle |
|-------|---------|
| Clave | `narralith:calendar-draft` → mapa por proyecto |
| Payload | `{ draft: CalendarConfig, savedRevision: string, savedAt: number }` |
| Hook | `usePersistCalendarDraft` — debounce 400 ms |
| Restore | Si draft ≠ disco → `initFromConfig` + `isDirty` true |

**Fuera de alcance:** WB, mapas (patrón global — ver [010e](FIX-010e-migration-wizard.md) §5 VER-001).

---

## 4. Implementación

- [ ] `src/lib/calendar/lastCalendarDraft.ts` — get/set session (patrón `lastManuscriptFile.ts`)
- [ ] `src/hooks/usePersistCalendarDraft.ts`
- [ ] Integrar en `WorkspaceShell` o hook calendario existente
- [ ] Restore en flujo open project / enter calendar view

---

## 5. QA

| # | Acción | Esperado |
|---|--------|----------|
| H1 | Editar meses sin guardar → cerrar app → reabrir | Borrador restaurado |
| H2 | Guardar calendario | Entrada localStorage eliminada |
| H3 | Descartar cambios | Sin restore stale |

---

**Anterior:** [010d](FIX-010d-edit-time-tags.md) · **Siguiente:** [010i](FIX-010i-calendar-structural-diff.md)
