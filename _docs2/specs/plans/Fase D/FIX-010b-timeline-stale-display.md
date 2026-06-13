# FIX-010b — Timeline: marcas obsoletas visibles (sin mover)

> **Estado:** 📋 Planificado · **Esfuerzo:** Medio · **Riesgo:** Medio  
> **Épica:** [FIX-010 índice](FIX-010-calendar-stale-time-chips.md) · **Depende de:** [010a](FIX-010a-classify-red-chips.md) · **Decisión:** D1, D2

---

## 1. Objetivo

Marcas `invalid` / `structure_stale` **visibles** en timeline con **misma posición X**; solo estilo rojo. Sin carril «invalid» ni margen derecho.

| # | Criterio |
|---|----------|
| O1 | Eliminar `if (sortKey === null) continue` en `buildTimelineItems` |
| O2 | `displaySortKey` con fallback `timestamp` SQLite |
| O3 | `TimelineChip` variante destructive |
| O4 | `markerCount` estable tras reset calendario |

---

## 2. `displaySortKey`

| Prioridad | Fuente |
|-----------|--------|
| 1 | `sortKey` de `classifyTimeTag` |
| 2 | `event.timestamp` (SQLite) si parse falla |
| 3 | `fixedSortKey` mythic/unknown |
| 4 | Clave sintética por `segmentId` (solo tests; no omitir ítem) |

Layout: mismo carril `manuscript` / `below` que hoy.

---

## 3. Modelo extendido

```typescript
interface TimelineDisplayItem {
  timeStatus: TimeTagStatus;
  rawTime: string;
  displaySortKey: bigint;
  // … existentes
}
```

---

## 4. Implementación

- [ ] `timelineModel.ts` — incluir invalid/stale
- [ ] `timelineGraphics.tsx` — chip SVG rojo
- [ ] `timelineModel.test.ts` — regresión posición X
- [ ] Tooltip i18n (reutilizar keys 010a)

---

## 5. Archivos

| Archivo | Cambio |
|---------|--------|
| `src/modules/timeline/timelineModel.ts` | Sin drop silencioso |
| `src/modules/timeline/timelineGraphics.tsx` | Variante invalid |
| `src/modules/timeline/TimelineHorizontal.tsx` | Revisar layout |

---

## 6. QA

| # | Acción | Esperado |
|---|--------|----------|
| B1 | Reset calendario → abrir timeline | Marcas rojas; **misma X** que antes |
| B2 | `markerCount` | No baja 9→0 en silencio |
| B3 | Mes insertado | Posición literal o timestamp; solo rojo |

---

**Anterior:** [010a](FIX-010a-classify-red-chips.md) · **Siguiente:** [010c](FIX-010c-calendar-entries.md)
