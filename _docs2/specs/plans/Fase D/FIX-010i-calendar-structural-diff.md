# FIX-010i — Diff estructural calendario (pre-guardado)

> **Estado:** 📋 Planificado · **Esfuerzo:** Medio · **Riesgo:** Bajo  
> **Épica:** [FIX-010 índice](FIX-010-calendar-stale-time-chips.md) · **Depende de:** [010g](FIX-010g-calendar-baseline.md), `calendarStructuralDiff.ts` ([010a](FIX-010a-classify-red-chips.md)), [010h](FIX-010h-calendar-draft-persist.md) ✅ · **Patrón:** [FIX-013](../Fase%20B/FIX-013-dirty-diff-viewer.md)

---

## 1. Objetivo

Toggle en panel calendario: ver cambios **estructurales** borrador vs disco antes de guardar. No reutiliza plugin Lexical de FIX-013 (calendario = formulario).

| # | Criterio |
|---|----------|
| O1 | Botón visible si `useCalendarViewStore.isDirty()` |
| O2 | Lista legible de cambios (meses, días, epoch) |
| O3 | Misma fuente `calendarStructuralDiff` que wizard [010e](FIX-010e-migration-wizard.md) |
| O4 | Sin escribir a disco al activar |
| O5 | Si `affectsTimeMarkers`: banner «N marcas pueden cambiar de mes al guardar sin migración» — enlace a [010e](FIX-010e-migration-wizard.md) cuando exista |

---

## 2. Qué reutilizar de FIX-013 / versiones

| Capa | Manuscrito | Calendario |
|------|------------|------------|
| Pre-guardado borrador vs disco | FIX-013 toggle Lexical | Toggle + diff estructural TS |
| Presentación | Amarillo inline | Tabla «+ mes entre Jun/Jul», «Mes 3: 30→28» |
| Histórico Git | `get_file_diff` + `DiffViewer` | Mismo IPC en `.narralith/calendar.json` tras **VER-001** |

Enlace opcional «Ver JSON completo» → `DiffViewer` cuando VER-001 operativo.

---

## 3. UI

- Icono `GitCompare` en toolbar calendario (`CalendarEditPanel` o cabecera vista).
- Panel colapsable: `CalendarStructuralDiff.summary` + filas de cambio.
- i18n namespace `calendarView`.

---

## 4. Implementación

- [ ] `CalendarStructuralDiffPanel.tsx` — **Nuevo**
- [ ] Integrar toggle en UI calendario
- [ ] `saveDraft`: `reconcileBaseline: !diff.affectsTimeMarkers` (hasta [010e](FIX-010e-migration-wizard.md))
- [ ] Tests `calendarStructuralDiff.test.ts` (casos compartidos con 010a)

---

## 5. Archivos

| Archivo | Cambio |
|---------|--------|
| `src/modules/calendar/CalendarStructuralDiffPanel.tsx` | **Nuevo** |
| `src/lib/calendar/calendarStructuralDiff.ts` | Compartido con 010a |
| `src/i18n/*/calendarView.json` | Cadenas diff |

---

## 6. QA

| # | Acción | Esperado |
|---|--------|----------|
| I1 | Insertar mes en borrador · toggle diff | Lista cambio estructural |
| I2 | Sin cambios | Toggle oculto o vacío |
| I3 | Guardar | Diff se re-baselinea |
| I4 | Quitar mes con marcas · toggle diff | Lista «− mes» + contador marcas afectadas · aviso O5 | Pendiente · ver [010d §13](FIX-010d-edit-time-tags.md#13-hallazgo-qa--edición-calendario-reposiciona-marcas-sesión-19672) |

---

**Anterior:** [010h](FIX-010h-calendar-draft-persist.md) ✅ · **Siguiente:** [010e](FIX-010e-migration-wizard.md)
