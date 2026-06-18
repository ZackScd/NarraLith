# Replanteo de módulos — jun 2026

Documento de trabajo para cerrar decisiones de producto antes de refactorizar módulos fuera del manuscrito.

> **Fuente de verdad vigente:** `_docs2/` · **Histórico:** `_docs/` (solo consulta)

---

## Decisiones ya cerradas (no re-preguntar)

| Tema | Decisión |
|------|----------|
| Alcance producto | Completo y estable en producción; sin MVP recortado |
| Orden de reparación | Manuscrito → **mapas** → **worldbuilding** |
| UI rota | Visible con **✗**, no ocultar |
| Modelo manuscrito | `+++event`, `barTags`, `{{time:…}}`; solo evento crea bloque |
| Sync eventos | Ficha en `Worldbuilding/Eventos/` al guardar |
| Panel manuscrito | Evento + Tiempo + Referencias; futuro: ubicación desde mapa |
| Tiempo dos capas | `barTags` = origen, inline = evolución (**mantener**) |
| Guardado disco | Manual (Ctrl+S / Guardar todo); borrador sucio persistente al cerrar (FIX-007 ✅); diff opcional FIX-013 ⬜ |
| `[-]` / `[+]` | Un solo botón contextual |
| Toggle etiquetas | Persistente en `localStorage` |
| `ParsedDocument` adaptador | ✅ Eliminado del flujo activo (II.4.1 / M7, 2026-06-11); afinado dead code → roadmap § Afinado |
| Escenas paralelas (carpeta especial) | No implementado; **descartado** salvo que se reabra explícitamente |
| Rangos CRDT intra-párrafo | Descartado → tokens inline |
| Migración formato `+++` legacy | No hay proyectos en circulación |

---

## Estado real por módulo (código + docs)

| Módulo | Estado | Era objetivo | Acción |
|--------|--------|--------------|--------|
| Manuscrito / editor | ✅ Era II cerrada (v0.10.0) | II | Afinado §7 residual opcional; MAP tras orden doc |
| Tiempo / calendario TS | ✅ motor; 🟡 UX E2E | II | Validar con manuscrito |
| Timeline global | ✅ backend v5; 🟡 UX | II–III | Re-test tras II.5 |
| Plothole | 🟡 legacy metadata | IV | ✗ hasta ubicación inline |
| WB fichas base | ✅ CRUD + plantillas | IV | Rehacer tras mapas |
| Referencias / wikilinks | ✅ core; 🟡 backlinks legacy | II–IV | Tras II.4 |
| Explorador / FS | ✅ CRUD + DnD parcial | IV | QA tras renames |
| Mapas | 🟡 mucho código, sin validar | **III** | **Rehacer** — spec en [`maps-design.md`](maps-design.md) 🔄 |
| Grafo | ⏸ índice OK | IV | ✗ + validar post-II |
| Versiones Git | 🟡 UI rota, snapshot no compila | IV | ✗ + reparar |
| Exportación | 📋 | V | Posponer |

---

## Preguntas abiertas (pendientes de respuesta)

Ver bloques 2–14 en la conversación de replanteo. Las respuestas se incorporan aquí y en `01-REQUIREMENTS.md` / `03-ROADMAP.md`.

---

**Última actualización:** 2026-06-06
