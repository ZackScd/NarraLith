# FIX-010d — Editar marcas de tiempo existentes

> **Estado:** ✅ Completado (jun 2026) · **Auditoría:** §11 · **Limitación conocida:** §13 (edit calendario → 010i/010e)  
> **Épica:** [FIX-010 índice](FIX-010-calendar-stale-time-chips.md) · **Depende de:** [010g](FIX-010g-calendar-baseline.md), [010a](FIX-010a-classify-red-chips.md), [010b](FIX-010b-timeline-stale-display.md), [010c](FIX-010c-calendar-entries.md) · **Decisión:** D3

---

## 1. Problema

`TimeTagDialog` + `useTimeTagDialogStore` solo soportan **inserción**. Tras poner una marca no hay flujo para seleccionarla y editarla.

En la épica FIX-010, con calendario activo ≠ baseline ([010g](FIX-010g-calendar-baseline.md)), las marcas quedan `structure_stale` (rojo) hasta reconciliación manual o wizard v2 ([010e](FIX-010e-migration-wizard.md)). **010d es la vía manual v1:** el usuario abre el chip, confirma una fecha válida en el calendario activo y la marca deja de ser obsoleta **en todas las superficies**.

### Contexto de producto (no confundir)

| Acción del usuario | ¿Quita el rojo solo? | Plan |
|--------------------|----------------------|------|
| Restaurar calendario **original** (activo ≈ baseline) | Sí | [010a](FIX-010a-classify-red-chips.md) QA A2 |
| Restaurar plantilla default/blank | Baseline **=** plantilla restaurada (§12) · marcas válidas normales | [010d §12](FIX-010d-edit-time-tags.md#12-follow-up--restaurar-plantilla-debe-reconciliar-baseline) |
| Editar chip y guardar manuscrito | Sí (v1) | **010d** |
| Wizard migración A/B/C | Sí (v2) | [010e](FIX-010e-migration-wizard.md) |

---

## 2. Objetivo

| # | Criterio |
|---|----------|
| O1 | Clic chip **inline** → `TimeTagDialog` modo `edit` |
| O2 | Clic chip **barTag** evento → mismo diálogo |
| O3 | Guardar muta Lexical / `barTags` + `save_manuscript` re-indexa SQLite |
| O4 | Panel lateral (`SideTimeSection`) **sin duplicar UX** — mismo diálogo flotante |
| O5 | Tras editar marca stale → **timeline** y **calendario** dejan de pintar rojo esa marca |
| O6 | Tras guardar + reiniciar app → la marca editada sigue normal (persistencia) |
| O7 | Editar marca **no stale** (solo cambio de fecha) → comportamiento coherente sin regresiones |

**Fuera de alcance:** metadata bloque 0 hora-only (panel lateral); migración masiva ([010e](FIX-010e-migration-wizard.md)); avance de baseline al guardar calendario con diff estructural.

---

## 3. Modelo de reconciliación (decisión de diseño)

### 3.1 Semántica

Una marca **reconciliada** es aquella que el usuario revisó manualmente tras un desajuste estructural (`structure_stale`). Tras reconciliar:

- `classifyTimeTag` debe devolver `valid` si el `rawTime` **parsea en el calendario activo**, **sin** exigir coincidencia con baseline.
- El baseline **no** avanza automáticamente (sigue siendo la referencia histórica hasta [010e](FIX-010e-migration-wizard.md)).

### 3.2 Opción elegida — flag `calendarReconciled`

| Superficie | Persistencia |
|------------|--------------|
| **barTag** | `barTags[i].calendarReconciled: true` en YAML del evento |
| **Inline** | Solo en memoria de sesión hasta save; **no** hay campo en `{{time:…}}` |
| **SQLite** | Columna `time_markers.calendar_reconciled` (migración **006**, fase 2) |

`classifyTimeTag` acepta opción `{ calendarReconciled?: boolean }`. Si `true` y parse OK en activo → `valid`.

**Alternativa descartada:** confiar solo en cambiar `rawTime` sin flag — falla cuando el usuario confirma la misma fecha literal que ya parsea en activo pero sigue stale vs baseline.

### 3.3 Pipeline completo (obligatorio para O5–O6)

```text
Clic chip → TimeTagDialog (edit) → mutar Lexical/barTags (+ calendarReconciled)
       → markDirty → save_manuscript
       → Rust re-index time_markers (raw_time + calendar_reconciled)
       → useProjectTimelineStore.load()
       → resolveMarkerPlacement / buildTimelineItems / buildCalendarTimeEntries
```

**Dos fuentes de verdad:** chips editor (Lexical + store sesión) vs timeline/calendario (SQLite vía `useProjectTimelineStore`). No basta con mutar Lexical.

---

## 4. Identidad de marcas (claves)

Tres sistemas distintos; **documentar y unificar** en un helper compartido (`timeTagReconcile.ts`):

| Capa | Formato | Uso |
|------|---------|-----|
| Editor (memoria) | `inline:{nodeKey}` · `bar:{segmentId}:{tagIndex}` | Repintar chip Lexical en sesión |
| Timeline / SQLite | `file:{path}:{blockIndex}:{segmentId}:{tagKind}:{charOffset}` | `timelineMarkerId(event)` — [010b](FIX-010b-timeline-stale-display.md) |
| YAML | `barTags[i].calendarReconciled` | Persistencia post-save |

Al marcar reconciliada en edit, registrar **ambas** claves (editor + timeline) en store de sesión hasta que SQLite confirme tras save.

**Anti-patrón (intento fallido jun 2026):** store solo con claves `bar:…` → timeline nunca deja de ser rojo aunque el chip del editor se vea bien.

---

## 5. Diseño UX

### 5.1 Store `useTimeTagDialogStore`

```typescript
mode: "insert" | "edit";
editTarget?:
  | { kind: "inline"; nodeKey: string }
  | { kind: "bar"; segmentId: string; tagIndex: number };
```

- `open({ mode: "edit", editTarget, initial, … })` — `initial` desde `timeDraftFromRawTag`.
- `SideTimeSection` sigue abriendo con `mode: "insert"` (sin cambio de flujo lateral).

### 5.2 Flujo confirmar (edit)

1. **Inline:** plugin/handler clic → `open(edit)` · guardar → `$updateInlineTimeTagValue` + `setCalendarReconciled(true)` en nodo.
2. **Bar:** `EventTagBar` clic en `TimeTagChip` → `open(edit)` · guardar → `$updateBarTimeTagAtIndex` + `calendarReconciled: true` en tag.
3. `TimeTagDialog`: rama save distinta de insert (no duplicar marca).
4. `useEditorStore`: callbacks `updateInlineTimeTag` / `updateBarTimeTag` registrados por plugin Lexical.
5. Tras mutación OK: `markDirty` → usuario guarda (o autosave) → `saveManuscriptAtPath` → **`useProjectTimelineStore.load()`**.

### 5.3 Refresh UI Lexical

Decorators (`InlineTimeTagNode`, `EventTagBarNode`) deben repintar chip tras mutar valor/reconciled (`registerUpdateListener` en hosts o `updateDOM` → `false`).

### 5.4 i18n

| Key | ES |
|-----|-----|
| `editor.timeTag.editTitle` | Editar marca de tiempo |
| (reutilizar) `editor.timeTag.structureStale` | Fecha desplazada por cambio de calendario |

---

## 6. Implementación por fases

### Fase 1 — Editor (MVP, gate obligatorio)

- [x] Extender `useTimeTagDialogStore.ts` (`mode`, `editTarget`)
- [x] `EditInlineTimeTagPlugin.tsx` — clic inline + callbacks update
- [x] `EventTagBar.tsx` — clic barTag edit
- [x] `TimeTagDialog.tsx` — rama save edit vs insert
- [x] `documentSync.ts` — `$updateInlineTimeTagValue`, `$updateBarTimeTagAtIndex`
- [x] `classifyTimeTag.ts` — opción `calendarReconciled`
- [x] Hosts chip (`InlineTimeTagChipHost`, `EventTagBarHost`) — sync reconciled
- [x] Tests: mutación plugin + barTags + classify reconciled

**Gate Fase 1:** abrir cualquier `.md` · editar chip inline/bar · guardar · chip editor normal. **`npm run build` verde.**

### Fase 2 — Superficies derivadas + persistencia

- [x] `timeTagReconcile.ts` — claves editor + `timelineMarkerId`
- [x] Store sesión `reconciledTimeTagKeys` en `useEditorStore` (seed desde YAML al open/save)
- [x] `timelineModel.ts` / `TimelineHorizontal` / `TimeTagMiniTimeline` — pasar claves reconciliadas
- [x] `calendarEntries.ts` / `CalendarWorkspace` — idem
- [x] `saveManuscriptAtPath` → `useProjectTimelineStore.load()`
- [x] Rust: `BarTag.calendar_reconciled` en serializer · `blocks.rs` index · migración **006** · IPC `TimelineEvent.calendarReconciled`
- [x] Tests migración + markerPlacement con reconciled

**Gate Fase 2:** escenario stale completo (§7 QA D3) en editor **y** timeline **y** mini-timeline **y** reinicio app.

### Fuera de este plan (no mezclar)

- Diff calendario [010i](FIX-010i-calendar-structural-diff.md)
- Borrador LS [010h](FIX-010h-calendar-draft-persist.md)
- Wizard [010e](FIX-010e-migration-wizard.md)

---

## 7. Archivos

| Archivo | Fase | Cambio |
|---------|------|--------|
| `src/stores/useTimeTagDialogStore.ts` | 1 | Modo edit |
| `src/modules/editor/plugins/EditInlineTimeTagPlugin.tsx` | 1 | **Nuevo** |
| `src/modules/editor/components/EventTagBar.tsx` | 1 | Clic edit |
| `src/modules/editor/sidePanel/TimeTagDialog.tsx` | 1 | Save edit vs insert |
| `src/lib/editor/documentSync.ts` | 1 | Update inline/bar + reconciled |
| `src/lib/calendar/classifyTimeTag.ts` | 1 | Opción `calendarReconciled` |
| `src/modules/editor/components/*ChipHost.tsx` | 1 | Refresh decorator |
| `src/lib/calendar/timeTagReconcile.ts` | 2 | **Nuevo** — claves unificadas |
| `src/stores/useEditorStore.ts` | 2 | Keys sesión + reload timeline (**no romper imports**) |
| `src/modules/timeline/timelineModel.ts` | 2 | Reconciled en placement |
| `src/modules/timeline/TimelineHorizontal.tsx` | 2 | Pasar keys |
| `src/modules/editor/sidePanel/TimeTagMiniTimeline.tsx` | 2 | Pasar keys |
| `src/lib/calendar/calendarEntries.ts` | 2 | Pasar keys |
| `src/modules/calendar/CalendarWorkspace.tsx` | 2 | Pasar keys |
| `src-tauri/src/db/blocks.rs` | 2 | Index `calendar_reconciled` |
| `src-tauri/src/timeline/project.rs` | 2 | IPC field |
| `src-tauri/src/db/migrations/006_*.sql` | 2 | Columna SQLite |
| `src/lib/types/manuscript.ts` / `timeline.ts` | 2 | Tipos TS |

---

## 8. QA

> **Cierre:** jun 2026 · Tests: `fix010d-qa.test.ts` (D3) · `npm test` 191/191 · `npm run build` OK · Rust `save_manuscript_round_trip_persists_markers` + `calendar_reset_template_reconciles_baseline` OK.

### 8.1 Regresión obligatoria (antes de probar stale)

| # | Acción | Esperado | Resultado |
|---|--------|----------|-----------|
| R0 | Abrir `.md` en explorador | Editor carga contenido (no placeholder) | ✅ regresión documentSync |
| R1 | Insertar marca nueva (flujo actual) | OK en proyecto limpio — ref. sesión `6184` | ✅ sin regresión en build |

### 8.2 Funcional edit

| # | Acción | Esperado | Resultado |
|---|--------|----------|-----------|
| D1 | Clic chip inline | Diálogo edit; guardar actualiza `{{time:…}}` | ✅ Fase 1 + tests plugin |
| D2 | Clic barTag | Idem `barTags` YAML | ✅ Fase 1 + serializer Rust |
| D3a | Marca **stale** editada a fecha válida · guardar | Chip editor normal | ✅ `fix010d-qa.test.ts` |
| D3b | Idem · abrir timeline | Misma marca **sin rojo** | ✅ `fix010d-qa.test.ts` |
| D3c | Idem · mini-timeline / calendario | Sin rojo | ✅ `fix010d-qa.test.ts` |
| D3d | Idem · reiniciar app | Sigue normal (barTag persistido) | ✅ barTag: YAML + SQLite · inline reconciliado mismo literal: **solo sesión** (§3.2) — post-reinicio timeline inline vuelve rojo hasta edit que cambie `rawTime` o barTag |
| D4 | Marca **valid** editada (cambio fecha) | Nueva fecha; sin duplicar marca | ✅ tests documentSync |
| D5 | Restaurar cal base **sin** editar chips | Siguen rojos (no regresión 010g) | ✅ §12 no toca marcas viejas sin edit |
| D6 | Restaurar plantilla default/blank | Baseline alineado · marcas nuevas normales | ✅ §12 · sesión `5836` |

### 8.3 Escenario canónico stale

1. Proyecto con marcas bajo calendario A.
2. Cambiar calendario (mes insertado o reset) → rojo en editor + timeline.
3. Clic chip stale → editar → guardar manuscrito.
4. Verificar D3a–D3d.

**Automatizado:** `src/lib/calendar/fix010d-qa.test.ts` (mes insertado + barTag reconciliado).

**Manual validado:** sesiones `5836` (§12) · `19672` (§13 limitación edit calendario, fuera alcance 010d).

**Logs sugeridos:** `_debug/logs/session-*.ndjson` + `_debug/render-logs/ui-session-*.ndjson` — buscar `obs.editor.save.end` ok + `markerCount` estable + sin `obs.ipc.invoke.error` en cadena de save.

### 8.4 Cierre del plan

**Estado:** ✅ Cerrado (jun 2026) · **Siguiente en épica:** [010h](FIX-010h-calendar-draft-persist.md)

| Entregable | Estado |
|------------|--------|
| Fase 1 edit inline/bar | ✅ |
| Fase 2 timeline/SQLite/calendario | ✅ barTag persistido · inline reconciliado en sesión |
| §12 reset plantilla + baseline | ✅ |
| §13 edit calendario reposiciona marcas | 📋 documentado → 010i/010e |
| P2 insert auto-reconcile | Fuera alcance |

---

## 9. Lecciones — intento fallido (jun 2026)

| Problema | Causa | Mitigación en este plan |
|----------|-------|-------------------------|
| Editor no abría archivos | Import accidental borrado (`manuscriptToParsedDocument`) | Gate R0 + build antes de QA stale |
| Chip OK, timeline rojo | Claves store ≠ `timelineMarkerId` | §4 + Fase 2 |
| Save OK, timeline rojo | Sin `load()` post-save; SQLite sin flag | §3.3 + migración 006 |
| Scope creep | ~30 archivos sin spec | Fases 1–2 acotadas |
| «Proyecto corrupto» | Confusión restore base vs baseline | §1 contexto producto |

Proyecto nuevo con solo inserción (sesión `9049051-6184`) funcionó en código restaurado — confirma que el fallo fue de implementación, no de datos.

---

## 10. Registro

| Fecha | Cambio |
|-------|--------|
| 2026-06-11 | Plan inicial (4 archivos, QA D1–D3) |
| 2026-06-11 | **Ampliado** tras auditoría: dependencias 010g/b/c, pipeline SQLite, claves, fases, QA D3a–d, lecciones intento fallido |
| 2026-06-11 | **§11 Auditoría profunda** — chips rojos en marcas **nuevas** tras restaurar plantilla; logs `1781351388323-21840` |
| 2026-06-11 | **§11.10 Decisiones autor** — P1 normal/no rojo · P2 insert en plan posterior · P3 reset sin romper · P4 glosario cabecera |
| 2026-06-11 | **§11.15 Evidencia disco** — baseline 11 meses / sin Febrero vs activo 12 meses; H1 confirmada |
| 2026-06-11 | **§11.16 QA OK** sesión `5836` tras alinear baseline manualmente |
| 2026-06-11 | **§12 implementado** — `reset_calendar_config` reconcilia baseline · TS sync RAM · test Rust |
| 2026-06-11 | **§8 QA cerrado** — `fix010d-qa.test.ts` D3a–d · build verde · plan ✅ cerrado |

---

## 11. Auditoría — marcas nuevas siguen rojas tras restaurar plantilla (jun 2026)

> **Origen:** QA manual + [`session-1781351388323-21840.ndjson`](../../../_debug/logs/session-1781351388323-21840.ndjson) · [`ui-session-1781351388323-21840.ndjson`](../../../_debug/render-logs/ui-session-1781351388323-21840.ndjson)  
> **Reporte:** «Crear una nueva etiqueta la continúa marcando en rojo» tras **recrear la plantilla de calendario por defecto**.  
> **Alcance de esta sección:** investigación y documentación **sin cambios de código** (decisiones de producto pendientes).

### 11.1 Resumen ejecutivo

| Conclusión | Detalle |
|------------|---------|
| **No es un bug obvio de la plantilla JSON** | `calendar.es.json` (12 meses gregorianos, Septiembre = 30 días) parsea fechas como `28.9.2028` / `30.9.2028` correctamente en calendario **activo**. |
| **Causa principal (diseño 010g)** | «Restaurar plantilla por defecto» pone `calendar.json` = fábrica pero **no** actualiza `.narralith/calendar-baseline.json`. Si el baseline quedó en una versión **editada y guardada** del calendario, `active ≠ baseline` → **todas** las marcas (incluidas las recién creadas) son `structure_stale` hasta reconciliar. |
| **Causa secundaria (gap 010d)** | FIX-010d cubre reconciliación vía **edit** manual (`calendarReconciled`). La ruta de **inserción** (`commitManuscriptLabel` → `insertInlineTagAtCursor`) **no** setea `calendarReconciled` ni registra claves de sesión. |
| **Causa terciaria (cabecera block 0)** | En la sesión auditada, la marca nueva va a **cabecera** (`segmentIndex: null`, `segmentCount: 0`). Inline en block 0 tiene peor soporte de reconciliación timeline que marcas en evento. |
| **Observabilidad** | Los logs confirman saves OK y ausencia de reload espurio; **no** registran `classifyTimeTag.status` ni `active/baseline revisionId` — el rojo no es verificable en NDJSON hoy. |

**Veredicto:** el comportamiento es **mayormente coherente con specs 010g + alcance acotado de 010d**, pero choca con la expectativa UX «acabo de crear la marca bajo el calendario que veo → debería ser verde». Eso es un **gap de producto** no resuelto en este plan.

---

### 11.2 Reconstrucción cronológica (evidencia NDJSON)

**Archivos:** 37 eventos sistema + 164 eventos UI · duración ~52 s · sin `obs.ipc.invoke.error` · sin `obs.editor.reload`.

| Hora rel. (ms) | Evento | Lectura |
|----------------|--------|---------|
| T+0 | Bootstrap audit + restore pestaña `Escena_1.md` | Sesión limpia |
| T+~7 s | `obs.editor.save.end` ok · `segmentCount: 2` en Escena_1 | Edición previa persistida |
| T+~7,3 s | `fs-changed` create Escena_1 + entidad · **sin** reload | Guard self-save ignorado (correcto) |
| T+~7,8 s | UI: mini-timeline `lastRawTime` pasa de `27.9.2028` → `28.9.2028` | Fecha bar/inline actualizada en Escena_1 |
| T+~15 s | Creación `excena 2.md` (inline create explorador) | Manuscrito vacío |
| T+~30 s | Primer save `excena 2.md` · **`segmentCount: 0`** | Solo cabecera de archivo, sin segmentos evento |
| T+~33 s | `obs.editor.label.commit` · **`segmentIndex: null`** | Marca insertada **fuera de evento** (cabecera / prosa libre) |
| T+~33 s | UI: `markerCount` mini-timeline 3 → **4** | SQLite indexó la nueva marca |
| T+~35–41 s | Saves adicionales ok · `segmentCount: 0` | Contenido sigue solo en cabecera |
| T+~42 s | Timeline hover `excena 2.md:0::inline:0` | ID estable: block **0**, inline char **0**, `segmentId` vacío |
| T+~48 s | UI: `lastRawTime` → **`30.9.2028`** | Segunda fecha en excena 2 (insert o edit panel) |
| T+~52 s | Tab switch Escena_1 ↔ excena 2 | Sin crash; gutter `markerCount: 1` en excena 2 |

**IDs timeline relevantes (UI):**

```text
file:…/Escena_1.md:2::inline:0          ← inline en evento (blockIndex 2)
file:…/excena 2.md:0::inline:0          ← inline en cabecera (blockIndex 0)
```

---

### 11.3 Cadena de clasificación (por qué el chip es rojo)

```text
TimeTagChip
  → classifyTimeTag(raw, activeConfig, baselineConfig, { calendarReconciled })
       1. Parse en activo → instant OK → candidato a verde
       2. Si calendarReconciled → valid (FIN)
       3. Si !baselineConfig → valid (FIN)
       4. Parse en baseline → absoluteDay o monthName distinto → structure_stale (ROJO)
```

Puntos de código:

| Paso | Archivo | Notas |
|------|---------|-------|
| Clasificador | `src/lib/calendar/classifyTimeTag.ts` L67–84 | `calendarReconciled` bypass baseline |
| Chip editor | `src/modules/editor/components/TimeTagChip.tsx` | Lee `baselineConfig` del store |
| Timeline/calendario | `src/lib/calendar/markerPlacement.ts` → `resolveMarkerPlacement` | Usa SQLite `calendarReconciled` + `reconciledTimeTagKeys` |
| Baseline store | `src/stores/useCalendarStore.ts` | `baselineConfig` cargado en `loadCalendar()`; **no** se refresca en reset plantilla |

---

### 11.4 Plantilla por defecto vs baseline — hipótesis del usuario

#### ¿La plantilla `calendar.es.json` está «rota»?

**No**, en el sentido de parseo:

- 12 meses × días estándar (Enero 31 … Septiembre **30** … Diciembre 31).
- Definida en `src-tauri/resources/defaults/calendar.es.json`.
- Cargada vía `CalendarConfig::default_template_for_locale()` (`src-tauri/src/fs/calendar_config.rs`).
- La UI de la sesión muestra semanas con días 28–30 de «mes 9» y salto a mes 10 — coherente con plantilla gregoriana ficticia.

#### ¿Qué hace «Restaurar plantilla de ejemplo»?

```text
CalendarDraftDialogs
  → useCalendarViewStore.resetCalendarToDefault()
  → IPC reset_calendar_config { mode: "default" }
  → save_calendar_config(root, config, reconcile_baseline: false)   // FIX-010g
  → useCalendarStore.setState({ config })   // baselineConfig en RAM NO cambia
  → useProjectTimelineStore.load()
```

Código Rust (`src-tauri/src/commands/calendar.rs` L48–49):

> FIX-010g: no avanzar baseline en reset → marcas pueden quedar stale.

#### Escenario típico que explica el reporte

```text
1. Proyecto con marcas bajo calendario A (baseline = A tras guardar calendario)
2. Usuario edita calendario estructuralmente (p. ej. inserta mes) y GUARDA
   → saveCalendar(reconcileBaseline: true por defecto)
   → baseline = calendario EDITADO (B)
3. Usuario «Restaurar plantilla por defecto»
   → active = plantilla fábrica (C)
   → baseline SIGUE siendo B  ← desincronización intencional 010g
4. Usuario crea marca nueva con fecha válida en C (p. ej. 30.9.2028)
   → parse OK en activo
   → compare vs baseline B → structure_stale → ROJO
```

Esto **no** contradice FIX-010d §1 («Restaurar plantilla / base tras editar calendario → No — baseline no avanza»). Contradice la **expectativa intuitiva** del autor.

#### Matriz de estados calendario

| Estado | active | baseline | Marca nueva (sin reconciliar) | Marca tras edit 010d |
|--------|--------|----------|-------------------------------|----------------------|
| Proyecto limpio | default | default | **Verde** | Verde |
| Editó + guardó calendario | editado | editado | Verde si fechas coinciden | Verde |
| Editó + guardó + restauró plantilla | default | **editado** | **Rojo** | Verde tras reconciliar |
| Restauró plantilla sin haber guardado edición | default | default (nunca capturó edit) | Verde | Verde |

**Acción de auditoría pendiente en disco:** inspeccionar en el proyecto de prueba `.narralith/calendar.json` vs `calendar-baseline.json` (diff de `months.length`, nombres, días). Los logs **no** incluyen esos snapshots.

---

### 11.5 Ruta de inserción vs edición (gap respecto a 010d)

FIX-010d implementa reconciliación en **edit**. La sesión auditada usa **inserción** (`obs.editor.label.commit`).

| Ruta | Entrada | ¿`calendarReconciled`? | ¿Verde si active≠baseline? |
|------|---------|------------------------|----------------------------|
| Panel tiempo → commit fuera de evento | `commitManuscriptLabel` → `insertInlineTagAtCursor` | **No** | **No** |
| Panel tiempo → commit en evento sin bar time | `appendBarTimeToActiveEvent` | **Sí** (`$appendBarTimeToSegment`) | **Sí** (editor; timeline tras save) |
| Panel tiempo → evento nuevo con barTags | `commitEventAtCursor` + `timeBarTag()` | **No** | No |
| Atajo / insert inline directo | `InsertInlineTagPlugin` | **No** | No |
| Clic chip → edit (010d) | `EditInlineTimeTagPlugin` / `TimeTagDialog` edit | **Sí** + claves sesión | Sí (si mutación OK) |

**`timeBarTag()`** (`commitManuscriptLabel.ts` L8–14) no incluye `calendarReconciled: true`.

**Implicación:** aunque 010d esté completo para **edit**, el flujo «crear marca nueva desde panel lateral» sigue sin auto-reconciliar — exactamente lo que hizo el usuario según logs (`label.commit`, no edit).

---

### 11.6 Cabecera (block 0) — agravante en `excena 2.md`

| Evidencia | Significado |
|-----------|-------------|
| `segmentCount: 0` en todos los saves de excena 2 | Manuscrito = solo `file_header.body` |
| `segmentIndex: null` en `label.commit` | Cursor fuera de tramo evento |
| Timeline id `…:0::inline:0` | blockIndex **0**, sin `segmentId` |

Comportamiento diferencial:

| Capa | Evento inline | Cabecera inline |
|------|---------------|-----------------|
| `legacyBlockIndexFromContext` | `segmentIndex + 1` | **0** |
| `InlineTimeTagChipHost` timeline keys | Lookup si `blockIndex >= 1` | **Omitido** |
| `EditInlineTimeTagPlugin` claves timeline | Registra si `blockIndex >= 1` | **Omitido** |
| SQLite `blocks.rs` `upsert_inline_time_markers_for_block` | `calendar_reconciled: false` siempre | Idem |
| Persistencia YAML reconciled | N/A inline | N/A |

FIX-010d §2 declara «metadata bloque 0 hora-only» fuera de alcance — pero la sesión muestra inline en cabecera de manuscrito vacío, caso **real** en escenas nuevas.

---

### 11.7 Superficies y coherencia post-inserción

Tras insert + save en la sesión:

| Superficie | Evidencia log | Rojo esperado si active≠baseline |
|------------|---------------|----------------------------------|
| Chip editor | No logueado | **Sí** |
| Mini-timeline | `markerCount: 4` estable | **Sí** (misma clasificación) |
| Timeline horizontal | Hover `excena 2.md:0::inline:0` | **Sí** |
| SQLite | Re-index en save ok | `calendar_reconciled = false` para inline |

No hay contradicción «editor verde / timeline rojo» en esta sesión — el problema es **clasificación baseline**, no desync de claves (síntoma de intentos fallidos anteriores).

---

### 11.8 Observabilidad — qué falta en `_debug`

| Gap | Impacto |
|-----|---------|
| Sin evento `obs.calendar.baseline.active_diff` | No se puede confirmar en NDJSON si baseline ≠ active tras reset |
| Sin `classifyTimeTag.status` en render audit | Rojo no demostrable offline |
| `obs.fs.self_save.ignore` es nivel `debug` | Guard post-save parece «sin reacción» aunque funcione |
| Sin payload de `rawTime` en `label.commit` | No se sabe la fecha exacta del primer insert (solo inferida por UI: 28.9 → 30.9.2028) |

**Recomendación futura (fuera de este doc):** evento `obs.calendar.classify` con `{ raw, status, calendarReconciled, baselineRevisionId, activeRevisionId }` en Fase OBS o FIX-010 follow-up.

---

### 11.9 Hipótesis ordenadas (para priorizar fix)

| Pri | Hipótesis | Prob. | Verificación |
|-----|-----------|-------|--------------|
| **H1** | Baseline desincronizado tras guardar edición + restaurar plantilla (010g by design) | **Muy alta** | Diff `calendar.json` vs `calendar-baseline.json` en proyecto |
| **H2** | Inserción no setea `calendarReconciled` (010d solo edit) | **Alta** | Trazar `commitManuscriptLabel` tras panel tiempo |
| **H3** | Marca en cabecera block 0 — soporte reconciliación incompleto | **Media** | Repro en manuscrito sin eventos |
| **H4** | Plantilla default corrupta / meses mal definidos | **Baja** | Validar JSON + `parseDateString` unitario |
| **H5** | `baselineConfig` stale en RAM tras reset | **Baja** | Reload app; store no muta baseline en reset pero disco tampoco |
| **H6** | Bug classify con fechas límite (día 30 mes 9) | **Muy baja** | Septiembre = 30 días en template |

---

### 11.10 Decisiones de producto (autor, jun 2026)

> **Nota terminológica:** en auditoría se usó «verde» como atajo de *válida / no stale*. En UI **no hay chip verde** — lo normal es el estilo por defecto (`ManuscriptTagChip` sin `invalid`); lo anómalo es **rojo** (`structure_stale` / `invalid`).

| ID | Pregunta | Decisión |
|----|----------|----------|
| **P1** | Tras restaurar plantilla, ¿marcas nuevas deben verse normales? | **Sí — aspecto normal**, no rojo de advertencia. No es un estado «reconciliado verde»; es «fecha válida bajo el calendario que estoy usando ahora». Crear una marca nueva no debería heredar el castigo de marcas viejas desalineadas con baseline. |
| **P2** | ¿Insert desde panel auto-reconcilia como edit? | **Fuera de 010d.** La auto-reconciliación en **inserción** debe vivir en un plan posterior (p. ej. [010e](FIX-010e-migration-wizard.md) o addendum FIX-010). **010d** sigue acotado a **edit manual** de chip existente. |
| **P3** | ¿Restaurar plantilla resetea baseline? | **Sí — §12.** Automatizar el workaround que ya validaste (§11.16): al restaurar default/blank, mismo efecto que `saveCalendar({ reconcileBaseline: true })`. |
| **P4** | ¿Inline en cabecera? | **No es un plan aparte** — ver §11.14. Es solo *dónde* quedó la marca en el `.md`. FIX-010d no necesita un «plan P4»; cuando se arregle P1/P3, debe aplicar igual en cabecera y en evento. |
| **P5** | ¿Editar calendario (quitar mes) puede reposicionar marcas en silencio? | **No — producto futuro.** Documentado en §13. Hasta [010i](FIX-010i-calendar-structural-diff.md)+[010e](FIX-010e-migration-wizard.md): limitación v1 conocida. Workaround: edit manual 010d o restaurar plantilla §12. |

**Consecuencia para código (futuro, no en esta tarea):**

1. **010d (actual):** edit manual de chip stale → deja de verse rojo.
2. **Follow-up §12:** reset plantilla reconcilia baseline → marcas válidas **normales** (P1+P3).
3. **010e / wizard:** reconciliación masiva de marcas **antiguas** tras cambio estructural de calendario.

---

### 11.14 Glosario — «inline en cabecera» (P4)

Un manuscrito `.md` no es un solo bloque de texto. Por dentro tiene:

```text
--- cabecera del archivo (prosa libre antes del primer evento)
+++ Nombre del evento
    cuerpo del evento
```

| Ubicación | Qué es en código | Ejemplo en tu sesión |
|-----------|------------------|----------------------|
| **Cabecera** | `file_header.body` · blockIndex **0** · sin `segmentId` | `excena 2.md` vacío: insertaste la marca ahí → log `segmentCount: 0`, timeline id `…:0::inline:0` |
| **Dentro de evento** | cuerpo tras `EventTagBar` · blockIndex ≥ 1 · con `segmentId` | `Escena_1.md` → `…:2::inline:0` |

No es una funcionalidad distinta para el autor — es el mismo chip `{{time:…}}` o barTag. Solo cambia **en qué tramo del archivo** cayó el cursor al insertar. En escenas nuevas sin evento abierto, el panel lateral suele escribir en **cabecera**; por eso salió en la auditoría.

**Fuera de alcance original 010d §2** («metadata bloque 0 hora-only») se refería al panel lateral de metadatos del bloque título, no a prohibir marcas en cabecera — redacción confusa; no implica un plan P4 separado.

---

### 11.11 QA propuesto post-decisión

| # | Precondición | Acción | Esperado |
|---|--------------|--------|----------|
| A1 | Baseline = active = calendario del proyecto | Insert inline nueva fecha | **Normal** (no rojo) |
| A2 | Guardar calendario editado → restaurar plantilla | Insert inline | **Normal** (decisión P1) — hoy falla |
| A3 | Idem A2 | Edit chip 010d → guardar | Normal en editor + timeline |
| A4 | Manuscrito vacío (marca en cabecera) | Insert desde panel | Igual que A2 — misma regla P1 |
| A5 | Bar time vía evento post-restore | Insert en evento | Normal; hoy bar append ya reconcilia parcialmente |

Incluir captura de `.narralith/calendar-baseline.json` revisionId en informe QA.

---

### 11.12 Impacto en fases del plan (sin implementar aún)

| Fase / ítem | Estado auditado | Notas |
|-------------|-----------------|-------|
| Fase 1 edit | Implementado en código | No cubre **insert** |
| Fase 2 timeline/SQLite | Implementado parcial | Inline block 0 sigue `calendar_reconciled: false` en Rust |
| QA R1 «proyecto limpio» | Insuficiente | No prueba post-restore-template |
| QA D3 stale | Aplica a **edit**, no insert | Escenario del usuario es **insert** post-reset |
| Dependencia 010g | **Confirmada crítica** | Reset plantilla debe reconciliar baseline (§12) — regla §4 a actualizar |
| Dependencia 010e | **Refuerzo** | Wizard sería vía masiva si muchas marcas stale |

---

### 11.13 Conclusión de auditoría

1. **Los logs no muestran fallo de save, IPC ni reload** — el sistema hace lo previsto a nivel persistencia.
2. **El rojo en marcas nuevas tras restaurar plantilla** encaja con baseline ≠ activo (010g) + insert sin reconciliar (010d acotado a edit).
3. **Expectativa del autor (P1):** marcas nuevas bajo calendario activo → **aspecto normal**, no rojo — es un **bug de producto** respecto al comportamiento actual, no un deseo de «chip verde».
4. **La plantilla por defecto no es el origen**; el desajuste baseline/activo tras restaurar plantilla sí.
5. **Decisiones P1–P4 cerradas** en §11.10 · glosario cabecera §11.14.

**Siguiente paso (histórico):** ~~implementar §12~~ ✅ · **010d cerrado** → [010h](FIX-010h-calendar-draft-persist.md)

---

### 11.15 Evidencia en disco — proyecto de prueba (autor, jun 2026)

Comparación manual `.narralith/calendar.json` (7 468 caracteres) vs `calendar-baseline.json` (8 276 caracteres). **H1 confirmada al 100%.**

#### Formato (no es un bug)

| Archivo | Forma | En código |
|---------|-------|-----------|
| `calendar.json` | Objeto `CalendarConfig` directo | `load_calendar_config()` |
| `calendar-baseline.json` | Wrapper `{ revisionId, savedAt, config: { … } }` | `CalendarBaselineFile` · `calendar_config.rs` L334+ |

Los ~800 caracteres extra del baseline incluyen metadatos + posible pretty-print distinto — **no** implica que el baseline sea «más completo».

#### Diferencias estructurales (contenido `config` vs activo)

Resumen validado (diff externo + coherente con FIX-010g):

| Área | `calendar.json` (activo) | `calendar-baseline.json` (`config`) |
|------|--------------------------|-------------------------------------|
| Meses | **12** (incl. Febrero 28 d) | **11** — **sin Febrero** |
| Mayo | 31 días | **26 días** |
| Halloween | mes 10, día **31** | mes 10, día **30** |
| Navidad | mes **12**, día 25 | mes **11**, día 25 |
| Invierno `from` | mes **12**, día 1 | mes **11**, día 1 |
| Primavera `to` | mes 5, día **31** | mes 5, día **26** |
| Verano `to` | mes 8, día **31** | mes 8, día **30** |

**Lectura:** el baseline es un snapshot de un calendario **editado estructuralmente** (mes eliminado, días recortados, eventos/estaciones desplazados). El activo coincide con la **plantilla de fábrica** restaurada (12 meses gregorianos). No es que la plantilla JSON del repo esté mal — es que **baseline quedó congelado en un experimento anterior** mientras `calendar.json` volvió al default sin actualizar baseline (`reset_calendar_config` → `reconcile_baseline: false`).

#### Por qué hasta las marcas **nuevas** salen rojas

`classifyTimeTag` parsea la misma fecha en **activo** y en **baseline** y compara `absoluteDay` (y nombre de mes). Con Febrero ausente en baseline, los índices de meses posteriores **no coinciden** con el activo → casi cualquier fecha de otoño (p. ej. `28.9.2028`, `30.9.2028` de la sesión auditada) dispara `structure_stale` aunque sea válida en el calendario visible.

```text
Usuario ve calendar.json (12 meses) → inserta 30.9.2028 → parse OK en activo
Classificador compara vs baseline (11 meses, Mayo 26…) → absoluteDay distinto → ROJO
```

Esto explica el reporte «marca nueva en rojo tras restaurar plantilla» **sin** bug en la plantilla embebida del repo.

#### Implicación para P3 (decisión autor)

Restaurar plantilla **debe** dejar activo + baseline en un estado coherente para no castigar lo recién escrito — p. ej. al restaurar plantilla de fábrica, **también** escribir baseline = esa plantilla (`reconcile_baseline: true` en ese IPC concreto), o dejar de comparar marcas creadas post-reset. Hoy el código hace lo contrario a propósito (010g comentario «marcas pueden quedar stale») — válido para marcas **viejas**, incompatible con P1.

#### Workaround manual inmediato (sin compilar)

Copiar el contenido de `calendar.json` sobre `calendar-baseline.json` **no** basta: hay que respetar el wrapper:

```json
{
  "revisionId": "<nuevo uuid o timestamp>",
  "savedAt": "<ISO-8601>",
  "config": { … pegar aquí el objeto calendar.json … }
}
```

O guardar el calendario desde la UI **con** reconciliación de baseline (flujo normal `saveCalendar` con `reconcileBaseline: true`) **después** de que activo ya sea el deseado. **El autor confirmó que esto desbloqueó QA** → ver §11.16.

---

### 11.16 QA post-fix — sesión `1781352382826-5836` (jun 2026)

Tras alinear `calendar-baseline.json` con el calendario activo (workaround §11.15), sesión de verificación **OK**.

**Logs:** [`session-1781352382826-5836.ndjson`](../../../_debug/logs/session-1781352382826-5836.ndjson) · [`ui-session-1781352382826-5836.ndjson`](../../../_debug/render-logs/ui-session-1781352382826-5836.ndjson)

| Señal | Valor | Lectura |
|-------|-------|---------|
| Bootstrap | audit ON | Normal |
| Pestañas | Escena_1 + excena 2 restauradas | Sin error open |
| Mini-timeline | `markerCount: 4` estable · rango `14.4.2020`–`30.9.2028` | Índice SQLite coherente |
| Timeline | Hover `excena 2.md:0::inline:0` · enlaces writing-order | Marca cabecera visible |
| Vistas | editor → timeline → calendario → timeline | Sin crash |
| Errores IPC | ninguno | — |

**Evidencia visual (autor):** timeline 2020–2028 con marcas en posición normal (no rojo espurio); calendario sept 2028 coherente.

**Conclusión:** el bug de «marca nueva roja tras restaurar plantilla» era **baseline desincronizado**, no clasificador ni plantilla embebida. El fix de producto es automatizar lo que el workaround manual ya validó (§12).

---

## 12. Follow-up — restaurar plantilla debe reconciliar baseline

> **Estado:** ✅ Implementado (jun 2026) · **Cierra:** P1 + P3 · **Relacionado:** [010g](FIX-010g-calendar-baseline.md) §4

### 12.1 Problema (estado actual del código)

Hoy «Restaurar plantilla de ejemplo» / «Restaurar plantilla en blanco»:

```text
CalendarDraftDialogs
  → useCalendarViewStore.resetCalendarToDefault() | resetCalendarToBlank()
  → IPC reset_calendar_config { locale, mode: "default" | "blank" }
  → save_calendar_config(root, config, reconcile_baseline: false)   // ← causa raíz
  → useCalendarStore.setState({ config })                            // baselineConfig RAM sin tocar
  → useProjectTimelineStore.load()
```

Rust (`src-tauri/src/commands/calendar.rs` L48–49) documenta explícitamente que baseline **no** avanza. Eso era coherente con 010g cuando solo importaba detectar marcas **viejas** stale; choca con P1 tras reset (§11.10).

**Síntoma:** `calendar.json` = plantilla restaurada · `calendar-baseline.json` = experimento anterior (§11.15) → `classifyTimeTag` → rojo en marcas nuevas y viejas que parsean bien en activo.

### 12.2 Comportamiento deseado

Al confirmar **Restaurar plantilla** (default o blank):

1. Escribir `calendar.json` con la plantilla elegida (sin cambio).
2. **Reconciliar baseline** = misma config (`save_calendar_baseline` con el config restaurado).
3. Actualizar store TS: `config` **y** `baselineConfig` en memoria.
4. Recargar timeline (`useProjectTimelineStore.load()` — ya existe).
5. Chips / timeline / calendario: marcas cuya fecha es **válida en el calendario restaurado** se ven **normales** (no rojo por `structure_stale` vs baseline obsoleto).

Equivalente funcional al workaround manual validado en §11.16.

### 12.3 Cambios propuestos (checklist implementación)

#### Rust

| Tarea | Archivo | Detalle |
|-------|---------|---------|
| [x] Reconciliar baseline en reset | `src-tauri/src/commands/calendar.rs` | `save_calendar_config(..., true)` |
| [x] Actualizar comentario FIX-010d | mismo | §12 |
| [x] Test | `src-tauri/src/fs/calendar_config.rs` | `calendar_reset_template_reconciles_baseline` |

**Alternativa descartada:** segundo IPC «guardar baseline» desde TS — duplica round-trip; basta un flag en Rust.

#### TypeScript

| Tarea | Archivo | Detalle |
|-------|---------|---------|
| [x] Sincronizar RAM | `src/stores/useCalendarViewStore.ts` | `baselineConfig: config` tras reset |
| [x] Paridad blank | mismo | `resetCalendarToBlank` |
| [ ] Audit (opcional) | — | `obs.calendar.reset_template` — diferido |

**Patrón a espejar:** `useCalendarStore.saveCalendar(..., { reconcileBaseline: true })` L52–64 — el reset debe producir el **mismo par** activo/baseline en disco y RAM.

#### Docs / épica

| Tarea | Archivo | Detalle |
|-------|---------|---------|
| [x] Regla 010g | [FIX-010g §4](FIX-010g-calendar-baseline.md) | Fila «Restaurar plantilla» |
| [x] Índice 010 | [FIX-010-calendar-stale-time-chips.md](FIX-010-calendar-stale-time-chips.md) | Nota reset plantilla + §13 reposicionamiento |

### 12.4 Semántica de producto (qué NO promete este fix)

| Caso | Tras §12 |
|------|----------|
| Marca cuya fecha **no parsea** en plantilla restaurada | Sigue **roja** (`invalid`) — correcto |
| Marca escrita bajo calendario **editado** (11 meses) y luego reset a 12 meses | Puede quedar **inválida** o en fecha distinta semánticamente — no migración automática (eso es [010e](FIX-010e-migration-wizard.md)) |
| Marca nueva bajo calendario visible post-reset | **Normal** (P1) — objetivo principal |
| Usuario **guarda** diff estructural sin migrar (010i/010e) | Baseline **no** avanza — regla 010g existente **sin cambio** · **v1 actual:** baseline **sí** avanza (deuda) → ver §13 |

Restaurar plantilla **≠** guardar borrador editado: es «volver al punto de partida del proyecto»; por eso **sí** debe alinear baseline.

### 12.5 QA post-implementación

| # | Pasos | Esperado |
|---|-------|----------|
| Q1 | Editar calendario (quitar mes) · guardar · restaurar plantilla default | `calendar.json` == `baseline.config` (12 meses) · diff manual vacío |
| Q2 | Tras Q1 | Insertar marca nueva · aspecto **normal** |
| Q3 | Tras Q1 | Timeline/calendario sin rojo espurio en marcas válidas (sesión tipo `5836`) |
| Q4 | Restaurar blank | Idem baseline alineado |
| Q5 | Regresión 010g | Guardar edición estructural **sin** migrar → baseline **no** avanza · marcas stale persisten |
| Q6 | Reinicio app tras Q1 | Sin regresión · baseline persiste en disco |

**Logs:** buscar `obs.calendar.reset_template` (si se añade) + `markerCount` estable en UI session NDJSON.

### 12.6 Alcance vs otros planes

| Plan | Relación |
|------|----------|
| **010d edit** | Independiente — edit manual de chip stale sigue siendo vía `calendarReconciled` |
| **010e wizard** | Sigue necesario para migrar **muchas** marcas tras cambio estructural **sin** reset plantilla |
| **Insert auto-reconcile (P2)** | **Fuera** de §12 — plan posterior |
| **§12** | Solo IPC + store de **reset plantilla** |
| **§13** | Edición estructural del calendario — reposicionamiento silencioso (conocido v1) |

---

## 13. Hallazgo QA — edición calendario reposiciona marcas (sesión `19672`)

> **Estado:** 📋 Documentado (jun 2026) · **Sin fix en v1** · **Resolución planificada:** [010i](FIX-010i-calendar-structural-diff.md) + [010e](FIX-010e-migration-wizard.md)  
> **Relacionado:** D1, D6 · **Fuera de alcance:** §12 (solo reset plantilla)

### 13.1 Síntoma (autor)

Tras **§12 OK** (restaurar plantilla ya no rompe ni pinta rojo espurio), el autor editó el calendario activo — p. ej. **eliminó Abril** — y guardó. Las marcas que estaban en abril **aparecieron en mayo conservando el mismo día numérico** (p. ej. `14.4.2020` sigue literal en disco, pero la cuadrícula/timeline las muestra en el mes que ocupa la **posición 4** del calendario nuevo). No hubo crash ni wizard de migración.

**Logs:** [`session-1781352862853-19672.ndjson`](../../../_debug/logs/session-1781352862853-19672.ndjson) · [`ui-session-1781352862853-19672.ndjson`](../../../_debug/render-logs/ui-session-1781352862853-19672.ndjson)

| Señal UI | Valor | Lectura |
|----------|-------|---------|
| Post-§12 | Sin crash · navegación editor ↔ timeline ↔ calendario | §12 validado |
| Mini-timeline | `markerCount: 4` · rango `14.4.2020`–`30.9.2028` | `rawTime` en SQLite **sin reescritura** |
| Calendario | `focusDate` sept 2028 · weekDays coherentes con config activa | Placement por **parse activo** |
| NDJSON | Sin `classifyTimeTag.status` ni diff baseline | Gap observabilidad §11.8 |

### 13.2 Mecanismo (hipótesis técnica alineada con código)

`{{time:d.m.y}}` guarda **números ordinales**, no el nombre del mes:

```text
parseDateString("14.4.2020", config)
  → month=4 se interpreta como índice months[3] en el calendario activo
  → toAbsoluteDay({ day:14, month:4, year:2020 }, config)
```

| Antes (12 meses) | Después (Abril eliminado) |
|------------------|---------------------------|
| `months[3]` = Abril | `months[3]` = **Mayo** (ex índice 4) |
| `14.4.2020` → 14 Abr | Mismo literal → **14 Mayo** en cuadrícula/timeline |

El texto `rawTime` **no cambia** en manuscrito/SQLite; solo cambia el **día absoluto** al re-parsear con la config activa. Es desplazamiento semántico **silencioso** — choca con **D6** («sin reescritura masiva silenciosa») aunque no haya batch en disco.

### 13.3 Interacción con baseline y clasificador

Hoy `saveDraft()` → `saveCalendar()` con `reconcileBaseline: true` por defecto ([`useCalendarStore.ts`](../../../../src/stores/useCalendarStore.ts) L53).

| Paso | Efecto |
|------|--------|
| Guardar calendario sin Abril | `calendar.json` y `calendar-baseline.json` **avanzan juntos** |
| `classifyTimeTag("14.4.2020", active, baseline)` | Mismo parse en ambos → `absoluteDay` igual → **`valid`** (no rojo) |
| Timeline / calendario | Usan `displaySortKey` del parse **activo** → posición X / celda **nueva** |

**Deuda vs [010g §4](FIX-010g-calendar-baseline.md):** la regla planificada «guardar con diff estructural → baseline **no** avanza hasta [010e](FIX-010e-migration-wizard.md)» **aún no está cableada** en `saveDraft`. Por eso, tras guardar una edición estructural, las marcas pueden verse **normales** aunque hayan **cambiado de mes** en la UI — peor que solo rojo: parecen correctas.

**Contraste con D1:** D1 se cumple bien en **reset** a calendario incompatible (fallback `timestamp` SQLite). Tras **editar y guardar** calendario, el parse sigue siendo «instant» → la X **sí se mueve** con el nuevo `absoluteDay`. Ver nota en [010b §8](FIX-010b-timeline-stale-display.md).

### 13.4 Expectativa de producto (autor)

| Acción | Comportamiento deseado (futuro) | v1 actual |
|--------|----------------------------------|-----------|
| Eliminar mes con marcas | Aviso + wizard [010e](FIX-010e-migration-wizard.md) (modo A/B/C) | Sin aviso; reposicionamiento silencioso |
| Mantener `rawTime` literal | Modo B: rojo + tooltip; usuario decide | Literal intacto pero **valid** si baseline avanzó |
| Preservar intervalos / mes semántico | Modo A: reescribir `rawTime` con preview | No implementado |
| Timeline sin mover X | D1 + timestamp o `absoluteDay_baseline` | Se mueve si parse activo cambia |

Decisión **P5** (jun 2026): la edición estructural del calendario **no debe** reinterpretar marcas en silencio. Hasta [010e](FIX-010e-migration-wizard.md), documentar como **limitación conocida**; el único workaround fiable es **edit manual** ([010d](FIX-010d-edit-time-tags.md)) o **restaurar plantilla** (§12) si el autor quiere deshacer el experimento.

### 13.5 QA reproducible (pendiente checklist épica)

| # | Pasos | Esperado v1 (honesto) | Esperado v2 (010e) |
|---|-------|----------------------|---------------------|
| S1 | Marca `14.4.2020` · calendario 12 meses · guardar | Chip normal · abril en cuadrícula | — |
| S2 | Editar calendario: quitar Abril · guardar | Marca aparece en **mayo** día 14 · literal `14.4.2020` · **no rojo** si baseline avanzó | Wizard + preview |
| S3 | Tras S2 · timeline | Posición X **distinta** a S1 (parse activo) | Modo A: X coherente con elección |
| S4 | Tras S2 · restaurar plantilla §12 | Baseline alineado · marca vuelve a abril semántico | — |

### 13.6 Alcance vs otros planes

| Plan | Acción documental |
|------|-------------------|
| [FIX-010 índice](FIX-010-calendar-stale-time-chips.md) | Limitación v1 + registro sesión |
| [010a §3.1](FIX-010a-classify-red-chips.md) | Escenario canónico **mes eliminado** |
| [010b §8](FIX-010b-timeline-stale-display.md) | Matiz D1 vs edit+save |
| [010c §2](FIX-010c-calendar-entries.md) | Cuadrícula sigue parse activo |
| [010g §4](FIX-010g-calendar-baseline.md) | Deuda `saveDraft` siempre reconcilia |
| [010i](FIX-010i-calendar-structural-diff.md) | Aviso pre-guardado «N marcas pueden desplazarse» |
| [010e §3.1](FIX-010e-migration-wizard.md) | Caso eliminar mes + modos A/B |

---

**Siguiente:** [010h](FIX-010h-calendar-draft-persist.md) · **Estado:** ✅ Cerrado (jun 2026)
