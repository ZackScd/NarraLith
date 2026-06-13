# FIX-010a — Clasificador + chips rojos (editor)

> **Estado:** 📋 Planificado · **Esfuerzo:** Medio · **Riesgo:** Medio  
> **Épica:** [FIX-010 índice](FIX-010-calendar-stale-time-chips.md) · **Depende de:** [010g](FIX-010g-calendar-baseline.md) · **Bloquea:** 010b, 010c

---

## 1. Objetivo

API central `classifyTimeTag` + chips rojos en editor (inline, barTags, tooltips i18n).

| # | Criterio |
|---|----------|
| O1 | Estados: `valid`, `invalid`, `structure_stale`, `mythic`, `unknown` |
| O2 | `TimeTagChip` usa clasificador (no solo `parseTimeTag`) |
| O3 | Tooltip *«Requiere actualización»* / *«Fecha desplazada…»* |
| O4 | Tests unitarios + regresión config A vs B |

---

## 2. API

Módulo: `src/lib/calendar/classifyTimeTag.ts`

```typescript
export type TimeTagStatus =
  | "valid" | "invalid" | "structure_stale" | "mythic" | "unknown";

export interface ClassifiedTimeTag {
  status: TimeTagStatus;
  raw: string;
  sortKey?: bigint;
  displaySortKey?: bigint;
  parts?: { day: number; month: number; year: number };
  fixedSortKey?: bigint;
}
```

### Reglas

| Condición | `status` | UI |
|-----------|----------|-----|
| Syntax null | `invalid` | Rojo |
| Día/mes fuera de rango | `invalid` | Rojo |
| Parse OK · `absoluteDay(active) === absoluteDay(baseline)` | `valid` | Normal |
| Parse OK · días absolutos difieren | `structure_stale` | Rojo |
| `mythic` / `unknown` | respectivo | Normal |

Baseline: [010g](FIX-010g-calendar-baseline.md).

Módulo compartido diff: `calendarStructuralDiff.ts` (usado también por [010i](FIX-010i-calendar-structural-diff.md), [010e](FIX-010e-migration-wizard.md)).

---

## 3. Escenario canónico — mes insertado

Calendario real + mes extra **entre junio y julio**:

| Mes nº | Antes | Después |
|--------|-------|---------|
| 1–6 | Ene–Jun | Sin cambio `absoluteDay` |
| 7 | Julio | Mes nuevo |
| 8+ | … | Desplazados |

| `rawTime` | Clasificación |
|-----------|---------------|
| `10.1.27` … `30.4.27` | **valid** |
| `15.7.27`, `15.8.27` | **structure_stale** |
| `31.6.27` (junio acortado) | **invalid** o stale según diff |

---

## 4. UI editor

| Componente | Cambio |
|------------|--------|
| `TimeTagChip.tsx` | `classifyTimeTag` + tooltip |
| `InlineTimeTagNode.tsx` | Hereda chip |
| `EventTagBar.tsx` | Hereda chip |

**Fuera de alcance:** edición chip → [010d](FIX-010d-edit-time-tags.md).

---

## 5. i18n

| Key | ES |
|-----|-----|
| `editor.timeTag.invalid` | Requiere actualización |
| `editor.timeTag.invalidDetail` | Esta fecha no es válida… ({raw}) |
| `editor.timeTag.structureStale` | Fecha desplazada por cambio de calendario |

Namespaces: `editor`.

---

## 6. Implementación

- [ ] `classifyTimeTag.ts` + `classifyTimeTag.test.ts`
- [ ] `calendarStructuralDiff.ts` + tests mes insertado
- [ ] Refactor `TimeTagChip`
- [ ] QA: reset blank → chips rojos

---

## 7. Archivos

| Archivo | Cambio |
|---------|--------|
| `src/lib/calendar/classifyTimeTag.ts` | **Nuevo** |
| `src/lib/calendar/calendarStructuralDiff.ts` | **Nuevo** |
| `src/lib/calendar/index.ts` | Export |
| `src/modules/editor/components/TimeTagChip.tsx` | Clasificación |
| `src/i18n/*/editor.json` | Cadenas |

---

## 8. QA

| # | Acción | Esperado |
|---|--------|----------|
| A1 | `{{time:31.2.27}}` válido → reset blank | Chip rojo |
| A2 | Restaurar calendario original | Chip normal |
| A3 | Mes insertado §3 | ene–jun normal; jul+ rojo |

---

**Anterior:** [010g](FIX-010g-calendar-baseline.md) · **Siguiente:** [010b](FIX-010b-timeline-stale-display.md)
