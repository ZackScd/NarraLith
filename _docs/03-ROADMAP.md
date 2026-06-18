# Roadmap — NarraLith

Planificación **macro** desde jun 2026. Sustituye `_docs/03-ROADMAP.md` (fases 0–12 del escenario ideal).

> **Documentación:** [`README.md`](README.md) · [`specs/implementation-plan.md`](specs/implementation-plan.md) (lista maestra) · [`specs/plans/`](specs/plans/) (ejecución por tarea).

---

## Por qué un roadmap nuevo

El roadmap original asumía un camino lineal hasta v0.10 exportación. Tras **v0.9.0** (grafo), el desarrollo divergió:

- Refactor de **manuscrito** (eventos, inline tags) — no estaba en el roadmap original.
- **Calendario/timeline** re-adaptados al nuevo formato — trabajo no reflejado en `04-TASK`.
- Features **implementadas al lote** (mapas, grafo, versiones UI) sin integración cerrada.
- Documentación congelada ~commit `c819bc6` en adelante.

Este roadmap parte del **código y la deuda real**, no del escenario ideal.

### Visión de producto (jun 2026)

- **No hay MVP recortado:** al salir a producción se espera una versión **completa y estable** de todo lo planificado (manuscrito, worldbuilding, tiempo, ubicación, grafos, versiones).
- **Orden de reparación** (acordado): **manuscrito → mapas → worldbuilding** (WB depende de manuscrito y mapas).
- **UI de módulos rotos:** no ocultar; marcar con **✗** lo que no funcione.
- **Usuario actual:** un solo desarrollador/usuario; objetivo producto serio para usuarios finales; desarrollo asistido por IA.

---

## Eras del proyecto

| Era | Versión | Estado | Resumen |
|-----|---------|--------|---------|
| **I — Cimientos** | v0.1.0 – v0.9.0 | ✅ Cerrada | FS, parser legacy, WB, refs, calendario v1, mapas, grafo |
| **II — Manuscrito v2** | v0.10.x | ✅ **Cerrada** | Eventos `+++event`, editor Lexical, tiempo multi-marca, estabilización |
| **III — Espacio** | v0.11.x | 📋 **Siguiente (código)** | Ubicación inline + reintegración mapas |
| **IV — Confianza** | v0.12.x | 📋 | Versiones Git, QA transversal, deuda UI rota |
| **V — Salida** | v0.13.x | 📋 | Exportación editorial |
| **VI — QoL y futuro** | — | 📋 | Focus mode, dashboard, plugins, P2P |

La Era I **no se rehace**. Histórico: [`archive/legacy-docs-v1/05-CHANGELOG.md`](archive/legacy-docs-v1/05-CHANGELOG.md) · Era II v0.10.0: [`archive/retired-cadence/05-CHANGELOG.md`](archive/retired-cadence/05-CHANGELOG.md).

---

## Era II — Manuscrito v2 ✅ (cerrada 2026-06-11)

**Versión:** v0.10.0 · **Changelog:** [`05-CHANGELOG.md`](archive/retired-cadence/05-CHANGELOG.md)

**Spec de diseño:** [`specs/manuscript-design.md`](specs/manuscript-design.md)  
**Plan de ejecución:** [`specs/manuscript-roadmap.md`](specs/manuscript-roadmap.md)

| Fase | Nombre | Estado | Entregable clave |
|------|--------|--------|------------------|
| II.0 | Documentación limpia | ✅ | `_docs/` completo |
| II.1 | Backend parser + SQLite | ✅ | `+++event`, `time_markers` v5, tests |
| II.2 | IPC + tipos TS | ✅ | `read/save_manuscript` |
| II.3 | Lexical + panel | ✅ | Eventos, inline, staging |
| II.4 | Estabilización editor | ✅ | Un modelo en memoria (M7) |
| II.5 | QA manual | ✅ | Smoke M8; §7 residual → Afinado |
| II.6 | Cierre Era II | ✅ | Changelog v0.10.0 |

**Próximo paso acordado (jun 2026):** **ordenar documentación** `_docs/` — **no** abrir Fase F (MAP) hasta completar esa pasada.

---

## Era III — Mapas y espacio (planificada)

**Objetivo:** **Rehacer el sistema de mapas** y, sobre esa base, ubicación en manuscrito.

| Entregable | Notas |
|------------|-------|
| Reintegración mapas ↔ entidades | Prioridad antes de WB v2 |
| `{{location:…}}` inline + `barTags` | Mismo patrón que tiempo |
| Panel / picker de ubicación | Incl. mapa interno del proyecto (futuro) |
| Smoke test mapas ↔ manuscrito | Código Leaflet existe — ⏸ hasta MAP (Era III) |

---

## Era IV — Worldbuilding y confianza (planificada)

**Objetivo:** **Rehacer worldbuilding** (tras manuscrito + mapas) y reparar features “existen pero rotas”; integridad FS↔SQLite verificada.

| Área | Situación actual |
|------|------------------|
| Worldbuilding v2 | Depende de manuscrito estable + mapas |
| Versiones Git | UI montada; `snapshot.rs` no compilado — marcar ✗ en UI |
| Grafo | ✅ índice; validar con manuscrito v2 |
| Backlinks panel | 🟡 índices legacy en navegación |

---

## Era V — Salida (planificada)

Motor de exportación (DOCX, PDF, EPUB, Wiki HTML, zip). Hereda requisitos originales Fase 9 del roadmap archivado.

---

## Era VI — Futuro (sin fecha)

Focus mode, dashboard, plugins, P2P. Ver visión en `01-REQUIREMENTS.md` §12.

---

## Qué hacer con el roadmap archivado

| Archivo `_docs/` | Tratamiento |
|------------------|-------------|
| `03-ROADMAP.md` | Solo consulta histórica |
| `04-TASK.md` | Congelado en Fase 9 ficticia |
| `05-CHANGELOG.md` | Copiado a `_docs/05-CHANGELOG.md` como historial I |
| `plan.md` | Archivo en `archive/manuscript-refactor/`; vigente: `specs/manuscript-design.md` |
| `plan_roadmap.md` | Archivo en `archive/manuscript-refactor/`; vigente: `specs/manuscript-roadmap.md` |

---

## Resumen visual

```mermaid
flowchart LR
  E1[Era I v0.1-0.9]
  E2[Era II v0.10 Manuscrito]
  E3[Era III Espacio]
  E4[Era IV Confianza]
  E5[Era V Export]
  E6[Era VI Futuro]

  E1 --> E2
  E2 --> E3
  E3 --> E4
  E4 --> E5
  E5 --> E6
```

**Regla:** Era II cerrada 2026-06-11. Era III (MAP) tras ordenar documentación.

**Última actualización:** 2026-06-11
