# FIX-010c — Calendario mensual + mini-timeline

> **Estado:** ✅ Cerrado (jun 2026) · **Esfuerzo:** Medio · **Riesgo:** Bajo  
> **Épica:** [FIX-010 índice](FIX-010-calendar-stale-time-chips.md) · **Depende de:** [010a](FIX-010a-classify-red-chips.md)

---

## 1. Objetivo

Entradas inválidas/obsoletas visibles en vista calendario y mini-timeline lateral; recarga stores tras reset calendario.

| # | Criterio |
|---|----------|
| O1 | `buildCalendarTimeEntries` no filtra invalid/stale |
| O2 | Filas con estilo error + tooltip |
| O3 | `TimeTagMiniTimeline` chips rojos |
| O4 | `useProjectTimelineStore.load()` tras reset calendario |

---

## 2. Calendario mensual

- [x] `CalendarTimeEntry.timeStatus` + helpers (`calendarEntryColor`, tooltip)
- [x] `buildStaleCalendarEntriesOutsideYear` — marcas obsoletas fuera del año visible
- [x] `TimeEntryRow` — borde/fondo destructive + tooltip
- [x] `CalendarMonthToolPanel` + `CalendarSidePanel` — sección «Marcas obsoletas»
- [x] `buildMarkedDaysForYear` — celdas rojas en mini-grid (`mark.stale`)
- [x] `CalendarMonthDetail` — pasa `baselineConfig`

> Tras reset a calendario mínimo, las marcas con timestamp antiguo suelen caer en **fuera de año** y aparecen en la sección inferior del panel lateral (no en la cuadrícula del mes actual).

---

## 3. Mini-timeline + side panel

- [x] `TimeTagMiniTimeline`: pins rojos (010b) + hover overlay destructive
- [x] `TimeTagDayEventList`: filas rojas + baseline
- [ ] `SideTimeSection`: badge opcional si última fecha ≠ valid *(diferido)*

---

## 4. Recarga post-reset

En `resetCalendarToDefault` / `Blank` (`useCalendarViewStore.ts`):

1. [x] `useProjectTimelineStore.getState().load()`
2. [x] `dataRevision++` (key en `CalendarMonthGrid` / `CalendarMonthDetail`)
3. *(Opcional)* audit — no implementado

---

## 5. Archivos

| Archivo | Cambio |
|---------|--------|
| `src/lib/calendar/calendarEntries.ts` | `timeStatus`, stale fuera de año, tests |
| `src/modules/calendar/CalendarMonthToolPanel.tsx` | Estilo fila + sección stale |
| `src/modules/calendar/CalendarStaleEntriesSection.tsx` | **Nuevo** |
| `src/modules/calendar/CalendarSidePanel.tsx` | Sección stale |
| `src/components/workspace-ui/calendar/TimeEntryRow.tsx` | Variante destructive |
| `src/lib/calendar/calendarMarkers.ts` | `mark.stale` en grid · `eventSortKey` (hotfix crash) |
| `src/modules/editor/sidePanel/TimeTagMiniTimeline.tsx` | Hover rojo |
| `src/modules/editor/sidePanel/TimeTagDayEventList.tsx` | Filas rojas |
| `src/stores/useCalendarViewStore.ts` | Recarga timeline + `dataRevision` |

---

## 6. QA

| # | Acción | Esperado | Resultado sesión `2156` |
|---|--------|----------|-------------------------|
| C1 | Vista calendario tras reset | Entradas obsoletas listadas en rojo | ✅ Año 15: sección «Marcas obsoletas (5)» + celdas rojas (Agosto 14/16) |
| C2 | Mini-timeline en diálogo tiempo | Chips stale visibles | ⏭️ no probado explícito · `markerCount: 9` estable en panel |
| C3 | Reset → timeline | Sin crash; datos refrescados | ✅ `viewChange` timeline↔calendar sin corte · sesión previa reset OK |

**Logs:** `_debug/render-logs/ui-session-1781345228544-2156.ndjson` · `_debug/logs/session-1781345228544-2156.ndjson`

**Hotfix post-QA inicial:** `calendarMarkers.ts` — `resolveTimeSortKey` eliminado por error rompía `CalendarTopBar` (pantalla blanca al abrir calendario).

---

## 7. Cierre

**Estado:** ✅ Cerrado (jun 2026) · Tests: `calendarEntries.test.ts` (3).

**Diferido:** badge `SideTimeSection` si última fecha ≠ valid.

---

**Anterior:** [010b](FIX-010b-timeline-stale-display.md) · **Siguiente:** [010d](FIX-010d-edit-time-tags.md)
