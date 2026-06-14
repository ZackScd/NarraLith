# FIX-010i — Diff estructural calendario (pre-guardado)

> **Estado:** 📋 Planificado (auditoría jun 2026) · **Esfuerzo:** Medio · **Riesgo:** Bajo–Medio  
> **Épica:** [FIX-010 índice](FIX-010-calendar-stale-time-chips.md) · **Depende de:** [010g](FIX-010g-calendar-baseline.md) ✅, [010a](FIX-010a-classify-red-chips.md) ✅, [010h](FIX-010h-calendar-draft-persist.md) ✅ · **Patrón UI:** [FIX-013](../Fase%20B/FIX-013-dirty-diff-viewer.md) · **Resuelve deuda:** [010d §13](FIX-010d-edit-time-tags.md#13-hallazgo-qa--edición-calendario-reposiciona-marcas-sesión-19672), [010g §4](FIX-010g-calendar-baseline.md)

---

## 0. Auditoría (jun 2026)

### 0.1 Qué es este plan (en una frase)

Antes de **Guardar** el calendario, el usuario ve **qué cambió de estructura** (meses, días, epoch…) entre el borrador en RAM y el `calendar.json` en disco, y un aviso si eso puede **desplazar marcas de tiempo** — sin wizard ([010e](FIX-010e-migration-wizard.md)). Además, `saveDraft` deja de avanzar baseline en silencio cuando hay diff estructural que afecta marcas.

### 0.2 Estado del código vs plan

| Pieza | Plan | Código hoy | Gap |
|-------|------|------------|-----|
| `calendarStructuralDiff.ts` | §5 | **No existe** (010a lo difirió aquí) | **Bloqueante implementación** |
| `CalendarStructuralDiffPanel.tsx` | §5 | No existe | Pendiente |
| `classifyTimeTag.ts` | Dep 010a | ✅ | Usar para contar marcas afectadas |
| `useCalendarStore.saveCalendar` | §4 | ✅ `reconcileBaseline` opcional | **No usado** desde `saveDraft` |
| `useCalendarViewStore.saveDraft` | §4 | Llama `saveCalendar(normalized)` **sin options** | Siempre `reconcileBaseline: true` → bug §13 |
| `baselineConfig` en RAM | 010g | ✅ cargado en `loadCalendar` | Input para `affectsTimeMarkers` |
| Toggle diff UI | §3 | Solo FIX-013 en `EditorSidePanel` (`GitCompare`) | Espejar en panel calendario |
| Tests escenarios §3 / §3.1 010a | §6 | Solo `classifyTimeTag.test.ts` | Faltan casos mes insertado/eliminado en diff |

### 0.3 Deuda que 010i debe cerrar (no opcional)

Hoy ([`useCalendarViewStore.saveDraft`](../../../../src/stores/useCalendarViewStore.ts) L249):

```typescript
const ok = await useCalendarStore.getState().saveCalendar(normalized);
// → reconcileBaseline: true por defecto
```

Consecuencia documentada en [010d §13](FIX-010d-edit-time-tags.md#13-hallazgo-qa--edición-calendario-reposiciona-marcas-sesión-19672): quitar Abril → marcas `14.4.*` se **muestran en mayo** con chip **normal** (baseline avanzó junto al activo).

**010i v1 corrige:** diff visible + `reconcileBaseline: false` cuando `affectsTimeMarkers` (regla [010g §4](FIX-010g-calendar-baseline.md)). **No** reescribe marcas (eso es 010e).

### 0.4 Qué NO es 010i

| Tema | Plan |
|------|------|
| Persistir borrador al reiniciar | [010h](FIX-010h-calendar-draft-persist.md) ✅ cerrado — **fuera de producto** |
| Wizard migración A/B/C | [010e](FIX-010e-migration-wizard.md) v2 |
| Diff JSON Git / `DiffViewer` | VER-001 — opcional posterior |
| Bloquear guardado | v1: aviso + baseline; usuario puede guardar igual |

### 0.5 UI — restricciones actuales

| Restricción | Impacto |
|-------------|---------|
| Edición solo en vista anual + acordeón «Editar calendario» | Toggle diff junto a acciones guardar/descartar en `CalendarSidePanel` (como FIX-013 en editor) |
| Mes abierto → `CalendarMonthToolPanel` | Sin panel edición ni footer guardar; diff **no** visible con mes abierto — QA usar vista anual |
| Ajustes → `CalendarSettingsSection` | Otro borrador local; **fuera** de 010i |

### 0.6 Observabilidad (gap pre-implementación)

No hay eventos `obs.calendar.*` en NDJSON. Al implementar, añadir (nivel `info`):

| Evento | Cuándo |
|--------|--------|
| `obs.calendar.structural_diff.open` | Toggle ON · `{ changeCount, affectsTimeMarkers, affectedMarkerCount }` |
| `obs.calendar.save.draft` | Tras guardar · `{ reconcileBaseline, affectsTimeMarkers }` |

Hasta entonces, QA 010i se apoya en UI + diff manual `calendar.json` / `calendar-baseline.json`.

---

## 1. Objetivo

Toggle en panel calendario: ver cambios **estructurales** borrador (RAM) vs **disco** (`useCalendarStore.config`) antes de guardar. No reutiliza Lexical (FIX-013).

| # | Criterio |
|---|----------|
| O1 | Botón visible si `useCalendarViewStore.isDirty()` (o panel ya abierto) |
| O2 | Lista legible: meses ±, días por mes, reorden, epoch/leap si aplica |
| O3 | Misma fuente `calendarStructuralDiff` que [010e](FIX-010e-migration-wizard.md) |
| O4 | Sin escribir a disco al activar el toggle |
| O5 | Si `affectsTimeMarkers`: banner «N marcas pueden verse distintas al guardar» (sin migración hasta 010e) |
| O6 | `saveDraft`: `reconcileBaseline: !diff.affectsTimeMarkers` (cosmético puro → puede reconciliar) |

---

## 2. Definición «estructural» vs cosmético

Comparar **`draft`** vs **`diskConfig`** (`useCalendarStore.config` — último guardado activo, no baseline).

| Cambio | ¿Estructural? | `affectsTimeMarkers` |
|--------|---------------|----------------------|
| Renombrar mes / estación / evento anual | No | No |
| Color opacidad estación | No | No |
| Insertar / eliminar / reordenar mes | **Sí** | **Sí** (ordinal `month` en `rawTime`) |
| Cambiar `days` de un mes | **Sí** | Sí si alguna marca cae fuera de rango o cambia `absoluteDay` vs baseline |
| Cambiar epoch / leap / años especiales | **Sí** | Evaluar por marcas del proyecto |
| Horas / fases del día | Depende | v1: tratar como estructural si cambia grid horario usado por marcas con hora |

**`affectsTimeMarkers`:** contar marcas del proyecto (`useProjectTimelineStore.events`) cuyo `absoluteDay` bajo **`draft`** ≠ bajo **`baselineConfig`**, o cuyo parse pasa a `invalid`. Reutilizar `parseDateString` + datos timeline (no re-leer todos los `.md` en v1).

Casos canónicos: [010a §3](FIX-010a-classify-red-chips.md#3-escenario-canónico--mes-insertado) insertar mes · [010a §3.1](FIX-010a-classify-red-chips.md#31-escenario-canónico--mes-eliminado-inverso-de-3) eliminar mes.

---

## 3. API propuesta — `calendarStructuralDiff.ts`

Módulo **nuevo** en `src/lib/calendar/` (export en `index.ts`).

```typescript
export type CalendarStructuralChangeKind =
  | "month_added"
  | "month_removed"
  | "month_reordered"
  | "month_days_changed"
  | "epoch_changed"
  | "leap_changed"
  | "special_year_changed";

export interface CalendarStructuralChange {
  kind: CalendarStructuralChangeKind;
  /** Clave i18n o label precomputado para fila UI */
  summaryKey: string;
  summaryParams?: Record<string, string | number>;
}

export interface CalendarStructuralDiffResult {
  changes: CalendarStructuralChange[];
  isStructural: boolean;
  affectsTimeMarkers: boolean;
  affectedMarkerCount: number;
  summary: string; // una línea para banner
}

export function calendarStructuralDiff(
  diskConfig: CalendarConfig,
  draftConfig: CalendarConfig,
  options?: {
    baselineConfig?: CalendarConfig | null;
    timelineRawTimes?: string[];
  },
): CalendarStructuralDiffResult;
```

Implementación: diff determinista sobre `months[]` (nombre ignorado para estructura), luego flags derivados; contador de marcas en función separada testeable.

---

## 4. UI (paridad FIX-013)

| FIX-013 (manuscrito) | FIX-010i (calendario) |
|----------------------|------------------------|
| `GitCompare` en cabecera `EditorSidePanel` | `GitCompare` en cabecera/footer `CalendarSidePanel` (junto a guardar/descartar) |
| Resaltado amarillo Lexical | Panel colapsable lista de cambios |
| `dirtyDiffVisible` en `useEditorStore` | `structuralDiffVisible` en `useCalendarViewStore` (propuesto) |
| Toggle ON si `isDirty` | Igual |

- Panel: `CalendarStructuralDiffPanel.tsx` bajo acordeón o debajo del toggle.
- Banner O5 encima del footer cuando `affectsTimeMarkers && isDirty`.
- i18n: `calendarView.structuralDiff.*`.

Enlace «Ver JSON completo» → **fuera v1** (VER-001).

---

## 5. Implementación

### Fase A — Motor (sin UI)

- [ ] `src/lib/calendar/calendarStructuralDiff.ts`
- [ ] `src/lib/calendar/calendarStructuralDiff.test.ts` — casos 010a §3, §3.1, sin cambios, solo rename
- [ ] Export en `src/lib/calendar/index.ts`

### Fase B — Guardado + store

- [ ] `saveDraft`: calcular diff(`config`, `draft`, { baselineConfig, timelineRawTimes })
- [ ] `saveCalendar(normalized, { reconcileBaseline: !diff.affectsTimeMarkers })`
- [ ] Tras OK: `savedRevision` actualizado; si no reconcilió, `baselineConfig` en RAM **sin cambio** (coherente con disco)

### Fase C — UI

- [ ] `CalendarStructuralDiffPanel.tsx`
- [ ] Toggle + estado en `useCalendarViewStore`
- [ ] Integrar en `CalendarSidePanel` (footer/header acciones)
- [ ] i18n ES/EN

### Fase D — Observabilidad (recomendado)

- [ ] Audit `obs.calendar.structural_diff.open` · `obs.calendar.save.draft`
- [ ] Dominio audit `calendar` si hace falta

### De 010a (cerrar deuda doc)

- [ ] Marcar [010a §6](FIX-010a-classify-red-chips.md) ítem `calendarStructuralDiff` como movido a 010i (no duplicar implementación)

---

## 6. Archivos

| Archivo | Cambio |
|---------|--------|
| `src/lib/calendar/calendarStructuralDiff.ts` | **Nuevo** |
| `src/lib/calendar/calendarStructuralDiff.test.ts` | **Nuevo** |
| `src/modules/calendar/CalendarStructuralDiffPanel.tsx` | **Nuevo** |
| `src/modules/calendar/CalendarSidePanel.tsx` | Toggle + panel |
| `src/stores/useCalendarViewStore.ts` | `saveDraft`, estado toggle |
| `src/i18n/*/calendarView.json` | Cadenas diff |
| `src/lib/calendar/index.ts` | Export |

---

## 7. QA

| # | Acción | Esperado |
|---|--------|----------|
| I1 | Insertar mes en borrador · toggle diff | Fila «+ mes …» · `affectsTimeMarkers` si hay marcas post-índice |
| I2 | Sin cambios estructurales (solo renombrar mes) | Toggle oculto o lista vacía · guardar reconcilia baseline |
| I3 | Guardar tras diff cosmético | Baseline = activo |
| I4 | Quitar mes con marcas · toggle diff · guardar | Lista «− mes» · banner N marcas · **baseline no avanza** · marcas pueden pasar a **rojo** (010a) |
| I5 | Tras I4 · timeline | Posición coherente con reglas 010b + baseline no reconciliado (matiz vs §13 pre-fix) |

**Repro §13:** sesión tipo `19672` — quitar Abril con marcas `14.4.*` · comparar antes/después en `_debug` (ver §8).

---

## 8. Cómo capturar logs para QA (autor → agente)

> **Post-OBS-003 ✅:** el flujo canónico usa el toggle **④ «Registro de acciones»** y adjunta **`action-session-{bootId}.ndjson`** — la secuencia UI queda en el log sin narrar pasos. Plantilla completa: [OBS-003 §13](OBS-003-action-audit-log.md#13-plantilla-qa-agente).

Solo en **`npm run tauri dev`** (release no escribe `_debug/`).

### Checklist mínimo (FIX-010i / §13 calendario)

1. Arrancar con `npm run tauri dev` desde la raíz del repo.
2. Menú **Debug** (barra global): activar **④ Registro de acciones** (obligatorio).
3. Opcional **② Registro de interfaz** — estado resultante del panel calendario / timeline.
4. Opcional **① Registro del sistema** — solo si necesitas `reconcileBaseline`, duraciones IPC o `obs.ipc.save_manuscript` (post-implementación 010i: `obs.calendar.save.draft`).
5. **Abrir el proyecto** de prueba (mismo que uses para calendario/marcas).
6. Anotar `{bootId}` del bootstrap (evento al cargar workspace o nombre de archivo).
7. **Reproducir** el escenario (editar calendario → quitar mes → guardar → editor, etc.).
8. Cerrar app o Debug → «Abrir carpeta _debug».
9. **Adjuntar en el chat** (mínimo obligatorio):
   - `@_debug/action-logs/action-session-{bootId}.ndjson`
10. **Opcional** según toggles activos:
    - `@_debug/logs/session-{bootId}.ndjson` (① — profundidad técnica / `reconcileBaseline`)
    - `@_debug/render-logs/ui-session-{bootId}.ndjson` (② — snapshots UI)
    - `@_debug/render-logs/ui-verbose-{bootId}.ndjson` (③)
    - `@_debug/action-logs/action-verbose-{bootId}.ndjson` (⑤ — focus, hover, resize)
11. Breve nota de resultado esperado vs observado (ej. «quité abril, guardé, chip siguió normal»).

### Qué buscar en NDJSON

| Fase | Canal ④ (`obs.action.*`) | Canal ① (opcional) |
|------|---------------------------|---------------------|
| **Hoy (OBS-003 ✅, pre-010i UI)** | `obs.action.calendar.panel.editToggle` → `month.remove` → `draft.save` con contexto; `viewChange` editor | Sin `obs.calendar.*` aún |
| **Post-010i** | Igual + acciones diff toggle cuando exista UI | `obs.calendar.structural_diff.open` · `obs.calendar.save.draft` con `reconcileBaseline: false` en I4 |

**Caso canónico §13:** secuencia legible en ④: expandir Editar calendario → Editar meses → eliminar Abril → Guardar → `viewChange` a editor. Ver [OBS-003 §8 criterio 6](OBS-003-action-audit-log.md#8-criterios-de-aceptación).

Nivel audit `"level": "info"` en settings es suficiente para eventos de guardado IPC.

---

## 9. Registro

| Fecha | Nota |
|-------|------|
| 2026-06-11 | Plan inicial |
| 2026-06-11 | **Auditoría:** `calendarStructuralDiff` inexistente; `saveDraft` siempre reconcilia; UI espejo FIX-013; §13 = motivación principal |
| 2026-06-11 | **§8 alineado OBS-003 ✅:** QA mínimo con toggle ④ + `action-session-*`; ① opcional para `reconcileBaseline` post-010i |

---

**Anterior:** [010h](FIX-010h-calendar-draft-persist.md) ✅ · **Siguiente:** [010e](FIX-010e-migration-wizard.md)
