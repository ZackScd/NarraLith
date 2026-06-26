# MAP-015 — Ventana capas unificada + lienzo vacío + capa Fondo

> **Estado:** ✅ **Completado** — Fases 1–8 (2026-06-25)  
> **Tipo:** Replanteo modelo capas / parches / creación mapa  
> **Spec:** [`maps-design.md`](../../maps-design.md) §3.2.1 · §4.1.1–4.1.3 · §4.1.2  
> **Contenedor UI:** [`MAP-014`](MAP-014-floating-tools-panel.md) (ventana flotante arrastrable)  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md)

| Campo | Valor |
|-------|--------|
| **Prioridad** | P0 — modelo de trabajo diario del dibujo |
| **Esfuerzo** | Alto |
| **Referencia UX** | Sketchbook — panel capas, Fondo, imagen como capa |
| **Supersede** | MAP-003 import al crear · MAP-013 §7 rail secciones Capas/Parches/Nav/Hotspots separadas |

---

## 0. Resumen de decisiones (usuario 2026-06-25)

### A — Crear mapa

- **Eliminar** «Importar imagen» y el campo **Origen** del diálogo «Nuevo mapa».
- Única opción implícita: **lienzo vacío** (nombre + tamaño + aspect ratio).

### B — Imagen como capa

- La imagen se importa **después**, como **capa más** del dibujo activo.
- Editable como el resto: dibujar encima, sobreescribir, borrar con goma.

### C — Capa «Fondo»

- Siempre al pie de la lista (estilo Sketchbook).
- **Ojo:** fondo visible vs **transparente**.
- **Swatch:** elegir color de fondo del dibujo.

### D — Ventana capas (un solo botón en rail / acceso flotante)

Cabecera con **3 cuadros**; el activo **se expande** mostrando el nombre:

| # | Tab | Contenido |
|---|-----|-----------|
| 1 | **Capas** | Lista capas + Fondo — igual que hoy MAP-013 §7 |
| 2 | **Parches** | Secundarios temporales + toolbar colorida |
| 3 | **Dibujos hijo** | Nav §5 + **Hotspots** fusionados |

### E — Tab Parches — toolbar

| Botón | Color ref. | Función |
|-------|------------|---------|
| `+` | **Rojo** | Nuevo parche — ✅ `CreateSecondaryDialog` |
| Toggle inactivos | **Morado** | Mostrar/ocultar parches **no visibles** en **Vista en T** actual (`isSecondaryVisibleAtT`) |
| Ordenar | **Verde** | Modos: **base al inicio** · **cronológico** (por marca tiempo del parche) |
| Combinar | **Azul** | Fusiona UI Capas + Parches → vista §2.4 |

### F — Vista combinada Capas/Parches

- Parches = **super-grupos** colapsables.
- Expandido → capas internas de ese parche.
- Toolbar rojo/verde/morado **migra aquí** cuando combinado está activo.
- Tab activo muestra etiqueta tipo `capas/parches` (boceto usuario).

---

## 1. Estado actual (código)

| Área | Archivo | Hoy |
|------|---------|-----|
| Crear mapa + import | `CreateMapDialog.tsx` | `mode: blank \| import`; selector Origen; `open()` diálogo SO |
| Capas UI | `MapLayersPanel.tsx` | Filas compactas, grupos, DnD — **sin** Fondo ni capa imagen |
| Parches UI | `MapSecondariesPanel.tsx` | Lista + `+` crear — sin ordenar / ocultar inactivos / combinar |
| Nav / Hotspots | `MapNavDrawingsPanel.tsx`, `MapHotspotsPanel.tsx` | Paneles **separados** en rail |
| Rail secciones | `MapEditSidePanel.tsx` | Iconos: layers, patches, nav, hotspots, … |
| Schema capas | `drawing.json` `layers[]` | Solo vectorial (`strokes[]`); sin `kind: image` ni `backgroundColor` |
| Visibilidad T | `mapSecondaryVisibility.ts` | Lógica existe — falta toggle UI morado |

---

## 2. Diseño objetivo

### 2.1 Diálogo «Nuevo mapa» (simplificado)

```text
┌─ Nuevo mapa ─────────────────────┐
│ Nombre: [________________]       │
│ Preset tamaño: [2400×1600 ▼]     │
│ Ancho / Alto                     │
│ Relación aspecto: [Libre ▼]      │
│              [Cancelar] [Crear]  │
└──────────────────────────────────┘
```

**Eliminar:** bloque Origen, rama `importPath`, deshabilitar tamaño cuando import, etc.

**Backend:** `create_map` — aceptar solo `blank`; migrar proyectos ya creados con import no aplica (sin legacy).

### 2.2 Capa imagen

```typescript
// Orientativo — drawing.json v3
type MapDrawingLayerV2 =
  | { kind: "vector"; id; name; visible; opacity; locked; strokes[] }
  | { kind: "image"; id; name; visible; opacity; locked; assetPath; x; y; width; height }
```

| Flujo | Paso |
|-------|------|
| Añadir | Toolbar capas → icono imagen → file picker → capa nueva |
| Render | Compositor dibuja bitmap en stack; trazos vectoriales encima |
| Goma | Borra trazos en capas vectoriales; en capa imagen: raster erase o solo trazos encima — **ver Q4** |
| Guardado | Asset copiado a `.narralith/maps/{id}/assets/` |

### 2.3 Capa Fondo

```typescript
// En MapDrawingV2
backgroundColor: string | null  // null = transparente (ojo off)
```

UI: fila fija «Fondo» — no DnD, no delete; ojo + color picker.

### 2.4 Ventana flotante — tabs expandibles

```text
┌─────────────────────────────────────┐
│ ≡  [▦ Capas ▓] [□] [□]          [×] │  grip + tabs + cerrar
├─────────────────────────────────────┤
│  … contenido según tab …            │
└─────────────────────────────────────┘

Inactivo:  cuadrado ~32px solo icono
Activo:    ancho + label «Capas» / «Parches» / «Dibujos hijo»
```

**Componente:** `MapLayersFloatingWindow.tsx` (nombre orientativo).

**Store:** `useMapLayersWindowStore` — `activeTab`, `combinedCapasParches: boolean`, posición (o delegar a `useMapFloatingToolsStore` ventana-id `layers`).

### 2.5 Tab Capas (sin combinar)

- Reutilizar `MapLayersPanel` + fila **Fondo** + acción **importar imagen como capa**.
- Toolbar Sketchbook: `+` capa, `+` grupo, (opcional) import imagen — **no** icono import en crear mapa.

### 2.6 Tab Parches (sin combinar)

| Control | Comportamiento |
|---------|----------------|
| Lista | Parches del mapa activo; clic → edita ese secundario (`setActiveDrawingRef`) |
| Rojo `+` | `createSecondary` — igual hoy |
| Morado | Toggle `showInactiveAtT`: filtra lista / atenúa parches donde `!isSecondaryVisibleAtT(patch, previewT)` |
| Verde | Cicla orden: manual actual → **base primero** (principal abajo visual) → **cronológico** por `timeTag` |
| Azul | `setCombinedCapasParches(true)` → §2.7 |

### 2.7 Vista combinada

```text
┌─────────────────────────────────────┐
│ ≡  [capas/parches ▓] [□] [□]    [×] │
├─────────────────────────────────────┤
│ [+][↕][👁◐]              [⊟ azul] │  toolbar unificada; azul descombina
├─────────────────────────────────────┤
│ ▼ Parche «Era 2000»                 │
│     ├─ Capa 1                       │
│     └─ Capa 2                       │
│ ▼ Parche «Era 1950»                 │
│     └─ …                            │
│ ── Principal (terreno base) ─────   │
│     ├─ Capa relieve                 │
│     └─ Fondo                        │
└─────────────────────────────────────┘
```

| Regla | Detalle |
|-------|---------|
| Super-grupo | `MapSecondarySummary` + chevron expand/collapse |
| Hijos | Lazy-load capas del secundario al expandir (IPC `load_secondary` metadata) o cache en sesión |
| Principal | Bloque etiquetado; capas del `activeDrawingRef` cuando es principal |
| Orden verde | Reordena **super-grupos**; dentro de cada uno respeta orden capas interno |
| Morado | Oculta/atenua super-grupos inactivos en T |

### 2.8 Tab «Dibujos hijo»

> **Replanteo MAP-016 (2026-06-25):** un solo concepto — **crear hijo = crear hotspot**. Detalle completo en [`MAP-016-nav-hotspots-replan.md`](MAP-016-nav-hotspots-replan.md).

| Elemento | Comportamiento |
|----------|----------------|
| **Lista** | Cada fila = dibujo hijo + preview de su zona (polígono/rect/círculo) |
| **Nuevo** | Botón → herramienta zona en lienzo padre (default **rubber banding**) → nombre → persistir par |
| **Editar dibujo** | Abre **ventana flotante hijo** (`MapNavChildWindow`) con estudio, capas, T |
| **Editar zona** | Reentrada gesto dibujo en padre — **✅ confirmado** (MAP-016 Q5) |
| **Eliminar** | Borra hijo + hotspot vinculados |

**Eliminar:** paneles separados `MapNavDrawingsPanel` + `MapHotspotsPanel`; rail `nav` / `hotspots`.

**Selector herramientas zona** (en tab o toolbar): `lasso` (default) · `rect` · `circle`.

---

## 3. Arquitectura e integración MAP-014

```text
MAP-014 Fase A–B     FloatingPanelFrame + stores flotantes
        │
        ▼
MAP-015 Fase 1       Purga import crear mapa
MAP-015 Fase 2       Capa Fondo + backgroundColor
MAP-015 Fase 3       Tabs ventana capas (Capas / Parches / Dibujos hijo)
MAP-015 Fase 4       Toolbar parches (morado/verde/azul)
MAP-015 Fase 5       Vista combinada super-grupos
MAP-015 Fase 6       Capa imagen raster editable
MAP-016              Nav+hijo unificado, lasso, ventana hijo
        │
        ▼
MAP-014 Fase D–E     Sustituir rail; un botón «Capas» abre MAP-015 window
```

**Dependencia:** MAP-015 Fase 3+ requiere contenedor flotante (MAP-014 Fase A mínimo). Fases 1–2 pueden ir en paralelo.

---

## 4. Fases de implementación

| Fase | ID | Entregable | Archivos clave |
|------|-----|------------|----------------|
| **1** | M15-CREATE | Diálogo sin Origen/import | ✅ `CreateMapDialog.tsx`, `MapCreateDraft` |
| **2** | M15-FONDO | `backgroundColor` + fila Fondo | ✅ `MapLayersPanel.tsx`, `maps_store.rs`, compositor |
| **3** | M15-TABS | `MapLayersFloatingWindow` 3 tabs expandibles | ✅ nuevo componente + store tab |
| **4** | M15-PATCH-UI | Toolbar rojo/morado/verde en tab Parches | ✅ `MapSecondariesPanel` refactor |
| **5** | M15-COMBINE | Vista combinada super-grupos + migración toolbar | ✅ `MapCombinedLayersPanel.tsx` |
| **6** | M15-NAV | Tab Dibujos hijo + Hotspots | ✅ fusionar paneles existentes |
| **7** | M15-IMAGE | Capa `kind: image` + import + goma | ✅ schema v3, render, estudio |
| **8** | M15-QA | Tests + OBS + purga rail sections | ✅ store/sort tests, rail simplificado |

---

## 5. Criterios de aceptación

### Crear mapa
- [x] Diálogo sin campo Origen ni opción importar.
- [x] Mapa nuevo = lienzo vacío dimensionado.

### Fondo
- [x] Fila «Fondo» siempre visible al pie.
- [x] Ojo off → fondo transparente en compositor.
- [x] Color picker persiste en `drawing.json`.

### Ventana capas
- [x] Un solo acceso (botón) abre ventana con 3 tabs.
- [x] Tab activo muestra nombre expandido.
- [x] Ventana arrastrable (MAP-014).

### Parches
- [x] Morado oculta/marca parches no activos en T preview.
- [x] Verde alterna orden base/cronológico.
- [x] Azul combina con capas; segundo clic descombina.

### Combinada
- [x] Parches colapsables; expandido lista capas del parche.
- [x] Toolbar añadir/ordenar/ocultar solo en vista combinada (o duplicada coherente).

### Imagen
- [x] Import solo desde panel capas.
- [x] Dibujar y goma funcionan sobre/dentro de capa imagen según Q4 cerrada.

### Nav
- [x] Hotspots y dibujos hijo en un solo tab.

---

## 6. Preguntas abiertas

| ID | Pregunta |
|----|----------|
| **Q1** | Vista combinada: ¿principal **arriba** o **abajo** por defecto? (boceto: parches arriba, principal abajo) |
| **Q2** | Orden cronológico: ¿por `timeTag` inicio del parche o por `createdAt`? |
| **Q3** | ¿Import imagen crea capa a tamaño completo del lienzo o tamaño natural de la imagen centrada? |
| **Q4** | Goma en capa imagen: ¿borra píxeles raster, solo trazos vectoriales encima, o ambos según herramienta? |
| **Q5** | Tab Dibujos hijo: ¿hotspots ocultos en vista nav hijo (como hoy `isNavView`)? |

---

## 7. i18n (claves nuevas orientativas)

| Clave | ES |
|-------|-----|
| `layersWindow.tabs.layers` | Capas |
| `layersWindow.tabs.patches` | Parches |
| `layersWindow.tabs.nav` | Dibujos hijo |
| `layersWindow.tabs.combined` | capas/parches |
| `layersWindow.background.name` | Fondo |
| `layersWindow.patches.showInactive` | Mostrar inactivos en T |
| `layersWindow.patches.sortBase` | Base al inicio |
| `layersWindow.patches.sortChrono` | Orden cronológico |
| `layersWindow.patches.combine` | Combinar con capas |
| `layersWindow.addImageLayer` | Importar imagen como capa |

---

## 8. Relación MAP-013

| Ítem MAP-013 | MAP-015 |
|--------------|---------|
| M13-LAY-01…09 Capas Sketchbook | **Vigente** dentro tab Capas |
| §2bis rail Capas/Parches/Nav/Hotspots | **Obsoleto** → un botón + 3 tabs |
| `MapEditSidePanel` sections `layers,patches,nav,hotspots` | Deprecar; mantener `studio,canvas,locations,settings` en otras ventanas MAP-014 |

---

## 9. Registro

| Fecha | Evento |
|-------|--------|
| 2026-06-25 | Fases 3–8 implementadas — ventana unificada, toolbar parches, vista combinada, nav+hotspots, capa imagen |
| 2026-06-25 | Plan creado — crear mapa solo vacío; imagen→capa; Fondo; ventana 3 tabs; parches toolbar RGB; vista combinada super-grupos; nav+hotspots fusionados |
