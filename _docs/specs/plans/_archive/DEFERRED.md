# Deuda y pospuestos — Fases A–E archivadas

> **Propósito:** un solo sitio para lo **incompleto o aplazado** dentro de planes ya cerrados.  
> **No sustituye** [`../../implementation-plan.md`](../../implementation-plan.md) (MAP, WB, FIX-010e/011 activos en lista maestra).

**Convención:** ✅ código entregado · 🔄 QA/checklist sin marcar en plan · ⏸ pospuesto explícito · 📋 afinado (no bloqueó v0.10.0)

---

## 1. Pospuestos con plan listo (lista maestra)

Estos tienen fila propia en `implementation-plan.md` — detalle en el plan enlazado.

| ID | Estado | Gate / cuándo | Plan |
|----|--------|---------------|------|
| **FIX-010e** | ⏸ v2 | Calendario — wizard migración A/B/C + panel consistencia | [`Fase D/FIX-010/FIX-010e-migration-wizard.md`](Fase%20D/FIX-010/FIX-010e-migration-wizard.md) |
| **FIX-011** | ⏸ | **Post WB v2** (después de mapas + WB-004) | [`Fase D/FIX-011/FIX-011-orphan-event-entity.md`](Fase%20D/FIX-011/FIX-011-orphan-event-entity.md) |
| **VER-001** | ⬜ | Era IV — Git snapshots + diff UI | [`03-ROADMAP.md`](../../../03-ROADMAP.md) |

---

## 2. Afinado manuscrito (transversal)

**Fuente canónica:** [`../../manuscript-roadmap.md` § Afinado final](../../manuscript-roadmap.md)

| Ítem | Origen | Notas |
|------|--------|-------|
| **QA §7 residual** | [`Fase E/ERAII-002`](Fase%20E/ERAII-002-qa-manual-section7.md) | S7-01, S7-03, S7-04, S7-06, S7-08, S7-09, S7-12; FIX-004/005/012/013 recorrido manual |
| Dead code Lexical | M7 / afinado | `BlockSeparatorNode`, `BlockMetadataNode`, `BlockMetadataChips`, `resolveBlockTime.ts` |
| Tests unitarios M7 | M7 | `findLastAddedTimeInManuscript`, `metadataForLegacyBlockIndex` |
| OBS `insertTimeTag` | OBS-003 gap | Action log al insertar tiempo |
| `segmentCount` FE/Rust | M7 smoke | Desalineación en expand; saves OK |

M8 cerró con **smoke** (`5608`/`22856`); ver [`Fase E/ERAII-003`](Fase%20E/ERAII-003-close-era-ii-v0.10.0.md).

---

## 3. QA manual sin marcar en plan (código ✅)

Checklists `[ ]` en planes archivados que **no se recorrieron formalmente**; parte cubierta por smoke M7/M8/FIX-013. Revalidar solo si hay regresión.

| Plan | Sección pendiente | Prioridad afinado |
|------|-------------------|-------------------|
| [`FIX-004`](Fase%20B/FIX-004-click-empty-focus.md) | §7 escenarios 1–12 | Media |
| [`FIX-005`](Fase%20B/FIX-005-whitespace-persist.md) | §8 whitespace / Shift+Enter | Alta (solapa §7 S7-06) |
| [`FIX-006`](Fase%20B/FIX-006-event-frame-redesign.md) | §9 QA visual; checklist A–D sin `[x]` | Baja si UI estable |
| [`FIX-006.5`](Fase%20B/FIX-006.5-event-frame-interactions.md) | Revalidación FIX-006 visual | Baja |
| [`FIX-012`](Fase%20B/FIX-012-save-tab-navigation.md) | R10–R12 NDJSON + tests Vitest `[ ]` | Media (save-all) |
| [`FIX-001`](Fase%20A/FIX-001-autofill.md) | §6 QA Tauri | Baja |
| [`FIX-003`](Fase%20A/FIX-003-open-folder-os.md) | §3 QA | Baja |
| [`FIX-002`](Fase%20A/FIX-002-remove-references-panel.md) | §7 QA | Baja |
| [`OBS-001`](Fase%20B/OBS-001-system-audit-log.md) | Smoke release / 1000 entradas (opcional) | Baja |

---

## 4. Ítems diferidos dentro de entregas cerradas

| Plan | Ítem | Motivo |
|------|------|--------|
| [`FIX-010i`](Fase%20D/FIX-010/FIX-010i-calendar-structural-diff.md) | UI panel diff pre-guardado calendario | **Cancelado** — motor diff + save OK; checklist UI obsoleto |
| [`FIX-010c`](Fase%20D/FIX-010/FIX-010c-calendar-entries.md) | Badge SideTimeSection si fecha ≠ valid | Opcional v2 |
| [`FIX-010d`](Fase%20D/FIX-010/FIX-010d-edit-time-tags.md) | `obs.calendar.reset_template` audit | Opcional |
| [`FIX-010a`](Fase%20D/FIX-010/FIX-010a-classify-red-chips.md) | `calendarStructuralDiff` en 010a | Movido a 010i ✅ |
| [`FIX-008b`](Fase%20C/FIX-008b-rename-extension.md) | Atajo F2 / doble clic rename | Fase posterior |
| [`FIX-009c`](Fase%20C/FIX-009c-timeline-writing-order-hover-neighbors.md) | Cross-file hover cadena | Fuera alcance v1 |
| [`FIX-007`](Fase%20B/FIX-007-dirty-draft-persist.md) | Borrador entidad WB en sesión | Fuera alcance v1 |
| [`FIX-013`](Fase%20B/FIX-013-dirty-diff-viewer.md) | Diff entidades WB | FIX-013b / post-M7 |
| [`OBS-001`](Fase%20B/OBS-001-system-audit-log.md) | Export diagnóstico anónimo beta | Futuro opcional |

---

## 5. Cómo usar este índice

| Si quieres… | Ve a… |
|-------------|-------|
| Siguiente trabajo **prioritario** (MAP, etc.) | [`implementation-plan.md`](../../implementation-plan.md) |
| Pulir manuscrito sin feature nueva | [`manuscript-roadmap.md` § Afinado](../../manuscript-roadmap.md) |
| Evidencia / pasos de un fix cerrado | Plan concreto en `Fase */` |
| Evitar duplicar filas | **No** copies ítems ⏸/MAP/WB aquí — ya están en lista maestra |

Al cerrar un ítem diferido: marcar en plan origen + quitar o tachar fila aquí + actualizar afinado/lista maestra si aplica.

---

**Última revisión:** 2026-06-11
