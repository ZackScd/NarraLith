# Roadmap — Módulo mapas (Era III)

> Orden de ejecución y dependencias para Fase F.  
> **Spec:** [`maps-design.md`](maps-design.md) · **Lista maestra:** [`implementation-plan.md`](implementation-plan.md) · **Inventario:** [`plans/Fase F/MAP-000-inventory-purge.md`](plans/Fase%20F/MAP-000-inventory-purge.md)

| Campo | Valor |
|-------|--------|
| **Era** | III (`03-ROADMAP.md`) |
| **Versión objetivo** | v0.11.x |
| **Estado** | MAP-000 ✅ · MAP-001 siguiente |

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
    │
    └──► MAP-012 smoke Era III + barrido deps/docs
```

---

## Tareas

| ID | Entregable | Spec | Depende de |
|----|------------|------|------------|
| **MAP-000** | Inventario + decisiones stack/persistencia/purga | §2 · §9 · [plan](plans/Fase%20F/MAP-000-inventory-purge.md) | — |
| **MAP-001** | Modelo datos + JSON en disco + IPC v2; **commit purga legacy** | §9 | MAP-000 |
| **MAP-002** | N mapas/proyecto; fijado / último visto / modificado | §3ter | MAP-001 |
| **MAP-003** | Crear mapa: tamaño libre, aspect ratio, expandir/recortar | §3 | MAP-002 |
| **MAP-004** | Interactivo por defecto; edición solo ✏️ | §8 | MAP-001 |
| **MAP-005** | Estudio Sketchbook: color custom, pinceles, presión; autosave | §3bis | MAP-004 |
| **MAP-006** | Capas internas por dibujo | §4.1 | MAP-005 |
| **MAP-007** | Dibujo principal + etiqueta «Desde» | §4.2 | MAP-001 |
| **MAP-008** | Secundarios: parches transparentes, visibilidad T | §4.3 | MAP-007 |
| **MAP-009** | Compositor + timeline T | §4.4 | MAP-008 |
| **MAP-010** | Hotspots → dibujo hijo; volver | §5 | MAP-004, MAP-009 |
| **MAP-011** | Ubicaciones MS → marcas **X** en T (stub) | §4bis.4.1 | MAP-009, manuscrito |
| **MAP-012** | Smoke QA + quitar Leaflet/Excalidraw + grep restos | §2 | todo lo anterior |

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

**Última actualización:** 2026-06-11
