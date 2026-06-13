# FIX-010g — Baseline calendario en disco

> **Estado:** 📋 Planificado · **Esfuerzo:** Medio · **Riesgo:** Medio  
> **Épica:** [FIX-010 índice](FIX-010-calendar-stale-time-chips.md) · **Depende de:** — · **Bloquea:** 010a, 010i, 010e

---

## 1. Problema

`calendarConfigRevision()` (`calendarRevision.ts`) solo detecta dirty **en sesión**. Tras reinicio no hay referencia de contra qué calendario se reconciliaron las marcas → `structure_stale` no detectable.

---

## 2. Objetivo

| # | Criterio |
|---|----------|
| O1 | Archivo `.narralith/calendar-baseline.json` por proyecto |
| O2 | Cargado junto a `calendar.json` en `useCalendarStore.loadCalendar()` |
| O3 | Reglas de actualización del baseline al guardar / migrar |
| O4 | Legacy: si falta baseline → copiar config activa al primer open |
| O5 | Tests: insertar mes → reinicio app → stale persiste |

---

## 3. Modelo

Paridad conceptual con FIX-007:

| Manuscrito | Calendario |
|------------|------------|
| Disco guardado | `.narralith/calendar.json` activo |
| Baseline reconciliación | `.narralith/calendar-baseline.json` |
| Borrador crash | [010h](FIX-010h-calendar-draft-persist.md) |

```typescript
type CalendarBaselineFile = {
  revisionId: string;
  savedAt: string; // ISO-8601
  config: CalendarConfig;
};
```

Distinto de `CalendarConfig.version` (esquema JSON, hoy `1`).

---

## 4. Reglas de actualización

| Evento | Baseline |
|--------|----------|
| Primer open sin archivo | Copiar `calendar.json` |
| Guardar sin diff estructural | = config nueva |
| Guardar con diff estructural | **No** avanza hasta migración ([010e](FIX-010e-migration-wizard.md)) |
| Migración modo A confirmada | = config activa |
| Restaurar snapshot Git (VER-001) | Coherente con snapshot |

---

## 5. Implementación

### Rust (`calendar_config.rs`)

- `load_calendar_baseline` / `save_calendar_baseline`
- En `set_calendar_config`: opción `reconcile_baseline: bool` o IPC que devuelve `previous` config
- Ruta: `{project}/.narralith/calendar-baseline.json`

### TS

- `src/lib/calendar/calendarBaseline.ts` — helpers load/save vía IPC
- `useCalendarStore`: `baselineConfig` en estado junto a `config`

### Clasificador ([010a](FIX-010a-classify-red-chips.md))

```typescript
classifyTimeTag(raw, activeConfig, baselineConfig)
// structure_stale: parsea ambos y toAbsoluteDay(active) !== toAbsoluteDay(baseline)
```

---

## 6. Archivos

| Archivo | Cambio |
|---------|--------|
| `src-tauri/src/fs/calendar_config.rs` | Baseline read/write |
| `src-tauri/src/commands/calendar.rs` | IPC baseline |
| `src/lib/calendar/calendarBaseline.ts` | **Nuevo** |
| `src/stores/useCalendarStore.ts` | Cargar baseline |

---

## 7. QA

| # | Acción | Esperado |
|---|--------|----------|
| G1 | Insertar mes · guardar · reiniciar app | Marcas stale siguen rojas |
| G2 | Proyecto legacy sin baseline | Se crea al abrir; sin stale hasta próximo cambio |
| G3 | Migración A confirmada | Baseline = calendario activo; rojos resueltos |

---

**Siguiente:** [FIX-010a](FIX-010a-classify-red-chips.md)
