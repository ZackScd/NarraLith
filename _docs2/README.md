# Documentación NarraLith (`_docs2/`)

Fuente de verdad para planificación y ejecución desde jun 2026.

## Relación con `_docs/`

| Carpeta | Rol |
|---------|-----|
| **`_docs2/`** | Vigente |
| **`_docs/`** | Archivo histórico (roadmap ideal v0.1–v0.9, auditorías del refactor) |

---

## Cadena documental (formato original, contenido nuevo)

```text
01-REQUIREMENTS.md   → QUÉ (producto, estado por área)
02-TECH_STACK.md     → CON QUÉ (dependencias reales)
03-ROADMAP.md        → CUÁNDO (eras / fases macro)
04-TASK.md           → AHORA (una fase activa detallada)
05-CHANGELOG.md      → HECHO (versiones cerradas)
```

**Specs profundas** (refactors como el manuscrito) — estilo `plan.md` + `plan_roadmap.md`:

```text
specs/implementation-plan.md → lista maestra ordenada (fixes → refactors)
specs/fix-backlog.md           → detalle fixes UX/manuscrito
specs/manuscript-design.md     → diseño manuscrito cerrado
specs/manuscript-roadmap.md    → ejecución manuscrito M1–M8
specs/maps-design.md           → diseño mapas (Era III)
specs/module-replan.md         → decisiones globales módulos
```

No duplicar auditorías en varios archivos: diseño en `specs/`, progreso en `04-TASK`, histórico en `05-CHANGELOG`.

---

## Índice

| Archivo | Estado |
|---------|--------|
| [01-REQUIREMENTS.md](01-REQUIREMENTS.md) | ✅ |
| [02-TECH_STACK.md](02-TECH_STACK.md) | ✅ |
| [03-ROADMAP.md](03-ROADMAP.md) | ✅ Eras I–VI |
| [04-TASK.md](04-TASK.md) | ✅ Era II activa |
| [05-CHANGELOG.md](05-CHANGELOG.md) | ✅ Era I archivada + hueco |
| [06-ARCHITECTURE.md](06-ARCHITECTURE.md) | ✅ Mapa jun 2026 |
| [07-GUIDELINES-LLMs.md](07-GUIDELINES-LLMs.md) | ✅ |
| [specs/implementation-plan.md](specs/implementation-plan.md) | 📋 Lista maestra fixes → Era II → Era III |
| [specs/fix-backlog.md](specs/fix-backlog.md) | 📋 Fixes UX (detalle por tarea) |
| [specs/manuscript-design.md](specs/manuscript-design.md) | ✅ Sustituye `plan.md` §1 |
| [specs/manuscript-roadmap.md](specs/manuscript-roadmap.md) | ✅ Sustituye `plan_roadmap.md` |
| [specs/maps-design.md](specs/maps-design.md) | 🔄 Diseño mapas Era III |
| [specs/module-replan.md](specs/module-replan.md) | 🔄 Decisiones módulos |

**Archivo histórico del refactor:** `_docs/archive/manuscript-refactor/` (auditoría completa).

---

## Convenciones de estado

| Etiqueta | Significado |
|----------|-------------|
| **✅** | Implementado / doc cerrado |
| **🟡** | Parcial |
| **⏸** | Congelado |
| **📋** | Planificado |
| **❌** | Descartado |

---

## Reglas de actualización

1. Cerrar trabajo → `05-CHANGELOG` + limpiar `04-TASK` + marcar `03-ROADMAP`
2. Cambio de producto → `01-REQUIREMENTS`
3. Cambio técnico → `02-TECH_STACK`
4. Refactor grande → `specs/*.md` (diseño + roadmap de ejecución)

**Última revisión:** 2026-06-06
