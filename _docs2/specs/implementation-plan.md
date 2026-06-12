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

1. Ejecutar **en orden** salvo que una tarea en curso obligue a reordenar (anotar el motivo en el PR o en `04-TASK.md`).
2. Al **iniciar** una tarea: abrir el spec enlazado, redactar sub-plan de implementación si hace falta, marcar estado aquí (`⬜` → `🔄` → `✅`).
3. Al **cerrar**: tests/smoke según spec; no duplicar el detalle aquí.

**Estados:** ⬜ pendiente · 🔄 en curso · ✅ hecho · ⏸ aplazado

---

## Resumen por fase

| Fase | Rango ID | Qué | Tareas |
|------|----------|-----|--------|
| **A** | FIX-001…003 | Fixes pequeños | 3 |
| **B** | FIX-004…007, OBS-001, FIX-012 | Fixes medianos (editor + UX) + observabilidad | 7 |
| **C** | FIX-008…009 | Fixes explorador / timeline | 2 |
| **D** | FIX-010…011 | Épica «eliminar no rompe» (primeros escenarios) | 2 |
| **E** | ERAII-001…003 | Cierre Era II — manuscrito | 3 |
| **F** | MAP-000…012 | Refactor mapas Era III | 13 |
| **G** | WB-001… | Post-WB v2 (aplazado) | — |

---

## Fase A — Fixes pequeños

| ID | Estado | Tarea | Esfuerzo | Spec / referencia |
|----|--------|-------|----------|-------------------|
| **FIX-001** | ✅ | Deshabilitar autocompletado «Información guardada» del navegador | Bajo | [`fix-backlog.md` §1](fix-backlog.md) · [**plan detallado**](plans/FIX-001-autofill.md) |
| **FIX-002** | ✅ | Quitar pestaña/panel «Referencias» del lateral del manuscrito | Bajo | [`fix-backlog.md` §4](fix-backlog.md) · [**plan detallado**](plans/FIX-002-remove-references-panel.md) |
| **FIX-003** | ✅ | Botón carpeta: abrir raíz del proyecto en el SO (manuscrito/WB) | Bajo | [`fix-backlog.md` §5](fix-backlog.md) · [**plan detallado**](plans/FIX-003-open-folder-os.md) |

---

## Fase B — Fixes medianos (editor / manuscrito)

| ID | Estado | Tarea | Esfuerzo | Spec / referencia |
|----|--------|-------|----------|-------------------|
| **FIX-004** | ✅ | Escritura: clic en zona vacía inferior enfoca el editor | Medio | [`fix-backlog.md` §8.A](fix-backlog.md) · [**plan detallado**](plans/FIX-004-click-empty-focus.md) |
| **FIX-005** | ✅ | Guardado fiel a espacios y saltos de línea (sin `trim` en cadena extract→disco) | Medio | [`fix-backlog.md` §8.B](fix-backlog.md) · [**plan detallado**](plans/FIX-005-whitespace-persist.md) |
| **FIX-006** | ✅ | Rediseño marco de evento: chips unificados, fecha ISO, esquinas overlay | Medio–Alto | [FIX-006](plans/FIX-006-event-frame-redesign.md) |
| **FIX-006.5** | ✅ | Interacciones marco: `[-]`/`[+]`, borrado two-step, contexto evento | Medio–Alto | [FIX-006.5](plans/FIX-006.5-event-frame-interactions.md) |
| **OBS-001** | ✅ | Módulo global de auditoría / registro del sistema (IPC, FS, stores, eventos) | Medio | [**plan detallado**](plans/OBS-001-system-audit-log.md) |
| **FIX-007** | ✅ | Borrador sucio persistente al cerrar la app | Medio | [`manuscript-design.md`](manuscript-design.md) §1 · [**plan detallado**](plans/FIX-007-dirty-draft-persist.md) |
| **FIX-012** | ✅ | Guardar: tabs estables, sin ghost, save-all sin switch (2b) | Medio | [**plan detallado**](plans/FIX-012-save-tab-navigation.md) |

> **OBS-001 antes de FIX-012:** diagnosticar con evidencia en `NarraLith/_debug/` (solo `tauri dev`; release sin debug).

---

## Fase C — Fixes explorador y timeline

| ID | Estado | Tarea | Esfuerzo | Spec / referencia |
|----|--------|-------|----------|-------------------|
| **FIX-008** | ⬜ | Crear archivo/carpeta inline en explorador (estilo VS Code) + fix `create_file` Rust | Medio | [`fix-backlog.md` §2](fix-backlog.md) · [**plan detallado**](plans/FIX-008-explorer-inline-create.md) |
| **FIX-009** | ⬜ | Timeline: chip doble (archivo + evento) y conectores por evento | Medio–Alto | [`fix-backlog.md` §3](fix-backlog.md) |

---

## Fase D — Épica «eliminar no rompe» (primeras entregas)

Marco completo en [`fix-backlog.md` §6](fix-backlog.md). Se implementa **por escenarios**; el documento sigue siendo vivo.

| ID | Estado | Tarea | Esfuerzo | Spec / referencia |
|----|--------|-------|----------|-------------------|
| **FIX-010** | ⬜ | **6.A** — Calendario sustituido: chips de tiempo inválidos en rojo | Alto (acotado) | [`fix-backlog.md` §6.A](fix-backlog.md) |
| **FIX-011** | ⬜ | **6.B** — Evento WB huérfano si se borra `+++event` del manuscrito | Alto (acotado) | [`fix-backlog.md` §6.B](fix-backlog.md) |

> Escenarios **6.C, 6.D…** se añaden a esta fase cuando el usuario los defina — no bloquean Era II ni MAP.

---

## Fase E — Cierre Era II (manuscrito v2)

Orden acordado en [`03-ROADMAP.md`](../03-ROADMAP.md) y [`manuscript-roadmap.md`](manuscript-roadmap.md): **después** de fixes que afecten el editor diario.

| ID | Estado | Tarea | Esfuerzo | Spec / referencia |
|----|--------|-------|----------|-------------------|
| **ERAII-001** | ⬜ | **M7** — Un solo modelo en memoria (`ParsedManuscript`; quitar adaptador legacy) | Alto | [`manuscript-roadmap.md` M7](manuscript-roadmap.md) · [`04-TASK.md` § II.4.1](../04-TASK.md) |
| **ERAII-002** | ⬜ | **M8** — QA manual checklist §7 | Medio | [`manuscript-design.md`](manuscript-design.md) §7 · [`04-TASK.md` § II.5.1](../04-TASK.md) |
| **ERAII-003** | ⬜ | **II.6** — Changelog v0.10.0 + marcar Era II cerrada en roadmap | Bajo | [`03-ROADMAP.md`](../03-ROADMAP.md) · [`05-CHANGELOG.md`](../05-CHANGELOG.md) |

**Criterio:** `cargo test` + `npm test` verdes; checklist §7 cerrada.

---

## Fase F — Refactor mapas (Era III)

Spec: [`maps-design.md`](maps-design.md). **Purgar casi todo** el código actual (`modules/maps/`, `maps_store.rs`) salvo lo que **MAP-000** marque como conservar.

Orden sugerido: **fundamentos → dibujo → tiempo → navegación → integración manuscrito (stub)**.

| ID | Estado | Tarea | Esfuerzo | Spec / referencia |
|----|--------|-------|----------|-------------------|
| **MAP-000** | ⬜ | Inventario **conservar vs purgar** + decisión stack (canvas/compositor) | Bajo | [`maps-design.md` §2](maps-design.md) · §6 pendientes |
| **MAP-001** | ⬜ | Modelo de datos y persistencia en disco (mapa, dibujos, capas, metadatos tiempo) | Alto | [`maps-design.md`](maps-design.md) — persistencia |
| **MAP-002** | ⬜ | Multi-mundo: N mapas por proyecto; apertura fijado / último visto / último modificado | Medio | [`maps-design.md` §3ter](maps-design.md) |
| **MAP-003** | ⬜ | Crear mapa: lienzo tamaño libre, relación de aspecto, expandir/recortar | Medio | [`maps-design.md` §3](maps-design.md) |
| **MAP-004** | ⬜ | Modos vista: **interactivo por defecto** + edición solo con ✏️ | Medio | [`maps-design.md` §8](maps-design.md) |
| **MAP-005** | ⬜ | Estudio dibujo: colores custom, pinceles, presión tableta (`pressure` 0–1) | Alto | [`maps-design.md` §3bis](maps-design.md) |
| **MAP-006** | ⬜ | Capas internas por archivo de dibujo | Medio | [`maps-design.md` §4.1](maps-design.md) |
| **MAP-007** | ⬜ | Dibujo principal: «Desde», terreno base | Medio | [`maps-design.md` §4.2](maps-design.md) |
| **MAP-008** | ⬜ | Secundarios: parches transparentes, visibilidad temporal, apilar vs `tiempo_fin` | Alto | [`maps-design.md` §4.3](maps-design.md) |
| **MAP-009** | ⬜ | Compositor + timeline del mapa (scrubber **T**) | Alto | [`maps-design.md` §4.4](maps-design.md) |
| **MAP-010** | ⬜ | Navegación interactiva: hotspots → dibujo hijo, breadcrumb/volver | Alto | [`maps-design.md` §5](maps-design.md) |
| **MAP-011** | ⬜ | Ubicaciones desde manuscrito: marcas **X** en T (stub Era III) | Medio | [`maps-design.md` §4bis.4.1](maps-design.md) |
| **MAP-012** | ⬜ | Smoke Era III + purga código mapas legacy | Medio | [`maps-design.md`](maps-design.md) · [`06-ARCHITECTURE.md`](../06-ARCHITECTURE.md) |

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
| 10 | FIX-008 | Explorador inline VS Code |
| 11 | FIX-009 | Timeline chips + conectores |
| 12 | FIX-010 | Épica 6.A calendario obsoleto |
| 13 | FIX-011 | Épica 6.B evento WB huérfano |
| 14 | ERAII-001 | M7 un solo modelo manuscrito |
| 15 | ERAII-002 | M8 QA manual §7 |
| 16 | ERAII-003 | Cierre v0.10.0 Era II |
| 17 | MAP-000 | Inventario purga mapas |
| 18 | MAP-001 | Persistencia mapas |
| 19 | MAP-002 | Multi-mundo |
| 20 | MAP-003 | Lienzo crear/expandir/recortar |
| 21 | MAP-004 | Modos interactivo / edición |
| 22 | MAP-005 | Estudio Sketchbook |
| 23 | MAP-006 | Capas internas |
| 24 | MAP-007 | Dibujo principal + Desde |
| 25 | MAP-008 | Secundarios temporales |
| 26 | MAP-009 | Compositor + timeline T |
| 27 | MAP-010 | Navegación hotspots |
| 28 | MAP-011 | Marcas X ubicación (stub) |
| 29 | MAP-012 | Smoke + purga legacy mapas |
| — | WB-* | Post-WB (aplazado) |

---

## Qué queda fuera de este plan (por ahora)

| Tema | Dónde | Cuándo |
|------|-------|--------|
| Grafo, versiones Git, exportación | [`03-ROADMAP.md`](../03-ROADMAP.md) Eras IV–V | Tras WB |
| Plothole | [`module-replan.md`](module-replan.md) | Era IV+ |
| Backlinks WB en nuevo panel | Tras ERAII-001 | Era II–IV |
| Detalle UX MAP (hotspot forma, asistente apilar/cerrar) | Se planifica al tomar MAP-008/010 | Era III |

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

---

**Última actualización:** 2026-06-11
