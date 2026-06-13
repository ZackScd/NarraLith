# FIX-010d — Editar marcas de tiempo existentes

> **Estado:** 📋 Planificado · **Esfuerzo:** Medio-alto · **Riesgo:** Medio  
> **Épica:** [FIX-010 índice](FIX-010-calendar-stale-time-chips.md) · **Depende de:** [010g](FIX-010g-calendar-baseline.md), [010a](FIX-010a-classify-red-chips.md), [010b](FIX-010b-timeline-stale-display.md), [010c](FIX-010c-calendar-entries.md) · **Decisión:** D3

---

## 1. Problema

`TimeTagDialog` + `useTimeTagDialogStore` solo soportan **inserción**. Tras poner una marca no hay flujo para seleccionarla y editarla.

En la épica FIX-010, con calendario activo ≠ baseline ([010g](FIX-010g-calendar-baseline.md)), las marcas quedan `structure_stale` (rojo) hasta reconciliación manual o wizard v2 ([010e](FIX-010e-migration-wizard.md)). **010d es la vía manual v1:** el usuario abre el chip, confirma una fecha válida en el calendario activo y la marca deja de ser obsoleta **en todas las superficies**.

### Contexto de producto (no confundir)

| Acción del usuario | ¿Quita el rojo solo? | Plan |
|--------------------|----------------------|------|
| Restaurar calendario **original** (activo ≈ baseline) | Sí | [010a](FIX-010a-classify-red-chips.md) QA A2 |
| Restaurar plantilla / base tras editar calendario | **No** — baseline no avanza | [010g](FIX-010g-calendar-baseline.md) §4 |
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

- [ ] Extender `useTimeTagDialogStore.ts` (`mode`, `editTarget`)
- [ ] `EditInlineTimeTagPlugin.tsx` — clic inline + callbacks update
- [ ] `EventTagBar.tsx` — clic barTag edit
- [ ] `TimeTagDialog.tsx` — rama save edit vs insert
- [ ] `documentSync.ts` — `$updateInlineTimeTagValue`, `$updateBarTimeTagAtIndex`
- [ ] `classifyTimeTag.ts` — opción `calendarReconciled`
- [ ] Hosts chip (`InlineTimeTagChipHost`, `EventTagBarHost`) — sync reconciled
- [ ] Tests: mutación plugin + barTags + classify reconciled

**Gate Fase 1:** abrir cualquier `.md` · editar chip inline/bar · guardar · chip editor normal. **`npm run build` verde.**

### Fase 2 — Superficies derivadas + persistencia

- [ ] `timeTagReconcile.ts` — claves editor + `timelineMarkerId`
- [ ] Store sesión `reconciledTimeTagKeys` en `useEditorStore` (seed desde YAML al open/save)
- [ ] `timelineModel.ts` / `TimelineHorizontal` / `TimeTagMiniTimeline` — pasar claves reconciliadas
- [ ] `calendarEntries.ts` / `CalendarWorkspace` — idem
- [ ] `saveManuscriptAtPath` → `useProjectTimelineStore.load()`
- [ ] Rust: `BarTag.calendar_reconciled` en serializer · `blocks.rs` index · migración **006** · IPC `TimelineEvent.calendarReconciled`
- [ ] Tests migración + markerPlacement con reconciled

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

### 8.1 Regresión obligatoria (antes de probar stale)

| # | Acción | Esperado |
|---|--------|----------|
| R0 | Abrir `.md` en explorador | Editor carga contenido (no placeholder) |
| R1 | Insertar marca nueva (flujo actual) | OK en proyecto limpio — ref. sesión `6184` |

### 8.2 Funcional edit

| # | Acción | Esperado |
|---|--------|----------|
| D1 | Clic chip inline | Diálogo edit; guardar actualiza `{{time:…}}` |
| D2 | Clic barTag | Idem `barTags` YAML |
| D3a | Marca **stale** editada a fecha válida · guardar | Chip editor normal |
| D3b | Idem · abrir timeline | Misma marca **sin rojo** |
| D3c | Idem · mini-timeline / calendario | Sin rojo |
| D3d | Idem · reiniciar app | Sigue normal (barTag persistido; inline vía re-save index) |
| D4 | Marca **valid** editada (cambio fecha) | Nueva fecha; sin duplicar marca |
| D5 | Restaurar cal base **sin** editar chips | Siguen rojos (no regresión 010g) |

### 8.3 Escenario canónico stale

1. Proyecto con marcas bajo calendario A.
2. Cambiar calendario (mes insertado o reset) → rojo en editor + timeline.
3. Clic chip stale → editar → guardar manuscrito.
4. Verificar D3a–D3d.

**Logs sugeridos:** `_debug/logs/session-*.ndjson` + `_debug/render-logs/ui-session-*.ndjson` — buscar `obs.editor.save.end` ok + `markerCount` estable + sin `obs.ipc.invoke.error` en cadena de save.

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

---

**Anterior:** [010c](FIX-010c-calendar-entries.md) · **Siguiente:** [010h](FIX-010h-calendar-draft-persist.md)
