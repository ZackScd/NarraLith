# FIX-009a — Conectores en borde lateral + chips de ancho autoajustado

> Plan de refinamiento visual. **Estado:** ⬜ Pendiente (jun 2026) · **Esfuerzo:** Bajo–Medio · **Riesgo:** Bajo  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md) Fase C · **Depende de:** FIX-009 v1 (chip dual + links) 🔄  
> **Cierra gap:** QA [`session-1781319870943-19224`](../../../_debug/logs/session-1781319870943-19224.ndjson) + captura jun 2026 (chips demasiado anchos, conectores confusos)

---

## 1. Problema

### 1.1 Conectores — ancla incorrecta

FIX-009 v1 dibuja cada conector entre el **centro del borde inferior/superior** de las cajas (`linkAnchorForItem` en [`timelineGraphics.tsx`](../../../src/modules/timeline/timelineGraphics.tsx)).

Con varias marcas del mismo evento:
- Las líneas salen del **centro horizontal** del chip y pueden **cruzarse** con vástagos, texto u otras líneas.
- No se distingue claramente «sale de este cuadro → entra en aquel».
- El usuario pide anclar en la **mitad del segmento de borde lateral** (no el centro geométrico del rectángulo).

| Punto | Regla |
|-------|--------|
| Origen | Mitad del **borde lateral** por el que **sale** la línea (ej. borde **derecho** si el siguiente chip está a la derecha) |
| Destino | Mitad del **borde lateral** por el que **entra** la línea (ej. borde **izquierdo** del chip destino) |

> «Mitad del margen» = punto medio del **lado** del rectángulo `(x ± width/2, y + height/2)`.

### 1.2 Chips — margen horizontal excesivo

Hoy [`estimateLabelWidth`](../../../src/modules/timeline/timelineModel.ts) fuerza un ancho mínimo de **72px** y usa `length * 7 + 20`:

```typescript
// v1 — demasiado ancho para nombres cortos ("meow", "timelineTest")
Math.min(200, Math.max(72, label.length * 7 + 20));
```

Efecto visible (captura QA): cajas **mucho más anchas que el texto**, mucho padding vacío a los lados → peor solapamiento en X, conectores más largos y aspecto «bloques» en lugar de etiquetas.

El truncado en render (`truncateChipLine`, 22/18 chars) **no coincide** con el ancho estimado (usa `label.length` completo), así que el rect puede ser aún más grande de lo necesario o desalineado respecto al texto mostrado.

---

## 2. Objetivo

| # | Criterio |
|---|----------|
| **Conectores** | | |
| O1 | `linkEdgeAnchors(from, to)` sustituye `linkAnchorForItem` |
| O2 | `to.x > from.x` → borde **derecho** origen → borde **izquierdo** destino |
| O3 | `to.x < from.x` (flashback) → borde **izquierdo** → borde **derecho** |
| O4 | Misma X → fallback vertical (§4.3) |
| O5 | Sin cambio agrupación links (`segmentId + lane`, cronológico) |
| **Ancho chip** | | |
| O6 | Ancho = **texto visible** (post-truncado) + **padding horizontal mínimo**; sin piso artificial de 72px |
| O7 | Chip **simple** y **dual**: dual = `max(anchoLíneaSecundaria, anchoLíneaPrincipal)` |
| O8 | Nombres largos → truncar con `…` y **cap** de ancho máximo; límites de caracteres prudentes |
| O9 | **Una sola fuente de verdad** para truncado + medida (`timelineChipMetrics.ts` o exports compartidos entre `timelineModel` y `timelineGraphics`) |
| O10 | `assignLanes` / colisiones usan el nuevo ancho → menos solapamiento en zoom denso |
| **Cierre** | | |
| O11 | Tests geometría + tests ancho; smoke visual 3+ marcas |
| O12 | Tras QA, cierra FIX-009 ✅ en lista maestra |

### Fuera de alcance

- [FIX-009b](FIX-009b-timeline-writing-order-links.md) — hover orden escritura
- Routing ortogonal anti-cruce (backlog)
- Anuales banda inferior: mismo algoritmo de ancho si comparten `estimateChipWidth` (aplicar globalmente)

---

## 3. Estado actual del código

| Pieza | Comportamiento v1 | Gap |
|-------|-------------------|-----|
| `linkAnchorForItem` | Centro sup./inf. | → borde lateral |
| `estimateLabelWidth` | min **72**, +20 padding | → autoajuste mínimo |
| `truncateChipLine` | 22 / 18 chars en graphics | Desacoplado de estimate |
| `TimelineHorizontal` L783 | `width: estimateChipWidth(item)` | OK tras O6 |
| Mini timeline hover | `estimateChipWidth` / hardcoded | Alinear en misma fase |

---

## 4. Diseño — anclas en borde (sin cambio respecto a borrador previo)

### 4.1 `chipBounds` + `linkEdgeAnchors`

Ver §4.1–4.3 del plan anterior; resumen:

```typescript
const X_EPS = 4;

export function linkEdgeAnchors(from, to) {
  const a = chipBounds(from);
  const b = chipBounds(to);
  if (Math.abs(to.x - from.x) < X_EPS) return sameColumnAnchors(...);
  if (to.x > from.x) {
    return { from: { x: a.right, y: a.midY }, to: { x: b.left, y: b.midY } };
  }
  return { from: { x: a.left, y: a.midY }, to: { x: b.right, y: b.midY } };
}
```

### 4.2 Columna compartida (misma X)

| Banda | Salida | Entrada |
|-------|--------|---------|
| Manuscrito | centro borde **inferior** | centro borde **superior** |
| Below | centro borde **superior** | centro borde **inferior** |

---

## 5. Diseño — ancho autoajustado del chip

### 5.1 Principio

> El `<rect>` debe abrazar el texto mostrado con **margen horizontal mínimo**, no un ancho fijo generoso.

```
┌─ pad ─ text ─ pad ─┐   no   ┌────── mucho espacio vacío ──────┐
```

### 5.2 Constantes propuestas (centralizar)

| Constante | Valor | Notas |
|-----------|-------|--------|
| `CHIP_PAD_X` | **8** | 4px por lado; mismo orden de magnitud que padding vertical derivado |
| `CHIP_MIN_WIDTH` | **28** | Evita rect degenerado en "a" |
| `CHIP_MAX_WIDTH` | **168** | ~24 chars × 7px; antes 200 |
| `CHIP_TRUNC_SIMPLE` | **18** | Chip una línea / label principal |
| `CHIP_TRUNC_FILE` | **14** | Línea secundaria (archivo), más corta |
| `CHIP_TRUNC_EVENT` | **18** | Línea principal (evento) |
| `CHAR_W_PRIMARY` | **6.5** | 11px SVG ≈ 6–7px/glyph en UI actual |
| `CHAR_W_SECONDARY` | **6** | 10px fecha-style |

Ajuste fino ±1px en implementación; lo importante es **eliminar min 72** y medir **texto truncado**.

### 5.3 API compartida

Nuevo módulo recomendado: [`timelineChipMetrics.ts`](../../../src/modules/timeline/timelineChipMetrics.ts)

```typescript
export function truncateForChip(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

export function measureLineWidth(
  text: string,
  maxLen: number,
  charWidth: number,
): number {
  const visible = truncateForChip(text, maxLen);
  return Math.min(
    CHIP_MAX_WIDTH,
    Math.max(CHIP_MIN_WIDTH, Math.ceil(visible.length * charWidth) + CHIP_PAD_X),
  );
}

export function estimateChipWidth(
  item: Pick<TimelineDisplayItem, "label" | "fileLabel" | "eventLabel">,
): number {
  if (item.eventLabel) {
    return Math.max(
      measureLineWidth(item.fileLabel, CHIP_TRUNC_FILE, CHAR_W_SECONDARY),
      measureLineWidth(item.eventLabel, CHIP_TRUNC_EVENT, CHAR_W_PRIMARY),
    );
  }
  return measureLineWidth(item.label, CHIP_TRUNC_SIMPLE, CHAR_W_PRIMARY);
}
```

`TimelineChip` importa `truncateForChip` + mismos `CHIP_TRUNC_*` para que **rect.width === estimateChipWidth(item)** siempre.

### 5.4 Ejemplos esperados (orden de magnitud)

| Texto | v1 width (aprox.) | v2 width (aprox.) |
|-------|-------------------|-------------------|
| `meow` | 72 (min) | ~34 |
| `timelineTest` | 90 | ~88 |
| `eventoTest` + `meow` dual | max(72, 90) | max(~34, ~88) |
| Nombre 40 chars | 200 (cap) | 168 (cap) + truncado visual |

### 5.5 Impacto en layout

- `assignLanes` en [`timelineLayoutHelpers.ts`](../../../src/modules/timeline/timelineLayoutHelpers.ts) usa `item.width` ya asignado → carriles más estrechos, **menos** falsos positivos de colisión.
- Conectores laterales (O2) ganan claridad al acortar segmentos horizontales.
- Revisar `MANUSCRIPT_LANE_STEP` / `BELOW_LANE_HEIGHT` solo si QA muestra solape vertical (probablemente OK).

### 5.6 Superficies a alinear

| Superficie | Acción |
|------------|--------|
| `timelineModel.ts` | Re-export o delegar `estimateChipWidth` → metrics |
| `timelineGraphics.tsx` | Import trunc + width constants; quitar duplicados |
| `TimelineHorizontal.tsx` | Sin cambio de callsite |
| `TimeTagMiniTimeline.tsx` | Usar mismo `estimateChipWidth` + trunc en hover |
| Chips anuales (simple) | Benefician del nuevo min/max |

---

## 6. Implementación por fases

### Fase A — `timelineChipMetrics` + tests ancho

- [ ] Crear `timelineChipMetrics.ts` + `timelineChipMetrics.test.ts`
- [ ] Casos: nombre corto, dual max líneas, truncado largo, min/max width
- [ ] Migrar `estimateChipWidth` desde `timelineModel.ts`
- [ ] Actualizar `TimelineChip` truncado vía metrics

### Fase B — `linkEdgeAnchors` + tests geometría

- [ ] `chipBounds`, `linkEdgeAnchors`, `sameColumnAnchors` en `timelineGraphics.tsx`
- [ ] `timelineGraphics.test.ts`: derecha→izq., izq.→der., misma X, below lane
- [ ] Eliminar `linkAnchorForItem`

### Fase C — Integración

- [ ] `TimelineHorizontal`: `linkEdgeAnchors(from, to)`
- [ ] `TimeTagMiniTimeline`: hover usa metrics compartidos
- [ ] `npm test` + `npm run build`

### Fase D — QA visual

| # | Acción | Esperado |
|---|--------|----------|
| R1 | Nombre corto (`meow`) | Caja ~ajustada al texto, no 72px |
| R2 | Dual `timeline test` / `timelineTest` | Ancho = max de ambas líneas truncadas |
| R3 | Nombre muy largo | Truncado `…`, ancho ≤ max |
| R4 | 2 marcas → derecha | Conector borde der. → izq. |
| R5 | Flashback | Conector borde izq. → der. |
| R6 | 3+ marcas + toggle OFF | Sin regresión |

---

## 7. Decisiones

| ID | Decisión |
|----|----------|
| **D1** | Anclas = mitad del **borde lateral**, no centro del rect |
| **D2** | Ancho chip = f(texto **visible** truncado) + `CHIP_PAD_X`; **sin** min 72 |
| **D3** | Truncado y medida en **un solo módulo** compartido |
| **D4** | Límites: archivo 14, evento/simple 18 chars visibles |
| **D5** | `CHIP_MAX_WIDTH` 168 (ajustable en QA; prioridad: no bloques vacíos) |

---

## 8. Checklist de cierre

```
[ ] timelineChipMetrics + tests ancho
[ ] TimelineChip + estimateChipWidth alineados
[ ] linkEdgeAnchors + tests geometría
[ ] TimelineHorizontal + mini timeline
[ ] QA R1–R6
[ ] FIX-009 padre → ✅
[ ] implementation-plan.md FIX-009a ✅
```

---

## 9. Registro

| Fecha | Cambio |
|-------|--------|
| 2026-06-11 | Plan: anclas borde lateral |
| 2026-06-11 | Ampliado: ancho autoajustado, eliminar min 72px, metrics compartidos trunc+width |

---

**Última actualización:** 2026-06-11 · **Estado:** ⬜ Pendiente
