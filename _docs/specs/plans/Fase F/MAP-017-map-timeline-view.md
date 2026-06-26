# MAP-017 — Línea de tiempo del mapa (diseño proyecto + eje sparse)

> **Estado:** 📋 **Planificado** (2026-06-25)  
> **Tipo:** Replanteo UI timeline mapa + reglas ubicación constante  
> **Spec:** [`maps-design.md`](../../maps-design.md) §4.4 · §4bis.1  
> **Supersede:** MAP-009 UI (`MapTimelineBar` scrubber compacto) — **conservar** lógica T, `mapTimelineRange`, OBS  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md)

| Campo | Valor |
|-------|--------|
| **Prioridad** | P0 — consumo espacio-temporal del módulo |
| **Esfuerzo** | Alto |
| **Referencia UX** | Shell `TimelineHorizontal` (eje sparse, ‹ ›, ±) · **marcas = puntos** (no chips) |

---

## 0. Decisiones de producto (usuario 2026-06-25)

### A — Shell como timeline proyecto; marcas = puntos

La timeline del **mapa** comparte el **armazón** de la del proyecto (`TimelineView` / `TimelineHorizontal`):

- Eje **sparse** (solo fechas con marcas).
- Flechas **‹ ›**, zoom **±**.
- Indicador **Vista en T** (cursor / fecha activa).

**En el eje no hay chips ni stems** — solo **puntos** sobre cada marca de tiempo:

| Punto | Cuándo | Color |
|-------|--------|-------|
| **Desde** | Fecha `map.desde` (año 0 local del mapa) | **Negro** ● |
| **Cualquier otra marca** | Parche inicio/fin, ubicación fechada, etc. | **Blanco** ○ |

| Regla | Detalle |
|-------|---------|
| **Un punto por fecha** | Si varios eventos comparten el mismo día → **un solo** punto (blanco salvo que sea Desde) |
| **Desde único** | Como máximo **un** punto negro — siempre `map.desde` |
| **Tooltip** | Hover opcional: detalle de eventos ese día (parches, ubicaciones) |
| **Clic** | Punto → `onPreviewTChange(raw, "mapTimelineDot")` |

```text
┌──────────────────────────────────────────────┐
│  [∞ constantes]  (lane ubicaciones sin fecha) │
├──────────────────────────────────────────────┤
│   ○───────●───────○───────○    Vista en T   │
│         negro=Desde              2025-07-15  │
│   ‹  ›                              ±  ±     │
└──────────────────────────────────────────────┘
```

**No** usar `TimelineChip` / conectores en mapa — componente nuevo `MapTimelineDot`.

### B — Solo eventos con cambio en el mapa

La timeline mapa lista únicamente marcas relevantes para el **espacio**:

| Incluir | Excluir |
|---------|---------|
| Inicio/fin de **parches** secundarios | Eventos MS solo narrativos sin ubicación ni parche |
| **Ubicaciones** manuscrito (fechadas o constantes) | Eventos anuales calendario (salvo afecten mapa — post-WB) |
| Marca **Desde** del mapa | Años/meses sin ninguna marca |

### C — Ubicación y tiempo

| Regla | Detalle |
|-------|---------|
| **Acoplamiento** | Ubicación hereda última marca **time** del segmento (§4bis.1) — ya spec |
| **Opcional** | Ubicación puede existir **sin** marca time obligatoria en el manuscrito |
| **Sin time previo** | Ubicación = **constante**: lane ∞ fuera del eje; en mapa @ T **siempre** visible |
| **Con time** | Contribuye al **punto blanco** de su fecha; mapa solo @ ese día |

### D — Eje sparse (fechas vacías ocultas)

> La timeline mapa muestra **únicamente fechas con marcas**. Los meses/días sin eventos **nunca** aparecen en el eje.

- Equivalente a `buildCollapsedScale(collapseDeadTime: true)` del timeline proyecto, pero **siempre activo**: solo posiciones X para días con ≥1 marca.
- Entre dos fechas con marcas no hay «espacio muerto» calendario — el eje **salta** de punto a punto.

```text
Proyecto (puede mostrar Mar–Jun vacíos):  [Ene][Feb]…[Jul][Ago]…[Dic]
Mapa (solo marcas):                        [Ene] ··· [Jul 15][Oct 23] ···
                                            ↑ salto visual, sin meses vacíos
```

---

## 1. Estado actual

| Pieza | Archivo | Hoy |
|-------|---------|-----|
| Barra mapa | `MapTimelineBar.tsx` | Scrubber lineal + ticks + marcadores parche; **sin** chips mes |
| Rango T | `mapTimelineRange.ts` | `desde` + secundarios + padding continuo |
| Escala | `mapTimelineScale.ts` | Eje **continuo** día a día |
| Timeline proyecto | `TimelineHorizontal.tsx` | Chips, `buildCollapsedScale`, `buildCompactYearBarLayout` |
| Ubicaciones | `location_occurrences/mod.rs` | **Descarta** location sin `effective_time` previo |
| Filtro @ T | `mapLocationAtT.ts` | Igualdad exacta día; sin constantes |

---

## 2. Modelo de datos — `MapTimelineItem`

Nuevo módulo `src/lib/maps/mapTimelineModel.ts`:

```typescript
type MapTimelineItemKind =
  | "desde"
  | "patchStart"
  | "patchEnd"
  | "location"
  | "locationConstant";

interface MapTimelineItem {
  id: string;
  kind: MapTimelineItemKind;
  label: string;
  sortKey: bigint | null; // null solo para constant
  rawTime: string | null;
  secondaryId?: string;
  locationKey?: string;
  lane: "above" | "below" | "constant";
}
```

### 2.1 Builder `buildMapTimelineItems` + dedupe puntos

| Entrada | Ítems internos |
|---------|----------------|
| `map.desde` | 1× `desde` |
| cada secundario | `patchStart` / `patchEnd` |
| ubicaciones | `location` / `locationConstant` |

**Capa de presentación** `buildMapTimelineDots(items, desdeRaw)`:

```typescript
interface MapTimelineDot {
  dayKey: bigint;           // día absoluto único
  rawTime: string;
  isDesde: boolean;         // true → render negro
  events: MapTimelineItem[];  // para tooltip
}
```

| Regla | Acción |
|-------|--------|
| Agrupar por `sortKey` (día) | Un `MapTimelineDot` por día |
| `isDesde` | `true` si `rawTime` coincide con `map.desde` (mismo día) |
| Color | `isDesde` → **negro**; else → **blanco** |
| Si Desde comparte día con otros | **Un punto negro** (Desde gana; eventos del día en tooltip) |

### 2.2 Ubicación constante — cambio extractor

`ProjectLocationOccurrenceV1` ampliado:

```typescript
timeBinding: "dated" | "constant";
effectiveTimeRaw: string | null; // null si constant
```

Rust `apply_tag` cuando `tag_type == "location"` y `effective_time.is_none()`:

```rust
time_binding: "constant",
effective_time_raw: None, // o sentinel omitido
```

Tests nuevos en `location_occurrences/mod.rs`.

### 2.3 Compositor @ T

| `timeBinding` | Visible en mapa cuando… |
|---------------|-------------------------|
| `dated` | `effectiveTimeRaw` mismo día que T |
| `constant` | **Siempre** (cualquier T) |

Actualizar `filterOccurrencesAtT` → `resolveLocationsAtT(occurrences, previewT, config)`.

---

## 3. UI — `MapTimelineView`

### 3.1 Arquitectura

```text
MapWorkspace pie
├── MapTimelineView
│   ├── mapTimelineLayout.ts (sparse scale)
│   ├── MapTimelineDot.tsx   ← ○ blanco / ● negro
│   └── cursor Vista en T + etiqueta fecha
└── (sin MapTimelineBar legacy)
```

**Estrategia:** reutilizar **layout/navegación** de `TimelineHorizontal`; **no** importar `TimelineChip` ni stems.

### 3.2 Componente `MapTimelineDot`

| Prop | Valor |
|------|--------|
| Tamaño | ~8–10 px diámetro (ajustable tema) |
| `isDesde` | `fill: #000` (negro) — borde sutil si tema oscuro |
| default | `fill: #fff` — borde `border-border` para contraste en fondo claro |
| Activo (T) | Anillo o escala 1.2× en el punto de `previewT` |
| Hit area | ≥ 24 px para clic/touch |

### 3.3 Eje sparse — `buildMapSparseScale`

```typescript
function buildMapSparseScale(
  items: MapTimelineItem[], // solo dated
  lineLeft: number,
  lineRight: number,
  calendar: CalendarConfig,
): MapSparseScale
```

| Paso | Acción |
|------|--------|
| 1 | Extraer días únicos con marcas (`sortKey` distintos) |
| 2 | Ordenar cronológicamente |
| 3 | Repartir ancho uniforme o proporcional entre **solo** esos anchors |
| 4 | Mes label solo si hay marca en ese mes |
| 5 | `toX(day)` mapea día → posición; días intermedios **no existen** en el eje |

Reutilizar ideas de `buildCollapsedScale` + `buildCompactYearBarLayout` pero con input = `MapTimelineItem[]` no años calendario completos.

### 3.4 Lane constante

```text
┌─────────────────────────────────────────┐
│  ∞ ○  ∞ ○   (ubicaciones sin fecha)     │  ← fuera del eje; puntos blancos o icono ∞
├─────────────────────────────────────────┤
│  ────○────●────○────○────  Vista en T   │
│       blanco negro blanco               │
└─────────────────────────────────────────┘
```

- No participan en `buildMapSparseScale`.
- Tooltip con nombre ubicación; no mueven T al clic.

### 3.5 Interacción

| Acción | Efecto |
|--------|--------|
| Clic **punto** fechado | `onPreviewTChange(raw, "mapTimelineDot")` |
| Drag thumb Vista en T | Scrubber MAP-009 |
| Hover punto | Tooltip eventos del día |
| ‹ › | Pan entre ventanas de marcas |
| ± | Zoom densidad eje |
| Modo edición | Timeline **solo lectura** (MAP-009 C5) |

### 3.6 Ventana hijo (MAP-016)

Misma `MapTimelineView` embebida en `MapNavChildWindow` — mismos items del **mapa activo** (T global), no timeline independiente.

---

## 4. Fases de implementación

| Fase | ID | Entregable |
|------|-----|------------|
| **1** | M17-MODEL | `mapTimelineModel.ts` + tests builder |
| **2** | M17-CONST | Extractor ubicación constante Rust + TS types |
| **3** | M17-SPARSE | `buildMapSparseScale` + tests |
| **4** | M17-UI | `MapTimelineView` + `MapTimelineDot` (○/●) |
| **5** | M17-T | Wiring scrubber + Desde + Vista en T |
| **6** | M17-LOC | `resolveLocationsAtT` + compositor constantes |
| **7** | M17-SWAP | Sustituir `MapTimelineBar` en `MapWorkspace` |
| **8** | M17-QA | OBS `obs.ui.map.timeline.*` + QA manual |

**Orden:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8.

**Paralelo posible:** Fase 2 con M17-MODEL.

---

## 5. Criterios de aceptación

- [ ] Shell timeline (sparse, ‹ ›, ±, Vista en T) alineado con proyecto.
- [ ] **Un punto** por fecha con marca; **negro** solo en Desde (año 0); **blanco** en el resto.
- [ ] Mismo día con varios eventos → un solo punto.
- [ ] Eje sin fechas vacías.
- [ ] Clic punto mueve T; tooltip opcional con detalle.
- [ ] Ubicaciones constantes fuera del eje (lane ∞).
- [ ] Modo edición: solo lectura.
- [ ] Tests: `buildMapTimelineDots`, `isDesde`, dedupe por día.

---

## 6. Relación MAP-009 / MAP-011

| Plan | Tratamiento |
|------|-------------|
| **MAP-009** | Lógica T, memoria por mapId, OBS `previewTSet` — **vigente**; UI `MapTimelineBar` → **reemplazada** |
| **MAP-011** | Regla §4bis.1 extendida (constantes); filtro @ T actualizado |

Añadir nota superseded en header MAP-009.

---

## 7. Preguntas abiertas

| ID | Pregunta |
|----|----------|
| ~~**Q1**~~ | ~~¿Scrubber fino además de timeline rica?~~ → **Cerrado:** shell única con puntos + Vista en T |
| **Q2** | ¿Tamaño exacto punto y contraste en **tema oscuro**? (borde en blanco/negro) |
| **Q3** | ¿Lane constante arriba del eje? (**sí** en wireframe) |

---

## 8. Registro

| Fecha | Evento |
|-------|--------|
| 2026-06-25 | Plan creado — diseño timeline proyecto; solo fechas con marcas; ubicaciones constantes |
| 2026-06-25 | **Marcas = puntos:** negro = Desde (año 0), blanco = resto; un punto por fecha; sin chips |
