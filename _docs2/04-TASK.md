# Gestión de tareas — NarraLith

Puente entre `03-ROADMAP.md` y el código. **Solo una fase activa** se detalla aquí. Al cerrarla → entrada en `05-CHANGELOG.md` y avance del roadmap.

> **Directrices:** `_docs/07-GUIDELINES-LLMs.md` (pendiente copia a `_docs2/`).  
> **Requisitos:** `01-REQUIREMENTS.md` · **Stack:** `02-TECH_STACK.md`

---

## Fases completadas (Era I — archivo)

| Era / Fase | Versión | Referencia |
|------------|---------|------------|
| I — Cimientos … Grafo | v0.1.0 – v0.9.0 | `05-CHANGELOG.md` |

> Tras v0.9.0 el seguimiento en `_docs/04-TASK.md` dejó de actualizarse (~`c819bc6`). El trabajo de refactor no pasó por esta cadena hasta ahora.

---

## Fase activa — Era II.0 + II.4

| Campo | Valor |
|-------|--------|
| **Roadmap** | `03-ROADMAP.md` § Era II |
| **Versión objetivo** | v0.10.0 (al cerrar II.6) |
| **Spec** | `specs/manuscript-design.md`, `specs/manuscript-roadmap.md` |
| **Estado** | 🔄 En curso |

### Objetivo de esta tarea

1. **Documentación:** establecer `_docs2/` como fuente de verdad (esta cadena 03→04→05).
2. **Código (siguiente):** estabilizar editor manuscrito — fases II.4–II.5 del spec.

---

### Tarea II.0.1 — Cadena documental `_docs2/`

#### Contexto

`_docs/` mezcla roadmap ideal, auditorías del refactor, y estado contradictorio. Se necesita un flujo claro como el original (roadmap → task → changelog) pero honesto.

#### Checklist

- [x] `01-REQUIREMENTS.md` — visión + estado real
- [x] `02-TECH_STACK.md` — stack alineado al repo
- [x] `03-ROADMAP.md` — eras nuevas
- [x] `04-TASK.md` — este archivo
- [x] `05-CHANGELOG.md` — historial Era I + hueco documentado
- [x] `specs/manuscript-design.md` — diseño cerrado (sustituye `plan.md` §1)
- [x] `specs/manuscript-roadmap.md` — ejecución refactor (sustituye `plan_roadmap.md`)
- [x] `06-ARCHITECTURE.md` — mapa de módulos actual
- [x] `07-GUIDELINES-LLMs.md`
- [x] `plan.md` / `plan_roadmap.md` → `_docs/archive/manuscript-refactor/` + stubs
- [x] Nota de deprecación en `_docs/README.md` → apunta a `_docs2/`

#### Criterio de salida

README de `_docs2/` enlaza toda la cadena; no hay dos roadmaps “vivos”.

---

### Tarea II.4.1 — Editor: un solo modelo en memoria

> **Depende de:** II.1–II.3 (código ya en repo). **Bloquea:** II.5 QA.

#### Contexto

El store mantiene `ParsedManuscript` + `ParsedDocument` adaptado. Paneles y backlinks usan índices legacy. Esto apila bugs de integración aunque Rust compile.

**Decisión jun 2026:** mantener el adaptador hasta cerrar II.5 (guardado con eventos, QA manual). Eliminarlo antes rompe paneles sin ganancia inmediata; la migración sigue en II.4.1 cuando el manuscrito sea fiable.

#### Impacto

| Capa | Archivos principales |
|------|----------------------|
| Frontend | `useEditorStore.ts`, `manuscriptBlocks.ts`, `sidePanel/*`, `BacklinksPanel.tsx` |
| Eliminar | Adaptador `manuscriptToParsedDocument`, nodos Lexical legacy |

#### Checklist

- [ ] Store manuscrito: solo `ParsedManuscript` en RAM
- [ ] Paneles evento/tiempo leen segmentos, no `document.blocks`
- [ ] Eliminar registro/hidratación `BlockSeparatorNode`, `BlockMetadataNode`
- [ ] `npm run build` + `npm test` verdes
- [ ] Smoke manual: abrir escena → crear evento → tiempo inline → guardar → reabrir

#### Criterio de salida

Ninguna importación activa de `ParsedDocument` en flujo manuscrito (salvo tests si aplica).

---

### Tarea II.5.1 — QA manual manuscrito

#### Checklist (resumen — detalle en `specs/manuscript-design.md`)

- [ ] Toggle etiquetas OFF/ON sin huecos
- [ ] Evento solo nombre → sin `barTags`, sin timeline
- [ ] Tiempo staging → `barTags`; inline en cursor → `{{time:…}}`
- [ ] Commit RAM sin disco; Ctrl+S persiste §1.4
- [ ] `[-]` / `[+]` según reglas
- [ ] Ficha `Worldbuilding/Eventos/` + `[[nombre]]`
- [ ] Renombrar evento al guardar

#### Criterio de salida

Todos los ítems marcados; bugs encontrados → fix antes de II.6.

---

## Plantilla para próximas tareas

```markdown
### Tarea [Era.Fase.Nº]: [Nombre]

#### Contexto
…

#### Impacto
- **Frontend:** …
- **Backend:** …
- **DB / FS:** …

#### Checklist
- [ ] Paso 1
- [ ] Paso 2

#### Criterio de salida
…
```

---

## Histórico de ejecución (Era II)

| Tarea | Estado | Notas |
|-------|--------|-------|
| II.0.1 Cadena `_docs2/` | ✅ | 2026-06-06 |
| II.4.1 Un solo modelo | ⬜ | Siguiente código |
| II.5.1 QA manual | ⬜ | Tras II.4 |
| II.6 Changelog v0.10.0 | ⬜ | Cierre Era II |
