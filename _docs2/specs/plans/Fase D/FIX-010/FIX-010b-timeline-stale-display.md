# FIX-010b — Timeline: marcas obsoletas visibles (sin mover)

> **Estado:** ✅ Completado (jun 2026) · **Esfuerzo:** Medio · **Riesgo:** Medio  
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

- [x] `timelineModel.ts` — incluir invalid/stale · `resolveMarkerPlacement` (vía `markerPlacement.ts`)
- [x] `timelineGraphics.tsx` — chip SVG rojo + pin minimizado
- [x] `timelineModel.test.ts` — regresión posición X / no drop
- [x] Tooltip i18n (reutiliza keys 010a)
- [x] `TimelineHorizontal` + `TimeTagMiniTimeline` pasan `baselineConfig`
- [x] **Hotfix congelamiento:** `engine.ts` (`MAX_ABS_DAY`, avance O(1) en claves enormes) · claves sintéticas acotadas · guardas en `calendarMarkers` / `calendarEntries`

---

## 5. Archivos

| Archivo | Cambio |
|---------|--------|
| `src/modules/timeline/timelineModel.ts` | Sin drop silencioso |
| `src/modules/timeline/timelineGraphics.tsx` | Variante invalid |
| `src/modules/timeline/TimelineHorizontal.tsx` | `baselineConfig` |
| `src/lib/calendar/markerPlacement.ts` | **Nuevo** — placement compartido timeline/calendario |
| `src/lib/calendar/engine.ts` | `MAX_ABS_DAY` · sin bucle infinito en `fromAbsoluteDay` |
| `src/lib/calendar/calendarEntries.ts` | Guardas + `resolveMarkerPlacement` (base 010c) |
| `src/lib/calendar/timeTagUi.ts` | Helpers tooltip/stale compartidos |

---

## 6. QA

| # | Acción | Esperado | Resultado sesión `8852` |
|---|--------|----------|-------------------------|
| B1 | Reset calendario → abrir timeline | Marcas rojas; **misma X** que antes | ✅ `placedCount: 9`, rango `0 - 150098`, chips rojos (captura usuario) |
| B2 | `markerCount` | No baja 9→0 en silencio | ✅ `obs.ui.calendarPanel.miniTimeline` → `markerCount: 9` estable |
| B3 | Mes insertado | Posición literal o timestamp; solo rojo | ⏭️ no probado en esta sesión (calendario mínimo) |
| B4 | Timeline + calendario tras reset | Sin congelamiento | ✅ `viewChange` editor→timeline→calendar→editor sin corte de log |
| B5 | Quitar mes · guardar calendario | X estable o stale rojo explícito | ❌ v1 · X se mueve · [010d §13](FIX-010d-edit-time-tags.md#13-hallazgo-qa--edición-calendario-reposiciona-marcas-sesión-19672) · matiz §8 |

**Logs:** `_debug/render-logs/ui-session-1781343876561-8852.ndjson` · `_debug/logs/session-1781343876561-8852.ndjson`

**Nota visual:** con calendario mínimo (1 mes) y timestamps SQLite del calendario anterior, el eje puede mostrar años absolutos grandes (`138985`, `150098`); es coherente con D1 (posición X por timestamp, no re-parse).

---

## 7. Cierre

**Estado:** ✅ Cerrado (jun 2026) · Tests: `timelineModel.test.ts`, `markerPlacement.test.ts`, `calendar.test.ts` (clave mythic).

**Pendiente en 010c:** estilo rojo en filas del calendario mensual (`TimeEntryRow`) y recarga explícita post-reset en stores.

---

## 8. Matiz D1 — reset vs editar calendario

**D1** («timeline: misma posición X») se cumple cuando el parse activo **falla** o diverge fuertemente del calendario visible y `resolveMarkerPlacement` cae al **`timestamp` SQLite** (caso típico: reset a calendario mínimo — sesión `8852`).

| Escenario | Fuente de `displaySortKey` | ¿Se mueve X? |
|-----------|---------------------------|--------------|
| Reset calendario incompatible | `timestamp` SQLite (fallback) | **No** (D1 OK) |
| Editar calendario (quitar mes) · guardar | Parse activo «instant» · nuevo `absoluteDay` | **Sí** — reposicionamiento silencioso |
| `structure_stale` · baseline ≠ active | Parse activo (clasificador) | **Sí** si parse activo cambió |

**Conclusión:** 010b cerró el drop silencioso y el freeze; **no** garantiza X fija tras edición estructural del calendario. Eso requiere [010g](FIX-010g-calendar-baseline.md) (no reconciliar baseline) + [010e](FIX-010e-migration-wizard.md) o usar `absoluteDay_baseline` / timestamp como ancla explícita — fuera de alcance 010b. Hallazgo QA: [010d §13](FIX-010d-edit-time-tags.md#13-hallazgo-qa--edición-calendario-reposiciona-marcas-sesión-19672).

---

**Anterior:** [010a](FIX-010a-classify-red-chips.md) · **Siguiente:** [010c](FIX-010c-calendar-entries.md)
