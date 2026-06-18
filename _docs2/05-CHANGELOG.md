# Registro de cambios — NarraLith

Historial de implementaciones **cerradas**. Las tareas completadas se trasladan desde `04-TASK.md`.

---

## Próxima versión

### v0.11.x — Era III: Espacio (planificada)

Mapas re-hechos + ubicación inline. Ver [`03-ROADMAP.md`](03-ROADMAP.md) Era III · [`specs/maps-design.md`](specs/maps-design.md).

---

### v0.10.0 — Era II: Manuscrito v2 ✅

**Fecha de cierre documental:** 2026-06-11

**Objetivo cumplido:** Editor de manuscrito operativo con formato por eventos (`+++event` / `+++end-event`), tiempo opt-in multi-marca, sync transparente con `Worldbuilding/Eventos/`, un solo modelo `ParsedManuscript` en RAM.

#### Entregables principales

| Área | Qué |
|------|-----|
| **Parser Rust** | `ParsedManuscript`, split eventos, inline `{{time:…}}`, round-trip serializer |
| **SQLite v5** | `time_markers` multi-marca por segmento |
| **IPC** | `read_manuscript` / `save_manuscript`, mutaciones evento/inline |
| **Editor Lexical** | `EventTagBar`, marco overlay, `[-]`/`[+]`, chips tiempo, panel lateral |
| **Estabilización (M7)** | Store solo `ParsedManuscript`; adaptador legacy fuera del flujo activo (`a5c06f6`) |
| **Calendario / timeline** | FIX-010: chips stale, edit marcas, mini-timeline, persistencia calendario |
| **UX editor** | FIX-004…007, FIX-012 save-all sin switch, FIX-013 diff inline, OBS-001/002/003 |
| **Explorador** | FIX-008 inline create/rename |
| **WB Eventos** | Ficha al guardar, `entity` en frontmatter, prioridad wikilink Eventos |

#### Planes Fase E

- [ERAII-001](specs/plans/Fase%20E/ERAII-001-single-model-manuscript.md) M7 ✅
- [ERAII-002](specs/plans/Fase%20E/ERAII-002-qa-manual-section7.md) M8 ✅ (smoke; §7 residual → Afinado)
- [ERAII-003](specs/plans/Fase%20E/ERAII-003-close-era-ii-v0.10.0.md) cierre ✅

#### Verificación

- `npm test` 203/203 · `cargo test` 176/176 · `npm run build` OK (2026-06-11)
- Smoke QA: M7 `17440`/`24412` · M8 `5608`/`22856`

#### Deuda conocida (no bloquea v0.10.0)

Afinado final en [`specs/manuscript-roadmap.md`](specs/manuscript-roadmap.md) § Afinado: checklist §7 residual, dead code Lexical legacy, tests unitarios helpers M7, recorrido manual FIX-004/005/012/013, FIX-011 post-WB.

#### Archivos clave

- `src-tauri/src/parser/` — manuscrito §1.4
- `src/stores/useEditorStore.ts` — caché manuscrito
- `src/lib/editor/manuscriptBlocks.ts` — helpers segmento
- `src/modules/editor/` — shell, plugins, side panel

---

## Hueco documental (2024 – jun 2026)

Entre **v0.9.0** y el inicio de `_docs2/`, el desarrollo continuó sin actualizar `04-TASK.md` ni `05-CHANGELOG.md` en `_docs/`. Trabajo relevante en ese período (resumen, no exhaustivo):

| Área | Trabajo realizado (código) | Documentado en |
|------|----------------------------|----------------|
| Refactor parser | `+++event`, inline scanner, formato §1.4 | `specs/manuscript-*.md` (histórico: `archive/manuscript-refactor/`) |
| SQLite v5 | `time_markers` multi-marca | `specs/manuscript-roadmap.md` Fase 2 |
| Editor Lexical | EventTagBar, inline, panel eventos | `specs/manuscript-roadmap.md` Fases 3–5 |
| Calendario/timeline | Adaptación a `barTags` + inline | Parcial en código; no en changelog oficial |
| WB Eventos | `Worldbuilding/Eventos/`, `event.yaml` | `01-REQUIREMENTS.md` |
| FS fixes | A21/A22/A23 | `specs/manuscript-roadmap.md` Fase 6 |

No se asigna número de versión intermedio a este trabajo hasta cerrar **v0.10.0** con QA.

---

## Historial — Era I (v0.1.0 – v0.9.0)

> **Resumen** — el detalle completo (entregables, planes de prueba, índices de tareas) permanece en [`_docs/05-CHANGELOG.md`](../_docs/05-CHANGELOG.md). El roadmap original está en `_docs/03-ROADMAP.md`.

### v0.9.0 — Grafo de conocimiento

Vista grafo D3 canvas; `graph_edges`; filtros por categoría; IPC rebuild. Ver `_docs/05-CHANGELOG.md` § v0.9.0 para detalle.

### v0.8.0 — Mapas interactivos

Leaflet + polígonos + overlays temporales + Excalidraw. Ver `_docs/05-CHANGELOG.md` § v0.8.0.

### v0.7.0 — Motor temporal y línea de tiempo

Calendario ficticio, `time_markers`, TimelineView, plothole. **Nota:** diseñado para `metadata.time` por bloque `+++`; el motor se re-adaptó en Era II.

### v0.6.0 — Control de versiones (parcial)

UI historial; `git init`. Snapshots IPC **no** completados — ver `02-TECH_STACK.md` §9.

### v0.1.0 – v0.5.0 — Cimientos → Worldbuilding

Scaffolding, FS, parser legacy, editor bloques, referencias, fichas WB. Ver `_docs/05-CHANGELOG.md` entradas completas.

---

## Cómo añadir entradas nuevas

Al cerrar una tarea en `04-TASK.md`:

1. Redactar sección `vX.Y.Z` con: descripción, entregables, archivos clave, plan de prueba manual.
2. Vaciar o avanzar la sección «Fase activa» en `04-TASK.md`.
3. Marcar fase ✅ en `03-ROADMAP.md`.

**Última actualización:** 2026-06-11
