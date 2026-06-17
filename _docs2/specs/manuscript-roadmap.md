# Roadmap de ejecución — Manuscrito v2

> **Solo orden de trabajo** del refactor de manuscrito. Diseño en [`manuscript-design.md`](manuscript-design.md).  
> Sustituye `_docs/plan_roadmap.md` (archivo en `_docs/archive/manuscript-refactor/`) para implementación nueva.

**Convención:** ⬜ pendiente · 🔄 en curso · ✅ hecho

---

## Resumen de progreso

| Fase | Nombre | Estado |
|------|--------|--------|
| M1 | Parser Rust | ✅ |
| M2 | SQLite + wiki-links | ✅ |
| M3 | IPC + TS | ✅ |
| M4 | Lexical + panel | 🟡 hecho con deuda |
| M5 | WB + timeline downstream | ✅ |
| M6 | FS + referencias | ✅ |
| M7 | Estabilización editor (II.4) | ✅ |
| M8 | QA manual (II.5) | ⬜ |

M1–M6 corresponden al refactor ya implementado en código (antes documentado en `_docs/plan_roadmap.md` Fases 0–6). **M8** + afinado final cierran v0.10.0.

---

## M1 — Parser Rust ✅

| Entregable | Archivos |
|------------|----------|
| Tipos `ParsedManuscript` | `parser/types.rs` |
| Split `+++event` | `block_splitter.rs`, `format.rs` |
| Inline `{{…}}` | `inline_scanner.rs` |
| Serialize round-trip | `serializer.rs`, `document.rs` |

**Tests:** `cargo test parser::` (54+)

---

## M2 — SQLite ✅

| Entregable | Archivos |
|------------|----------|
| Migración v5 multi-marca | `migrations/005_*.sql` |
| Upsert markers | `db/blocks.rs` |

**Tests:** `cargo test blocks::`

---

## M3 — IPC + TypeScript ✅

| Comando | Rol |
|---------|-----|
| `read_manuscript` / `save_manuscript` | Ciclo principal |
| `create_event_at_cursor`, `close_event_at_cursor`, `insert_inline_tag` | Edición |
| `update_event_metadata` | Barra / apertura |

Tipos: `src/lib/types/manuscript.ts`, `editor.ts`

---

## M4 — Lexical + panel ✅

| Hecho | Notas |
|-------|-------|
| `EventTagBarNode`, `InlineTimeTagNode`, plugins | Store unificado en M7 |
| `commitManuscriptLabel` | Nodos legacy desregistrados (M7) |
| Panel evento/tiempo | Lee `ParsedManuscript.segments` (M7) |

**Siguiente:** M8 (+ § Afinado final antes de II.6)

---

## M5 — WB + motores ✅

| Entregable | Archivos |
|------------|----------|
| `Worldbuilding/Eventos/` | scaffold, `event.yaml` |
| Sync al guardar | `entity/sync_event.rs` |
| Timeline trayectoria | `timeline/project.rs` |
| Calendario | `lib/calendar/*` |

---

## M6 — FS + referencias ✅

| Fix | ID |
|-----|-----|
| `move_path` / `delete_path` ↔ blocks | A21, A22 |
| Gate parser solo `Manuscrito/**` | A23 |
| Convert/rename preserva `+++event` | tests en `references/`, `refactor/` |

---

## M7 — Estabilización editor ✅

> Tarea detallada: `../04-TASK.md` § II.4.1 · Cerrado 2026-06-11

1. ~~Eliminar `manuscriptToParsedDocument` del flujo activo~~
2. ~~Paneles leen `ParsedManuscript.segments`~~
3. ~~Quitar nodos legacy del registro Lexical~~
4. ~~Build + tests frontend verdes~~
5. ~~Smoke manual mínimo~~ — QA post-M7: `session-1781734162916-17440` + `session-1781734289595-24412`

**Criterio de salida:** un solo modelo en memoria; sin imports activos de `ParsedDocument` en editor manuscrito. **Cumplido.**

---

## Afinado final (post-módulos)

> **Política (jun 2026):** no bloquea M7 ni el avance MAP/WB. Ejecutar cuando el producto esté operativo de punta a punta, antes de II.6 / v0.10.0.

| Ítem | Notas |
|------|--------|
| Borrar dead code | `BlockSeparatorNode`, `BlockMetadataNode`, `BlockMetadataChips`, `resolveBlockTime.ts` |
| Tests unitarios | `findLastAddedTimeInManuscript`, helpers `metadataForLegacyBlockIndex` |
| OBS residual | `sidePanelTab`, `insertTimeTag` en action log; smoke toggle etiquetas OFF/ON |
| QA §7 residual | Diff FIX-013 en recorrido manual; ítems no cubiertos por OBS `17440`/`24412` |
| Deuda menor | `legacyBlockIndexFromSegmentIndex` sin uso; alinear log `segmentCount` FE/Rust en expand |

---

## M8 — QA manual ⬜

> Tarea detallada: `../04-TASK.md` § II.5.1

Checklist completa: `manuscript-design.md` §7.

Al cerrar → `../05-CHANGELOG.md` v0.10.0 · Era II ✅ en `../03-ROADMAP.md`

---

## Dependencias

```mermaid
flowchart TD
  M1 --> M2 --> M3 --> M4
  M4 --> M7 --> M8
  M2 --> M5
  M3 --> M6
  M5 --> M8
  M6 --> M8
```

---

## Qué no rehacer

- Parser Rust M1–M2 salvo bug demostrado en QA
- No parchear formato `+++` legacy — no hay proyectos legacy
- No abrir ubicación/mapas/Git hasta M8 cerrado

**Última sincronización:** 2026-06-06
