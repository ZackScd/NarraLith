# Plan de implementación global — NarraLith

> **Lista maestra ordenada** (jun 2026). Sintetiza [`fix-backlog.md`](fix-backlog.md), [`manuscript-roadmap.md`](manuscript-roadmap.md), [`maps-design.md`](maps-design.md) y [`module-replan.md`](module-replan.md).  
> **El detalle paso a paso se escribe al tomar cada tarea** — esta lista puede reordenarse si una tarea anterior cambia dependencias.

| Campo | Valor |
|-------|--------|
| **Estado** | 📋 Activo |
| **Convención ID** | `FIX-###` fixes · `OBS-###` observabilidad · `ERAII-###` manuscrito · `MAP-###` mapas · `WB-###` post-worldbuilding |
| **Regla** | Fixes pequeños → fixes medianos → épica transversal → refactor Era II → refactor Era III → Era IV+ |

---

## Cómo usar este documento

1. Ejecutar **en orden** salvo reorden explícito (anotar en el plan o registro §).
2. Al **iniciar**: plan en [`plans/Fase */`](plans/) · consultar [`plans/_archive/`](plans/_archive/) si es histórico.
3. Al **cerrar**: tests/smoke según plan §8; marcar ✅ aquí.
4. **Fases A–E** archivadas en [`plans/_archive/`](plans/_archive/) · deuda rezagada → [`plans/_archive/DEFERRED.md`](plans/_archive/DEFERRED.md) · **Fase F+** activas en `plans/Fase F/`, …

**Estados:** ⬜ pendiente · 🔄 en curso · ✅ hecho · ⏸ aplazado

---

## Resumen por fase

| Fase | Rango ID | Qué | Tareas |
|------|----------|-----|--------|
| **A** | FIX-001…003 | Fixes pequeños | 3 |
| **B** | FIX-004…007, OBS-001, FIX-012, **FIX-013** | Fixes medianos (editor + UX) + observabilidad | 8 |
| **C** | FIX-008…009, **OBS-002** | Fixes explorador / timeline + registro UI | 8 ✅ |
| **D** | **OBS-003**, FIX-010…011 (+ sub 010g–i) | Acciones UI + épica «eliminar no rompe» | 11+ |
| **E** | ERAII-001…003 | Cierre Era II — manuscrito | 3 |
| **F** | MAP-000…012 | Refactor mapas Era III | 13 |
| **G** | WB-001… | Post-WB v2 (aplazado) | — |

---

## Fase A — Fixes pequeños

| ID | Estado | Tarea | Esfuerzo | Spec / referencia |
|----|--------|-------|----------|-------------------|
| **FIX-001** | ✅ | Deshabilitar autocompletado «Información guardada» del navegador | Bajo | [`fix-backlog.md` §1](fix-backlog.md) · [**plan detallado**](plans/_archive/Fase%20A/FIX-001-autofill.md) |
| **FIX-002** | ✅ | Quitar pestaña/panel «Referencias» del lateral del manuscrito | Bajo | [`fix-backlog.md` §4](fix-backlog.md) · [**plan detallado**](plans/_archive/Fase%20A/FIX-002-remove-references-panel.md) |
| **FIX-003** | ✅ | Botón carpeta: abrir raíz del proyecto en el SO (manuscrito/WB) | Bajo | [`fix-backlog.md` §5](fix-backlog.md) · [**plan detallado**](plans/_archive/Fase%20A/FIX-003-open-folder-os.md) |

---

## Fase B — Fixes medianos (editor / manuscrito)

| ID | Estado | Tarea | Esfuerzo | Spec / referencia |
|----|--------|-------|----------|-------------------|
| **FIX-004** | ✅ | Escritura: clic en zona vacía inferior enfoca el editor | Medio | [`fix-backlog.md` §8.A](fix-backlog.md) · [**plan detallado**](plans/_archive/Fase%20B/FIX-004-click-empty-focus.md) |
| **FIX-005** | ✅ | Guardado fiel a espacios y saltos de línea (sin `trim` en cadena extract→disco) | Medio | [`fix-backlog.md` §8.B](fix-backlog.md) · [**plan detallado**](plans/_archive/Fase%20B/FIX-005-whitespace-persist.md) |
| **FIX-006** | ✅ | Rediseño marco de evento: chips unificados, fecha ISO, esquinas overlay | Medio–Alto | [FIX-006](plans/_archive/Fase%20B/FIX-006-event-frame-redesign.md) |
| **FIX-006.5** | ✅ | Interacciones marco: `[-]`/`[+]`, borrado two-step, contexto evento | Medio–Alto | [FIX-006.5](plans/_archive/Fase%20B/FIX-006.5-event-frame-interactions.md) |
| **OBS-001** | ✅ | Módulo global de auditoría / registro del sistema (IPC, FS, stores, eventos) | Medio | [**plan detallado**](plans/_archive/Fase%20B/OBS-001-system-audit-log.md) |
| **FIX-007** | ✅ | Borrador sucio persistente al cerrar la app | Medio | [`manuscript-design.md`](manuscript-design.md) §1 · [**plan detallado**](plans/_archive/Fase%20B/FIX-007-dirty-draft-persist.md) |
| **FIX-012** | ✅ | Guardar: tabs estables, sin ghost, save-all sin switch (2b) | Medio | [**plan detallado**](plans/_archive/Fase%20B/FIX-012-save-tab-navigation.md) |
| **FIX-013** | ✅ | Ver diff disco vs borrador sucio (panel herramientas manuscrito) | Medio | [**plan detallado**](plans/_archive/Fase%20B/FIX-013-dirty-diff-viewer.md) · requiere FIX-007 ✅ |

> **OBS-001 antes de FIX-012:** diagnosticar con evidencia en `NarraLith/_debug/` (solo `tauri dev`; release sin debug).

---

## Fase C — Fixes explorador y timeline ✅

| ID | Estado | Tarea | Esfuerzo | Spec / referencia |
|----|--------|-------|----------|-------------------|
| **FIX-008** | ✅ | Crear archivo/carpeta inline en explorador (estilo VS Code) + fix `create_file` Rust | Medio | [`fix-backlog.md` §2](fix-backlog.md) · [**plan**](plans/_archive/Fase%20C/FIX-008-explorer-inline-create.md) · QA `session-1781317457105-5412` |
| **FIX-008b** | ✅ | Renombrar **inline** en explorador + regla extensión `.md` | Medio | [**plan**](plans/_archive/Fase%20C/FIX-008b-rename-extension.md) · QA `session-1781318644915-6724` |
| **FIX-009** | ✅ | Timeline: chip dual + conectores cronológicos + cierre visual 009a | Medio–Alto | [**plan**](plans/_archive/Fase%20C/FIX-009-timeline-dual-chip-connectors.md) · QA `session-1781319870943-19224` |
| **FIX-009a** | ✅ | Conectores borde lateral + **chips ancho autoajustado** | Bajo–Medio | [**plan**](plans/_archive/Fase%20C/FIX-009a-timeline-connector-edge-anchors.md) · `timelineChipMetrics` + `linkEdgeAnchors` |
| **FIX-009b** | ✅ | Hover orden escritura v1 (solo `next`) — **cerrado por 009c** | Medio–Alto | [**plan**](plans/_archive/Fase%20C/FIX-009b-timeline-writing-order-links.md) · QA `session-1781321526405-27876` |
| **FIX-009c** | ✅ | Hover **prev + next**, cadena manuscrito (incl. prosa libre) | Medio | [**plan**](plans/_archive/Fase%20C/FIX-009c-timeline-writing-order-hover-neighbors.md) · QA `ui-session-1781326085768-18588` |
| **FIX-009d** | ✅ | Auditoría pathIndex árbol filtrado manuscript (regresión D→eventoTest) | Bajo | [**auditoría**](plans/_archive/Fase%20C/FIX-009d-audit-writing-order-path-index.md) |
| **OBS-002** | ✅ | Registro **interfaz completa**: catálogo `obs.ui.*` multi-módulo + **3 toggles** (sistema / interfaz / interfaz detallada) · 2 NDJSON UI | Medio–Alto | [**plan**](plans/_archive/Fase%20C/OBS-002-ui-render-audit-log.md) · solo `tauri dev` |

---

## Fase D — Épica «eliminar no rompe» (primeras entregas)

Marco completo en [`fix-backlog.md` §6](fix-backlog.md). Se implementa **por escenarios**; el documento sigue siendo vivo.

| ID | Estado | Tarea | Esfuerzo | Spec / referencia |
|----|--------|-------|----------|-------------------|
| **FIX-010** | ✅ | **6.A** — Épica calendario obsoleto v1 (**[índice](plans/_archive/Fase%20D/FIX-010-calendar-stale-time-chips.md)**) | Alto | 010g→a→b→c→d→h→i ✅ · 010e pospuesto v2 |
| **FIX-010g** | ✅ | Baseline `.narralith/calendar-baseline.json` | Medio | [plan](plans/_archive/Fase%20D/FIX-010g-calendar-baseline.md) |
| **FIX-010a** | ✅ | `classifyTimeTag` + chips rojos editor | Medio | [plan](plans/_archive/Fase%20D/FIX-010a-classify-red-chips.md) |
| **FIX-010b** | ✅ | Timeline visible sin mover posición | Medio | [plan](plans/_archive/Fase%20D/FIX-010b-timeline-stale-display.md) |
| **FIX-010c** | ✅ | Calendario + mini-timeline entradas | Medio | [plan](plans/_archive/Fase%20D/FIX-010c-calendar-entries.md) |
| **FIX-010d** | ✅ | Editar marcas inline + barTag | Medio | [plan](plans/_archive/Fase%20D/FIX-010d-edit-time-tags.md) |
| **FIX-010h** | ✅ | Borrador calendario en sesión + diálogos unsaved | Bajo | [plan](plans/_archive/Fase%20D/FIX-010h-calendar-draft-persist.md) |
| **OBS-003** | ✅ | **Registro de acciones** (intent journal) + menú debug unificado | Alto | [**plan**](plans/_archive/Fase%20D/OBS-003-action-audit-log.md) · Fases 0–3 cerradas |
| **FIX-010i** | ✅ | Motor diff + `reconcileBaseline` en save (UI diff cancelada) | Medio | [plan](plans/_archive/Fase%20D/FIX-010i-calendar-structural-diff.md) |
| **FIX-010e** | ⏸️ | Migración A/B/C + panel consistencia (010f) | Alto | [plan](plans/_archive/Fase%20D/FIX-010e-migration-wizard.md) · **pospuesto v2** |
| **VER-001** | ⬜ | Reparar historial Git (snapshots + diff) | Alto | Era IV · complementa 010e |
| **FIX-011** | ⏸️ | **6.B** — Evento WB huérfano (plan listo; **post WB v2** tras mapas) | Medio (acotado) | [**plan**](plans/_archive/Fase%20D/FIX-011/FIX-011-orphan-event-entity.md) · QA `14924` |

> Escenarios **6.C, 6.D…** se añaden a esta fase cuando el usuario los defina — no bloquean Era II ni MAP.

---

## Fase E — Cierre Era II (manuscrito v2)

Orden acordado en [`03-ROADMAP.md`](../03-ROADMAP.md) y [`manuscript-roadmap.md`](manuscript-roadmap.md): **después** de fixes que afecten el editor diario.

| ID | Estado | Tarea | Esfuerzo | Spec / referencia |
|----|--------|-------|----------|-------------------|
| **ERAII-001** | ✅ | **M7** — Un solo modelo en memoria (`ParsedManuscript`; quitar adaptador legacy) | Alto | [**plan**](plans/_archive/Fase%20E/ERAII-001-single-model-manuscript.md) · [`manuscript-roadmap.md` M7](manuscript-roadmap.md) · QA `17440`+`24412` |
| **ERAII-002** | ✅ | **M8** — QA manual checklist §7 (smoke; residual → Afinado) | Medio | [**plan**](plans/_archive/Fase%20E/ERAII-002-qa-manual-section7.md) · QA `5608`/`22856` |
| **ERAII-003** | ✅ | **II.6** — Changelog v0.10.0 + Era II cerrada | Bajo | [**plan**](plans/_archive/Fase%20E/ERAII-003-close-era-ii-v0.10.0.md) · [`archive/retired-cadence/05-CHANGELOG.md`](../../archive/retired-cadence/05-CHANGELOG.md) |

**Criterio Fase E:** ✅ cerrada 2026-06-11 · v0.10.0 · tests verdes · smoke QA M8.

---

## Fase F — Refactor mapas (Era III)

Spec: [`maps-design.md`](maps-design.md). **Purgar casi todo** el código actual (`modules/maps/`, `maps_store.rs`) salvo lo que **MAP-000** marque como conservar.

Orden sugerido: **fundamentos → dibujo → tiempo → navegación → integración manuscrito (stub)**.

| ID | Estado | Tarea | Esfuerzo | Spec / referencia |
|----|--------|-------|----------|-------------------|
| **MAP-000** | ✅ | Inventario **conservar vs purgar** + decisiones stack/persistencia — [plan](plans/Fase%20F/MAP-000-inventory-purge.md) | Bajo | [`maps-design.md`](maps-design.md) §9 · §2 |
| **MAP-001** | ✅ | Persistencia v2 + purga legacy — [plan](plans/Fase%20F/MAP-001-persistence-v2.md) | Alto | [`maps-design.md`](maps-design.md) §9 |
| **MAP-002** | ✅ | Multi-mundo: selector + apertura fijado/último visto/modificado — [plan](plans/Fase%20F/MAP-002-multi-world.md) · QA cerrado | Medio | [`maps-design.md`](maps-design.md) §3ter |
| **MAP-003** | ✅ | Crear mapa: diálogo, tamaño libre, aspect ratio, import, expandir/recortar — [plan](plans/Fase%20F/MAP-003-create-canvas.md) · QA cerrado | Medio–alto | [`maps-design.md` §3](maps-design.md) |
| **MAP-004** | ✅ | Modos vista: **interactivo por defecto** + edición solo con ✏️ — [plan](plans/Fase%20F/MAP-004-view-modes.md) · QA `1781831409032-13548` | Medio–alto | [`maps-design.md` §8](maps-design.md) |
| **MAP-005** | 📋 | Estudio dibujo: colores custom, pinceles, presión tableta — [plan](plans/Fase%20F/MAP-005-draw-studio.md) | Alto | [`maps-design.md` §3bis](maps-design.md) |
| **MAP-006** | ✅ | Capas internas por archivo de dibujo — [plan](plans/Fase%20F/MAP-006-layers.md) · QA `1781849729654` + fix D13 `1781850121442` | Medio | [`maps-design.md` §4.1](maps-design.md) |
| **MAP-007** | ✅ | Dibujo principal: «Desde», terreno base — [plan](plans/Fase%20F/MAP-007-principal-desde.md) · QA `1781851429000-23756` | Medio | [`maps-design.md` §4.2](maps-design.md) |
| **MAP-008** | ✅ | Secundarios: parches transparentes, visibilidad T — [plan](plans/Fase%20F/MAP-008-secondary-patches.md) · QA parcial | Alto | [`maps-design.md` §4.3](maps-design.md) |
| **MAP-009** | ✅ | Compositor + timeline del mapa (scrubber **T**) — [plan](plans/Fase%20F/MAP-009-map-timeline-scrubber.md) · QA `1781899299029-15084` · polish §13 diferido | Alto | [`maps-design.md` §4.4](maps-design.md) |
| **MAP-010** | ✅ | Navegación interactiva: hotspots → dibujo hijo, breadcrumb/volver — [plan](plans/Fase%20F/MAP-010-hotspots-nav.md) · QA `1781902329565-1512` + `1781902875392-8868` · polish §13 diferido | Alto | [`maps-design.md` §5](maps-design.md) |
| **MAP-011** | 📋 | Ubicaciones desde manuscrito: marcas **X** en T (stub Era III) — [plan](plans/Fase%20F/MAP-011-manuscript-location-x.md) | Medio | [`maps-design.md` §4bis.4.1](maps-design.md) |
| **MAP-012** | ⬜ | Smoke Era III + purga código mapas legacy | Medio | [`maps-design.md`](maps-design.md) · [`06-ARCHITECTURE.md`](archive/retired-cadence/06-ARCHITECTURE.md) |

**Dependencias internas (orientativas):**

```text
MAP-000 → MAP-001 → MAP-002 → MAP-003
MAP-001 → MAP-004 → MAP-005 → MAP-006
MAP-007 → MAP-008 → MAP-009
MAP-004 + MAP-009 → MAP-010
MAP-009 + manuscrito estable → MAP-011
todo → MAP-012
```

---

## Fase G — Post-WB v2 (aplazado)

No ejecutar hasta **Era IV** worldbuilding refactor. Listado para no perder el hilo.

| ID | Estado | Tarea | Spec |
|----|--------|-------|------|
| **WB-001** | ⏸ | Ubicación rica en mapa (iconos, filtros por personaje) | [`maps-design.md` §4bis.4.3](maps-design.md) |
| **WB-002** | ⏸ | Edición bidireccional mapa ↔ manuscrito ↔ fichas WB | [`maps-design.md` §4bis.4](maps-design.md) |
| **WB-003** | ⏸ | Trayectorias de eventos, zonas de peligro, «¿dónde está X?» | [`maps-design.md` §4bis.3–4](maps-design.md) |
| **WB-004** | ⏸ | Worldbuilding v2 (módulo completo) | [`module-replan.md`](module-replan.md) · [`03-ROADMAP.md`](../03-ROADMAP.md) Era IV |
| **FIX-011** | ⏸ | **6.B** — Ficha evento huérfana (detector + UI) | [**plan**](plans/_archive/Fase%20D/FIX-011/FIX-011-orphan-event-entity.md) · **después de WB-004** |

---

## Orden total (lista numerada)

| # | ID | Tarea corta |
|---|-----|-------------|
| 1 | FIX-001 | Autofill navegador off ✅ |
| 2 | FIX-002 | Quitar panel Referencias ✅ |
| 3 | FIX-003 | Abrir raíz proyecto en SO ✅ |
| 4 | FIX-004 | Clic zona vacía editor ✅ |
| 5 | FIX-005 | Guardado sin recortar espacios/saltos ✅ |
| 6 | FIX-006 | Marco evento rediseño ✅ |
| 7 | OBS-001 | Auditoría global del sistema (logs reutilizables) ✅ |
| 8 | FIX-012 | Guardar: pestaña estable, tabs no se cierran, save-all sin switch ✅ |
| 9 | FIX-007 | Borrador sucio al cerrar app ✅ |
| 10 | FIX-008 | Explorador inline VS Code ✅ |
| 10b | FIX-008b | Renombrar inline + extensión `.md` ✅ |
| 11 | FIX-009 | Timeline chips + conectores cronológicos ✅ |
| 11a | FIX-009a | Anclas borde + chips autoajustados ✅ |
| 11b | FIX-009b | Hover enlace orden escritura ✅ (v1 → 009c) |
| 11c | FIX-009c | Hover prev+next, todos los chips, cadena manuscrito ✅ |
| 11d | FIX-009d | Auditoría pathIndex árbol filtrado ✅ |
| 11e | OBS-002 | Registro interfaz: 3 toggles (sistema / UI / UI verbose) ✅ |
| 12 | FIX-013 | Diff disco vs borrador sucio (panel herramientas) ✅ |
| 13 | FIX-010g | Baseline calendario en disco ✅ |
| 13a | FIX-010a | Clasificador + chips rojos ✅ |
| 13b | FIX-010b | Timeline stale visible ✅ |
| 13c | FIX-010c | Calendario + mini-timeline ✅ |
| 13d | FIX-010d | Editar marcas tiempo ✅ |
| 13h | FIX-010h | Borrador calendario sesión + diálogos unsaved ✅ |
| 13i | FIX-010i | Motor diff + reconcileBaseline en save ✅ (UI diff cancelada) |
| 13e | FIX-010e | Migración + consistencia (v2) ⏸️ pospuesto |
| 14 | FIX-011 | Épica 6.B evento WB huérfano ⏸️ post WB v2 [plan](plans/_archive/Fase%20D/FIX-011/FIX-011-orphan-event-entity.md) |
| 15 | ERAII-001 | M7 un solo modelo manuscrito ✅ |
| 16 | ERAII-002 | M8 QA smoke ✅ |
| 17 | ERAII-003 | Cierre v0.10.0 Era II ✅ |
| — | **Doc order** | Ordenar `_docs/` | ✅ 2026-06-11 |
| 18 | MAP-000 | Inventario purga mapas ✅ |
| 19 | MAP-001 | Persistencia mapas v2 + purga ✅ |
| 20 | MAP-002 | Multi-mundo + selector ✅ |
| 21 | MAP-003 | Lienzo crear/import/expandir/recortar ✅ |
| 22 | MAP-004 | Modos interactivo / edición ✅ |
| 23 | MAP-005 | Estudio Sketchbook 📋 plan |
| 24 | MAP-006 | Capas internas |
| 25 | MAP-007 | Dibujo principal + Desde ✅ |
| 26 | MAP-008 | Secundarios temporales ✅ |
| 27 | MAP-009 | Compositor + timeline T ✅ |
| 28 | MAP-010 | Navegación hotspots ✅ |
| 29 | MAP-011 | Marcas X ubicación MS 📋 |
| 30 | MAP-012 | Smoke + purga legacy mapas |
| — | WB-* | Post-WB (aplazado) |

---

## Qué queda fuera de este plan (por ahora)

| Tema | Dónde | Cuándo |
|------|-------|--------|
| Grafo, versiones Git, exportación | [`03-ROADMAP.md`](../03-ROADMAP.md) Eras IV–V | Tras WB |
| Plothole | [`module-replan.md`](module-replan.md) | Era IV+ |
| Backlinks WB en nuevo panel | Tras ERAII-001 ✅ | Era II–IV |
| Afinado editor manuscrito (dead code, tests, §7 residual) | [`manuscript-roadmap.md` § Afinado](manuscript-roadmap.md) | Post v0.10.0 — no bloqueante |
| Diff borrador vs disco | [`plans/_archive/Fase B/FIX-013-dirty-diff-viewer.md`](plans/_archive/Fase%20B/FIX-013-dirty-diff-viewer.md) | ✅ FIX-013 |

---

## Registro de cambios al plan

| Fecha | Cambio |
|-------|--------|
| 2026-06-06 | Creación lista maestra: fixes A→D, Era II, Era III mapas, WB aplazado |
| 2026-06-06 | Plan detallado FIX-002 (`plans/FIX-002-remove-references-panel.md`) |
| 2026-06-06 | Plan detallado FIX-003 (`plans/FIX-003-open-folder-os.md`) |
| 2026-06-06 | Plan detallado FIX-004 (`plans/FIX-004-click-empty-focus.md`) |
| 2026-06-11 | FIX-006.5 implementado: contexto evento, `[-]`/`[+]`, borrado chip/cierre two-step, tests Vitest |
| 2026-06-11 | FIX-006.5: decisiones D1–D3 cerradas en plan (huérfano WB, expand absorb, cursor post-[-]) |
| 2026-06-11 | Plan FIX-006.5 interacciones marco — auditoría + fases (`plans/FIX-006.5-event-frame-interactions.md`); sin implementación |
| 2026-06-11 | Plan detallado FIX-005 (`plans/FIX-005-whitespace-persist.md`) |
| 2026-06-11 | Plan detallado FIX-006 overlay (`plans/FIX-006-event-frame-redesign.md`) |
| 2026-06-11 | FIX-012 planificado: guardar cierra pestañas / salta documento; repro QA `meow`+`eventoTest` → `skanlnsklnals` (`plans/FIX-012-save-tab-navigation.md`) |
| 2026-06-11 | FIX-004…006 marcados ✅; eliminada nota obsoleta backlog §8; añadido OBS-001 (auditoría global) antes de FIX-012 |
| 2026-06-11 | OBS-001 implementado v1: audit TS+Rust, menú debug, visor, `_debug/logs/`; plan marcado ✅ |
| 2026-06-11 | FIX-012 implementado: reconcile por kind, guard self-save en remove, Ctrl+S/Ctrl+Shift+S, saveAll restore |
| 2026-06-11 | FIX-012 Fase 2b: save-all desde caché sin switchTab; AtPath saves + batch saveStatus |
| 2026-06-11 | FIX-007: borrador sucio manuscrito en localStorage al cerrar; restore drafts (`plans/FIX-007-dirty-draft-persist.md`) |
| 2026-06-11 | FIX-007 QA cerrado: NDJSON `session-1781307782589-1952` (cierre) + `session-1781307807051-26148` (reopen, `draftCount: 2`) |
| 2026-06-11 | FIX-013 planificado: diff disco vs borrador sucio en panel herramientas (`plans/FIX-013-dirty-diff-viewer.md`); orden #12 tras FIX-009 |
| 2026-06-11 | FIX-013 §3.1: cabecera panel solo iconos (Etiquetas/Guardar sin texto); tooltips i18n ES/EN |
| 2026-06-11 | FIX-013 ✅ cerrado: diff inline Lexical (`DirtyDiffHighlightPlugin`), refresh al guardar vía `dirtyDiffSavedBaseline`; QA `session-1781310443496-13516` |
| 2026-06-11 | Planes reorganizados por fase (`plans/Fase A|B|C/`); enlaces canónicos actualizados en esta lista |
| 2026-06-11 | FIX-008 plan actualizado: QA recorrido `session-1781315188472-9108` (create/move/rename); confirma D3; hallazgo H1 rename sin `.md` → FIX-008b |
| 2026-06-11 | FIX-008 ✅ cerrado: QA `session-1781317457105-5412`; plan FIX-008b rename extensión redactado |
| 2026-06-11 | FIX-008b replanteado: rename **inline** (sin modal), mismo estilo que create + regla D7 + Rust |
| 2026-06-11 | FIX-009 planificado: chip dual archivo+evento, conectores por `segmentId`, filtro panel (`plans/_archive/Fase C/FIX-009-timeline-dual-chip-connectors.md`) |
| 2026-06-11 | FIX-009 v1 implementado; QA `session-1781319870943` → plan FIX-009a (anclas borde) + FIX-009b (hover orden escritura / árbol manuscrito) |
| 2026-06-11 | FIX-009b v1 en código; QA `session-1781321526405-27876` → FIX-009c (prev+next, prosa libre, cadena por archivo) |
| 2026-06-11 | FIX-009d: auditoría pathIndex + fix árbol filtrado manuscript; QA `session-1781323873949-29056` |
| 2026-06-11 | OBS-002 planificado: registro UI multi-módulo + 3 toggles (sistema / interfaz / verbose) · `plans/_archive/Fase C/OBS-002-ui-render-audit-log.md` |
| 2026-06-13 | **Fase C cerrada ✅:** FIX-009…009c (timeline chip dual, anclas, hover lectura), FIX-009d, OBS-002; tests Vitest + QA `_debug` |
| 2026-06-11 | FIX-010 split: índice épica + planes 010g, 010a–d, 010h, 010i, 010e (010f dentro de 010e) |
| 2026-06-13 | FIX-010 planificado (6.A): auditoría + plan [`plans/_archive/Fase D/FIX-010-calendar-stale-time-chips.md`](plans/_archive/Fase%20D/FIX-010-calendar-stale-time-chips.md) |
| 2026-06-11 | FIX-010g, 010a, 010b ✅ — QA timeline/calendario sesión NDJSON `8852` (calendario mínimo post-reset) |
| 2026-06-11 | FIX-010c ✅ — QA calendario sesión `2156` (año 15, marcas obsoletas en panel + grid) |
| 2026-06-11 | FIX-010d ✅ · FIX-010h ✅ cerrado · docs alineados |
| 2026-06-11 | **OBS-003** planificado: registro acciones usuario (session + verbose), menú «eliminar todo» / «sesión única» unificados · [`plans/_archive/Fase D/OBS-003-action-audit-log.md`](plans/_archive/Fase%20D/OBS-003-action-audit-log.md) · prioridad antes FIX-010i |
| 2026-06-11 | **OBS-003 ✅ cerrado:** Fases 0–3 (código + docs §13 plantilla QA); siguiente FIX-010i |
| 2026-06-11 | **FIX-010i ✅** motor diff + save · UI diff cancelada · QA `9020` |
| 2026-06-11 | **FIX-010 v1 ✅ cerrada** · 010e pospuesto v2 |
| 2026-06-11 | **FIX-011 📋 planificado:** [`plans/_archive/Fase D/FIX-011/FIX-011-orphan-event-entity.md`](plans/_archive/Fase%20D/FIX-011/FIX-011-orphan-event-entity.md) · QA sesión `14924` |
| 2026-06-11 | **FIX-011 ⏸️ pospuesto** — implementar tras rediseño WB (post-mapas); plan + QA conservados |
| 2026-06-11 | **ERAII-001 ✅ M7 cerrado** — commit `a5c06f6`; plan retroactivo [`plans/_archive/Fase E/ERAII-001-single-model-manuscript.md`](plans/_archive/Fase%20E/ERAII-001-single-model-manuscript.md); QA `17440`+`24412` |
| 2026-06-11 | **ERAII-002 ✅ M8 cerrado** — smoke QA `5608`/`22856`; §7 residual → Afinado · [`ERAII-002-qa-manual-section7.md`](plans/_archive/Fase%20E/ERAII-002-qa-manual-section7.md) |
| 2026-06-11 | **MAP-001 📋** plan persistencia v2 + purga — [`plans/Fase F/MAP-001-persistence-v2.md`](plans/Fase%20F/MAP-001-persistence-v2.md) |
| 2026-06-11 | **MAP-002 ✅ cerrado** multi-mundo + selector — QA `1781754152083-26128` |
| 2026-06-11 | **MAP-003 ✅ cerrado** crear lienzo + import + expand/crop — QA `1781830041954-20420` |
| 2026-06-11 | **MAP-004 ✅ cerrado** modos interactivo/edición + viewport — QA `1781831409032-13548` |
| 2026-06-11 | **MAP-005 📋** estudio dibujo Sketchbook — [`plans/Fase F/MAP-005-draw-studio.md`](plans/Fase%20F/MAP-005-draw-studio.md) |
| 2026-06-11 | **MAP-006 ✅ cerrado** capas internas — [`MAP-006-layers.md`](plans/Fase%20F/MAP-006-layers.md) · QA `1781849729654` + D13 `1781850121442` |
| 2026-06-11 | **MAP-007 📋** dibujo principal + «Desde» — [`MAP-007-principal-desde.md`](plans/Fase%20F/MAP-007-principal-desde.md) |
| 2026-06-11 | **MAP-007 ✅ cerrado** dibujo principal + «Desde» — QA `1781851429000-23756` |
| 2026-06-11 | **MAP-008 📋** secundarios + parches temporales — [`MAP-008-secondary-patches.md`](plans/Fase%20F/MAP-008-secondary-patches.md) |
| 2026-06-11 | **MAP-010 ✅ cerrado** — nav/hotspots + compositor; QA parcial `1781902329565-1512` + `1781902875392-8868`; polish §13 → [`MAP-010-hotspots-nav.md`](plans/Fase%20F/MAP-010-hotspots-nav.md) |
| 2026-06-11 | **MAP-011 📋** plan ubicaciones MS → marcas X @ T — [`MAP-011-manuscript-location-x.md`](plans/Fase%20F/MAP-011-manuscript-location-x.md) |

---

**Última actualización:** 2026-06-11 (MAP-011 planificado)
