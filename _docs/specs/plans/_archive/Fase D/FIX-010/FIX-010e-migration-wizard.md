# FIX-010e — Migración de marcas + panel consistencia (010f)

> **Estado:** ⏸️ **Pospuesto v2** (no bloquea FIX-010 v1) · **Esfuerzo:** Alto · **Riesgo:** Alto · **Fase:** v2  
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

### 3.1 Caso canónico — mes eliminado

Complemento de [010a §3.1](FIX-010a-classify-red-chips.md#31-escenario-canónico--mes-eliminado-inverso-de-3). Ejemplo validado en QA [010d §13](FIX-010d-edit-time-tags.md#13-hallazgo-qa--edición-calendario-reposiciona-marcas-sesión-19672): quitar **Abril** con marcas `14.4.2020`.

| Modo | Comportamiento |
|------|----------------|
| **A** `preserveGap` | Recalcular `rawTime` para que el **día absoluto** (intervalo entre marcas) se preserve bajo el calendario nuevo; preview «14.4.2020 → 14.5.2020» (o el mes que corresponda por nombre) |
| **B** `keepLiteral` | Mantener `14.4.2020` en disco; marcar **structure_stale** / rojo si el mes ordinal ya no es Abril semántico |
| **C** | Usuario edita chip a chip ([010d](FIX-010d-edit-time-tags.md)) |

**Disparador:** diff estructural con `affectsTimeMarkers` ([010i](FIX-010i-calendar-structural-diff.md)) — incluye «− mes Abril», no solo inserciones.

**v1 sin wizard:** el guardado actual reconcilia baseline y reposiciona en silencio — **no sustituye** este flujo.

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
| E5 | Quitar mes (Abril) con marcas · guardar | Asistente · preview desplazamiento | ❌ v1 · [010d §13](FIX-010d-edit-time-tags.md#13-hallazgo-qa--edición-calendario-reposiciona-marcas-sesión-19672) |

---

**Anterior:** [010i](FIX-010i-calendar-structural-diff.md) · **Épica:** [FIX-010 índice](FIX-010-calendar-stale-time-chips.md)
