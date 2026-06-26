# Planes de implementación

Cada tarea con alcance no trivial tiene un **plan markdown** antes de codificar. El cierre vive en el propio plan (§ Registro / evidencia QA) + fila ✅ en [`../implementation-plan.md`](../implementation-plan.md).

---

## Carpetas

| Ruta | Uso |
|------|-----|
| **`Fase F/`**, **`Fase G/`**, … | Planes **activos** (próximo: **MAP-014** shell flotante · **MAP-015** ventana capas) |
| **[`_archive/`](_archive/)** | Fases **cerradas** A–E — consulta histórica |

El prefijo `_` en `_archive/` mantiene el histórico arriba en el explorador sin mezclarlo con trabajo nuevo.

---

## Flujo

1. Entrada en `implementation-plan.md` (ID + spec).
2. Plan detallado aquí (`Fase */ID-nombre.md`).
3. Ejecutar → OBS si aplica → § Registro del plan.
4. Marcar ✅ en lista maestra.

Ver también [`../../README.md`](../../README.md) (flujo IA completo).

---

## Deuda / pospuestos de fases archivadas

**Índice consolidado:** [`_archive/DEFERRED.md`](_archive/DEFERRED.md)

No duplica la lista maestra de trabajo futuro (MAP, WB, FIX-010e…) — eso sigue en [`../implementation-plan.md`](../implementation-plan.md).  
`DEFERRED.md` recoge lo **rezagado dentro de planes ya archivados**: QA manual no recorrido, ítems ⏸, afinado post-Era II.

**Afinado manuscrito (transversal):** [`../manuscript-roadmap.md` § Afinado final](../manuscript-roadmap.md) — fuente canónica para §7 residual + dead code.

---

**Última revisión:** 2026-06-25 (MAP-014 panel flotante)
