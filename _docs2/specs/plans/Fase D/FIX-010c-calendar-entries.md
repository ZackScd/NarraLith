# FIX-010c — Calendario mensual + mini-timeline

> **Estado:** 📋 Planificado · **Esfuerzo:** Medio · **Riesgo:** Bajo  
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

- Flag `includeInvalid` o función dedicada.
- Entradas: `category: "invalid" | "stale"`, token `--destructive` / `--cal-invalid`.
- `CalendarMonthToolPanel` / `TimeEntryRow`: borde rojo.

---

## 3. Mini-timeline + side panel

- `TimeTagMiniTimeline`: ítems en `placedMinimized` con SVG rojo.
- `SideTimeSection`: badge opcional si última fecha ≠ valid.

---

## 4. Recarga post-reset

En `resetCalendarToDefault` / `Blank` (`useCalendarViewStore.ts`):

1. `useProjectTimelineStore.getState().load()`
2. Invalidar memo vistas (React key / store revision)
3. *(Opcional)* `audit.info("calendar", "obs.calendar.config.reset", { mode })`

---

## 5. Archivos

| Archivo | Cambio |
|---------|--------|
| `src/lib/calendar/calendarEntries.ts` | Incluir invalid |
| `src/modules/calendar/CalendarMonthToolPanel.tsx` | Estilo fila |
| `src/modules/editor/sidePanel/TimeTagMiniTimeline.tsx` | Chips rojos |
| `src/stores/useCalendarViewStore.ts` | Recarga timeline |

---

## 6. QA

| # | Acción | Esperado |
|---|--------|----------|
| C1 | Vista calendario tras reset | Entradas obsoletas listadas en rojo |
| C2 | Mini-timeline en diálogo tiempo | Chips stale visibles |
| C3 | Reset → timeline | Sin crash; datos refrescados |

---

**Anterior:** [010b](FIX-010b-timeline-stale-display.md) · **Siguiente:** [010d](FIX-010d-edit-time-tags.md)
