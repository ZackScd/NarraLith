# Registro de cambios — NarraLith

Historial de implementaciones **cerradas**. Las tareas completadas se trasladan desde `04-TASK.md`.

---

## Próxima versión

### v0.10.0 — Era II: Manuscrito v2 (en preparación)

**Objetivo:** Cerrar refactor por eventos (`+++event`), editor estable, tiempo multi-marca, sync `Worldbuilding/Eventos/`.

**Seguimiento:** `04-TASK.md` § Era II.4–II.6 · `specs/manuscript-roadmap.md`

*(Entrada completa al cerrar II.6.)*

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

**Última actualización:** 2026-06-06
