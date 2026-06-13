# FIX-010e — Migración de marcas + panel consistencia (010f)

> **Estado:** 📋 Planificado · **Esfuerzo:** Alto · **Riesgo:** Alto · **Fase:** v2  
> **Épica:** [FIX-010 índice](FIX-010-calendar-stale-time-chips.md) · **Depende de:** 010a–d, 010g, 010i · **Relacionado:** VER-001, FIX-011

Incluye **010f** (panel consistencia fechas) en el mismo plan.

---

## 1. Objetivo

Asistente al guardar calendario con diff estructural + re-ejecución bajo demanda. Modos A/B/C con **vista previa** antes de reescribir `rawTime` en disco.

| # | Criterio |
|---|----------|
| O1 | Disparador al guardar si `CalendarStructuralDiff.affectsTimeMarkers` |
| O2 | Disparador desde panel consistencia (010f) |
| O3 | Modo A: preservar intervalos en días absolutos |
| O4 | Modo B: literal sin reescritura (sigue rojo si stale) |
| O5 | Modo C: manual ([010d](FIX-010d-edit-time-tags.md)) |
| O6 | Cancelar = solo rojo; baseline no avanza ([010g](FIX-010g-calendar-baseline.md)) |

---

## 2. Disparadores (decisión producto)

- Asistente al **guardar** calendario con diff no trivial.
- **Panel consistencia:** listado global obsoletas + botón «Actualizar marcas» (010f).

Compartir panel con FIX-011 (huérfanos WB) en v2 épica 6.

---

## 3. Modos A / B / C

### Modo A — `preserveGap`

1. Ordenar marcas por `absoluteDay_baseline`.
2. Recalcular `absoluteDay_target` preservando Δ entre vecinos.
3. `rawTime_new = fromAbsoluteDay(target, newConfig)`.
4. Vista previa tabular → confirmar → batch reescritura manuscritos + barTags + re-index.

### Modo B — `keepLiteral`

- No cambia `rawTime`.
- Si `structure_stale` persiste → rojo + tooltip.
- Baseline puede avanzar solo con confirmación explícita.

### Modo C — Manual

- Cierra asistente; usuario edita chips o panel lateral.

**Default UI:** Modo C preseleccionado; A/B requieren checkbox «Modificaré N archivos».

---

## 4. Panel consistencia (010f)

- Entrada en `ConsistencyPanel.tsx`: regla fechas obsoletas (`invalid` + `structure_stale`).
- Contador + enlaces a documentos afectados.
- Acciones: abrir migración · ir a [010d](FIX-010d-edit-time-tags.md).

---

## 5. VER-001 (Era IV)

Historial Git **complementa** pero no sustituye [010g](FIX-010g-calendar-baseline.md):

| Necesidad | Solución |
|-----------|----------|
| Stale tras reinicio | 010g |
| Recuperar calendario antiguo | Restaurar snapshot |
| Diff histórico JSON | `get_file_diff(".narralith/calendar.json")` |
| Snapshot preventivo pre-save | Auto-snapshot si diff grande (patrón `risk.rs`) |

Reparación módulo: `git/mod.rs` + IPC — ver `implementation-plan.md` VER-001.

---

## 6. Implementación

- [ ] `migrateTimeMarkers.ts` — algoritmo modo A
- [ ] `CalendarMigrationDialog.tsx` — wizard + preview
- [ ] `ConsistencyPanel.tsx` — regla 010f
- [ ] Hook post-`saveDraft` si diff afecta marcas
- [ ] Tests migración + preview

---

## 7. i18n

| Key | ES |
|-----|-----|
| `calendar.migration.title` | Actualizar marcas de tiempo |
| `calendar.migration.modePreserveGap` | Mantener intervalos entre marcas |
| `calendar.migration.modeKeepLiteral` | Mantener fecha literal si existe |
| `calendar.migration.modeManual` | Revisar manualmente |

---

## 8. QA

| # | Acción | Esperado |
|---|--------|----------|
| E1 | Guardar con mes insertado | Asistente con preview |
| E2 | Modo A confirmado | `rawTime` reescritos; baseline avanza |
| E3 | Cancelar | Solo rojo; baseline intacto |
| E4 | Panel consistencia | Lista obsoletas; re-ejecutar migración |

---

**Anterior:** [010i](FIX-010i-calendar-structural-diff.md) · **Épica:** [FIX-010 índice](FIX-010-calendar-stale-time-chips.md)
