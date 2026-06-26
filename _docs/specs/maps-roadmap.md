# Roadmap — Módulo mapas (Era III)

> Orden de ejecución y dependencias para Fase F.  
> **Spec:** [`maps-design.md`](maps-design.md) · **Lista maestra:** [`implementation-plan.md`](implementation-plan.md) · **Inventario:** [`plans/Fase F/MAP-000-inventory-purge.md`](plans/Fase%20F/MAP-000-inventory-purge.md)

| Campo | Valor |
|-------|--------|
| **Era** | III (`03-ROADMAP.md`) |
| **Versión objetivo** | v0.11.x |
| **Estado** | … MAP-015 📋 · **MAP-016 📋** · **MAP-017 📋** · MAP-012 ⏸ |

\* MAP-010: código cerrado; **UX navegación superseded** por MAP-016.

---

## Orden y dependencias

```text
MAP-000 ✅ decisiones + inventario
    │
    ▼
MAP-001 persistencia v2 + purga física legacy
    │
    ├──► MAP-002 multi-mundo
    │         │
    │         └──► MAP-003 crear lienzo
    │
    ├──► MAP-004 modos interactivo / edición
    │         │
    │         └──► MAP-005 estudio (presión, pinceles)
    │                   │
    │                   └──► MAP-006 capas internas
    │
    ├──► MAP-007 dibujo principal + «Desde»
    │         │
    │         └──► MAP-008 secundarios temporales
    │                   │
    │                   └──► MAP-009 compositor + scrubber T
    │                             │
    │                             ├──► MAP-010 hotspots + breadcrumb
    │                             │
    │                             └──► MAP-011 marcas X (manuscrito)
    │                                       │
    │                                       └──► MAP-013 afinado UX/comportamiento
    │                                                 │
    │                                                 └──► MAP-014 panel flotante (§8.5)
    │                                                           │
    │                                                           └──► MAP-015 ventana capas + Fondo + parches
    │                                                                     │
    │                                                                     └──► MAP-016 nav+hijo + lasso + ventana hijo
    │
    ├──► MAP-009 (T) + MAP-011 (ubicaciones) ──► MAP-017 timeline vista rica
    │
    └──► MAP-012 smoke (⏸ tras MAP-013…017)
```

---

## Tareas

| ID | Entregable | Spec | Depende de |
|----|------------|------|------------|
| **MAP-000** | Inventario + decisiones stack/persistencia/purga | §2 · §9 · [plan](plans/Fase%20F/MAP-000-inventory-purge.md) | — |
| **MAP-001** | Persistencia v2 + purga legacy + IPC + UI placeholder | §9 · [plan](plans/Fase%20F/MAP-001-persistence-v2.md) ✅ | MAP-000 |
| **MAP-002** | Selector + apertura (pinned / lastViewed / lastModified) | §3ter · [plan](plans/Fase%20F/MAP-002-multi-world.md) ✅ | MAP-001 |
| **MAP-003** | Crear mapa: diálogo, tamaño libre, aspect ratio, import, expandir/recortar | §3 · [plan](plans/Fase%20F/MAP-003-create-canvas.md) ✅ | MAP-002 |
| **MAP-004** | Interactivo por defecto; edición solo ✏️ + viewport canvas | §8 · [plan](plans/Fase%20F/MAP-004-view-modes.md) ✅ | MAP-001 |
| **MAP-005** | Estudio Sketchbook: color custom, pinceles, presión; guardado manual (005b) | §3bis · [plan](plans/Fase%20F/MAP-005-draw-studio.md) ✅ · [005b](plans/Fase%20F/MAP-005b-save-undo-persistence.md) ✅ | MAP-004 |
| **MAP-006** | Capas internas por dibujo | §4.1 · [plan](plans/Fase%20F/MAP-006-layers.md) ✅ | MAP-005 |
| **MAP-007** | Dibujo principal + etiqueta «Desde» — [plan](plans/Fase%20F/MAP-007-principal-desde.md) ✅ · QA `1781851429000` | §4.2 | MAP-001 · MAP-006 |
| **MAP-008** | Secundarios: parches + visibilidad T — [plan](plans/Fase%20F/MAP-008-secondary-patches.md) ✅ · QA parcial | §4.3 | MAP-007 |
| **MAP-009** | Compositor + timeline T — [plan](plans/Fase%20F/MAP-009-map-timeline-scrubber.md) ✅ · QA `1781899299029-15084` | §4.4 | MAP-008 |
| **MAP-010** | Hotspots → dibujo hijo; volver — [plan](plans/Fase%20F/MAP-010-hotspots-nav.md) ✅ · QA `1781902329565-1512` + `1781902875392-8868` · polish §13 | §5 | MAP-004, MAP-009 |
| **MAP-011** | Ubicaciones MS → marcas **X** @ T — [plan](plans/Fase%20F/MAP-011-manuscript-location-x.md) 🔄 impl | §4bis.4.1 | MAP-009, MAP-010, manuscrito |
| **MAP-013** | Backlog correcciones UX + comportamiento — [backlog](plans/Fase%20F/MAP-013-maps-corrections-backlog.md) 🔄 | §2–§8 | MAP-011 |
| **MAP-014** | Panel herramientas **flotante** — [plan](plans/Fase%20F/MAP-014-floating-tools-panel.md) 📋 | §8.5 | MAP-013 shell |
| **MAP-015** | Ventana capas unificada + Fondo + imagen capa — [plan](plans/Fase%20F/MAP-015-layers-patches-unified-panel.md) 📋 | §3.2.1 · §4.1 | MAP-014 Fase A |
| **MAP-016** | Nav+hijo unificados · rubber banding · ventana hijo — [plan](plans/Fase%20F/MAP-016-nav-hotspots-replan.md) 📋 | §5.5–5.6 | MAP-014 Fase A · MAP-015 tab |
| **MAP-017** | Timeline mapa vista rica + sparse + constantes — [plan](plans/Fase%20F/MAP-017-map-timeline-view.md) 📋 | §4.4 | MAP-009 · MAP-011 |
| **MAP-012** | Smoke QA + purga legacy + cierre Fase F — [plan](plans/Fase%20F/MAP-012-smoke-era-iii-purge.md) ⏸ | §2 | MAP-013…017 |

---

## Decisiones transversales (MAP-000)

Resumen — detalle en [`maps-design.md` §9](maps-design.md#9-persistencia-en-disco-decisiones-era-iii) y [MAP-000](plans/Fase%20F/MAP-000-inventory-purge.md).

| Tema | Decisión |
|------|----------|
| Código legacy | Tierra quemada; purga al inicio MAP-001 |
| Formato dibujo | Un `*.json` por dibujo; `layers[]` dentro |
| Trazos | Vectorial + `pressure` 0–1 por punto |
| Borrador sucio | Autosave a disco + flush al cerrar — no `localStorage` |
| Migración | Ninguna |

---

## Fuera de Era III

| ID | Tema |
|----|------|
| WB-001…003 | Ubicación rica, edición bidireccional, trayectorias |
| FIX-011 | Evento WB huérfano — post WB v2 |

---

## Registro

| Fecha | Evento |
|-------|--------|
| 2026-06-11 | **MAP-007 📋** plan dibujo principal + «Desde» — [`MAP-007-principal-desde.md`](plans/Fase%20F/MAP-007-principal-desde.md) |
| 2026-06-11 | **MAP-007 ✅ cerrado** — QA `1781851429000-23756` → handoff MAP-008 |
| 2026-06-11 | **MAP-008 📋** plan secundarios + parches — [`MAP-008-secondary-patches.md`](plans/Fase%20F/MAP-008-secondary-patches.md) |
| 2026-06-11 | **MAP-008 ✅ cerrado** — QA parcial + bugfixes §12.1 → handoff MAP-009 |
| 2026-06-11 | **MAP-009 ✅ cerrado** — scrubber + memoria T; QA `1781899299029-15084`; polish §13 diferido → [`MAP-009-map-timeline-scrubber.md`](plans/Fase%20F/MAP-009-map-timeline-scrubber.md) |
| 2026-06-11 | **MAP-010 📋** plan hotspots + navegación hijo — [`MAP-010-hotspots-nav.md`](plans/Fase%20F/MAP-010-hotspots-nav.md) |
| 2026-06-11 | **MAP-010 ✅ cerrado** — nav/hotspots + compositor; QA parcial; polish §13 → [`MAP-010-hotspots-nav.md`](plans/Fase%20F/MAP-010-hotspots-nav.md) |
| 2026-06-11 | **MAP-011 🔄** impl código |
| 2026-06-11 | **MAP-012 📋** plan smoke + purga — [`MAP-012-smoke-era-iii-purge.md`](plans/Fase%20F/MAP-012-smoke-era-iii-purge.md) |
| 2026-06-11 | **MAP-012 ⏸** pospuesto — MAP-013 backlog correcciones primero |
| 2026-06-11 | **MAP-013 📋** — [`MAP-013-maps-corrections-backlog.md`](plans/Fase%20F/MAP-013-maps-corrections-backlog.md) |
| 2026-06-25 | **MAP-014 📋** replan UI — panel herramientas flotante (Sketchbook); supersede MAP-013 §2bis — [`MAP-014-floating-tools-panel.md`](plans/Fase%20F/MAP-014-floating-tools-panel.md) |

| 2026-06-25 | **MAP-017 📋** — [`MAP-017-map-timeline-view.md`](plans/Fase%20F/MAP-017-map-timeline-view.md) |

**Última actualización:** 2026-06-25 (MAP-017 · MAP-016 · MAP-015 · MAP-014 · MAP-012 ⏸)
