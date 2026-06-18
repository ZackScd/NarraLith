# Documentación NarraLith

Fuente de verdad del proyecto (jun 2026).

---

## Estructura activa

```text
_docs/
├── README.md                 ← este archivo
├── 01-REQUIREMENTS.md        ← QUÉ (producto, filosofía, estado por área)
├── 02-TECH_STACK.md          ← CON QUÉ (stack real + reglas licencias)
├── 03-ROADMAP.md             ← CUÁNDO (eras macro)
└── specs/
    ├── implementation-plan.md   ← lista maestra · qué sigue
    ├── fix-backlog.md           ← detalle fixes (consulta / histórico)
    ├── manuscript-design.md     ← diseño manuscrito cerrado
    ├── manuscript-roadmap.md    ← ejecución manuscrito M1–M8
    ├── maps-design.md           ← diseño mapas (Era III)
    ├── module-replan.md         ← decisiones globales módulos
    └── plans/
        ├── README.md              ← índice planes + enlace DEFERRED
        ├── _archive/              ← Fases A–E ✅
        │   ├── DEFERRED.md        ← QA/ítems pospuestos archivados
        │   └── Fase A/ … E/
        └── Fase F/ …              ← activos
```

---

## Flujo de trabajo (IA + desarrollo)

1. **Documentar** idea o cambio (spec de diseño si afecta producto).
2. **Listar** en [`specs/implementation-plan.md`](specs/implementation-plan.md).
3. **Auditar** código existente antes de tocar.
4. **Recorrido OBS** en `npm run tauri dev` si hace falta evidencia (`NarraLith/_debug/`).
5. **Planificar** en [`specs/plans/Fase */`](specs/plans/) — plan detallado antes de código.
6. *(Opcional)* Repetir 3–5 si el alcance cambia.
7. **Ejecutar** el plan.
8. **Verificar** — `npm test`, `cargo test`, QA manual; cerrar plan §8 + fila ✅ en lista maestra.

**Cierre de tarea:** plan `§ Registro` + fila en `implementation-plan.md`. No hay cadena `04-TASK` / `05-CHANGELOG` activa.

---

## Archivo

| Ruta | Contenido |
|------|-----------|
| [`archive/legacy-docs-v1/`](archive/legacy-docs-v1/) | `_docs/` original (roadmap ideal v0.1–v0.9) |
| [`archive/retired-cadence/`](archive/retired-cadence/) | `04-TASK`, `05-CHANGELOG`, `06-ARCHITECTURE`, `07-GUIDELINES` (cadena obsoleta) |
| [`specs/plans/_archive/`](specs/plans/_archive/) | Planes Fases A–E ✅ |

---

## Convenciones

| Etiqueta | Significado |
|----------|-------------|
| ✅ | Cerrado |
| 🔄 | En curso |
| ⬜ | Pendiente |
| ⏸ | Aplazado |

**Última revisión:** 2026-06-11
