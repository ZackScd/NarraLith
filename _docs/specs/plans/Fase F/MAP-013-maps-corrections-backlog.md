# MAP-013 — Backlog de correcciones del módulo mapas

> **Estado:** 🔄 **En curso** (2026-06-11) — Oleadas 0–2 + grupos ✅; polish P2 parcial  
> **Tipo:** Correcciones UX + comportamiento + deuda §13 acumulada — **no** features Era IV/WB  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md) · **Previo:** [MAP-011](MAP-011-manuscript-location-x.md) 🔄 · **Bloquea:** [MAP-012](MAP-012-smoke-era-iii-purge.md) ⏸  
> **Spec de referencia:** [`maps-design.md`](../../maps-design.md)

---

## 0. Por qué existe este documento

Tras MAP-011 el módulo mapas **funciona en código**, pero la experiencia acumulada no coincide con la intención original:

- Interfaz **demasiado densa** («cabina de nave espacial»): muchos paneles, barras y controles compitiendo a la vez.
- Comportamientos **pospuestos o parcialmente cerrados** en MAP-008…011 (§13 polish, QA parcial).
- Atajos **placeholder** (editor → mapa) que no son el flujo deseado.
- **MAP-012** (smoke + purga legacy + cierre Fase F) **pospuesto** hasta que este backlog esté en estado usable para QA real.

> **Regla:** aquí solo **listamos y priorizamos**. La ejecución se trocea en sub-tareas o sprints dentro de MAP-013; no reabrir MAP-001…011 salvo regresión.

---

## 1. Convención del backlog

| Campo | Valores |
|-------|---------|
| **ID ítem** | `M13-XXX` (XXX = área + número, p. ej. `M13-UX-01`) |
| **Prioridad** | **P0** bloqueante uso · **P1** confusión grave · **P2** polish · **P3** nice-to-have |
| **Estado** | ⬜ pendiente · 🔄 en curso · ✅ hecho · ⏸ aplazado · ❌ descartado |
| **Origen** | Plan / QA / usuario / captura |

**Criterio de «MAP-013 listo para MAP-012»:** todos los **P0** ✅ + mayoría **P1** ✅ o ⏸ documentado; usuario confirma que puede recorrer smoke §6 sin bloqueos.

---

## 2. Diagnóstico rápido (captura 2026-06-11)

Estado observado en modo **edición** (mapa `a`, 2400×1600):

| Zona | Síntoma |
|------|---------|
| **Columna izq.** | PARCHES + DIBUJOS HIJO (+ Hotspots, Ubicaciones) — **→ migrar a panel derecho §2bis** |
| **Columna der.** | CAPAS — **→ sección rail Capas §2bis**; rediseño contenido §7 |
| **Cabecera** | Selector + «Al abrir» + pin — **→ sección rail Mapas §2bis** |
| **Barra amarilla** | «Desde» + «Vista en T» separados — **→ fusionar Desde con timeline abajo §2bis.3** |
| **Pie rojo** | Estudio dibujo — **→ sección rail Estudio §2bis** |

**Conclusión:** no falta funcionalidad; falta **jerarquía visual**, **agrupación** y **coherencia** entre modos interactivo / edición.

---

## 2bis. Arquitectura UI — panel derecho tipo manuscrito (2026-06-11)

> **Decisión usuario:** todo lo enmarcado en **rojo** en captura pasa al **panel derecho** en modo edición, con **barra de iconos** siempre visible (patrón `EditorSidePanel` manuscrito).  
> **Objetivo v1:** reducir ruido — cabecera y columnas laterales actuales desaparecen como bloques permanentes.

### 2bis.1 Qué sale de la pantalla principal (modo edición)

| Zona actual (rojo) | Destino |
|--------------------|---------|
| Cabecera: selector mapa, «Al abrir», pin ⭐ | Sección **Mapas** del panel derecho |
| Columna **izq.**: PARCHES, DIBUJOS HIJO (+ Hotspots, Ubicaciones hoy) | Secciones del panel derecho (una por icono) |
| Barra **inferior** estudio: herramientas, colores, tamaño, opacidad pincel, undo | Sección **Estudio** del panel derecho (o sub-panel) |
| Botones expandir/recortar lienzo (pie) | Sección **Mapa / lienzo** o dentro de Mapas — **afinar luego** |

**Permanece en layout principal (no rojo):**

| Zona | Notas |
|------|-------|
| Lienzo central | Máximo espacio posible |
| Cabecera mínima | Título mapa + «Ver mapa interactivo» / salir edición — **sin** selector ni preferencias |
| **Timeline + Desde** | Pie fijo — ver §2bis.3 |

### 2bis.2 Barra de navegación (rail) — siempre visible en edición

Patrón: igual que manuscrito contraído (`EditorSidePanel` — iconos verticales + panel expandible).

```text
┌──┐ ┌──────────────────────────┐
│ ≡│ │  Contenido sección       │
│🗺│ │  activa (una a la vez)   │
│▦ │ │                          │
│📅│ │                          │
│… │ │                          │
└──┘ └──────────────────────────┘
 rail      panel opciones (colapsable)
```

| # | Icono (orientativo) | Sección al pulsar | Contenido (v1) |
|---|---------------------|-------------------|----------------|
| **0** | Expandir / contraer | — | Toggle ancho panel (como `PanelRightOpen/Close`) |
| **1** | Mapas | **Mapas** | Lista/selector mapas, «Al abrir», pin, + nuevo mapa |
| **2** | Capas | **Capas** | `MapLayersPanel` rediseñado §7 (Sketchbook) |
| **3** | Parches | **Parches** | `MapSecondariesPanel` (secundarios temporales) |
| **4** | Nav | **Dibujos hijo** | `MapNavDrawingsPanel` |
| **5** | Hotspots | **Hotspots** | `MapHotspotsPanel` |
| **6** | Ubicaciones | **Ubicaciones** | `MapLocationsPanel` |
| **7** | Estudio | **Herramientas** | Barra dibujo actual (`MapEditStudio`): pinceles, colores, undo |

**Comportamiento:**

- **Una sección activa** a la vez (click icono → muestra su panel; re-click o icono otro → cambia).
- Rail **siempre visible** en modo edición (incluso panel contenido contraído).
- Modo **interactivo:** rail **visible** — iconos **Mapas** + **lápiz** (toggle edición); panel Mapas con selector, «Al abrir», pin y + nuevo mapa.
- Modo **edición:** rail completo (Capas, Parches, …); lápiz resaltado; clic de nuevo → interactivo.
- Reutilizar stores/patrón `useLayoutStore` (`rightPanelCollapsed`) si encaja.

**Referencia código:** `src/modules/editor/EditorSidePanel.tsx`.

### 2bis.3 «Desde» + timeline (amarillo) — fusionar abajo

| Antes | Después |
|-------|---------|
| Barra bajo cabecera: «Desde … Editar» + «Vista en T … Cambiar» | **Eliminar** barra separada |
| Scrubber inferior solo con «Vista en T» | **Una sola franja temporal** en el pie |

**Pie del mapa (edición + interactivo):**

```text
[ Desde: 2025-07-15  Editar ]  ····· scrubber T ·····  [ Vista en T: … ]
         ↑ integrado en MapTimelineBar / barra única
```

- **Desde** = metadato del mapa, editable inline o dialog en la **misma barra** que el scrubber (no duplicar `MapPreviewTField` arriba).
- **Vista en T** = thumb del scrubber (fuente única de preview T).
- Relacionado: cierra **M13-UX-02** con decisión concreta del usuario.

### 2bis.4 Wireframe objetivo (edición)

```text
┌─────────────────────────────────────────────────────────────┐
│ Mapas | a                                    (cabecera fina) │
├──────────────────────────────────────────────┬──┬─────────┤
│                                              │🗺│ Mapas   │
│              LIENZO                          │✏│ toggle  │
│                                              │▦ │ Capas*  │
│                                              │… │ …*      │
├──────────────────────────────────────────────┴──┴─────────┤
│ Desde 2025-07-15 [Editar]  ═══ scrubber 2000–2029 ═══  T  │
└─────────────────────────────────────────────────────────────┘
  * solo iconos visibles en modo edición (lápiz resaltado)
```

### 2bis.5 Backlog — shell panel derecho

| ID | Prioridad | Entregable | Notas | Estado |
|----|-----------|------------|-------|--------|
| M13-SHELL-01 | **P0** | `MapEditSidePanel` — rail + panel colapsable (patrón manuscrito) | Nuevo componente; solo modo edición | ✅ |
| M13-SHELL-02 | **P0** | Mover selector mapa + «Al abrir» + pin → sección **Mapas** | Quita bloque rojo cabecera | ✅ |
| M13-SHELL-03 | **P0** | Eliminar columna **izq.** fija; paneles → secciones rail | Parches, Nav, Hotspots, Ubicaciones | ✅ |
| M13-SHELL-04 | **P1** | Mover `MapEditStudio` (barra dibujo) → sección **Estudio** rail | Quita bloque rojo inferior | ✅ |
| M13-SHELL-05 | **P1** | Cabecera mínima: `Mapas \| [nombre]` | Sin selector ni botones; toggle edición en rail | ✅ |
| M13-SHELL-06 | **P0** | **Desde** integrado en `MapTimelineBar` (§2bis.3) | Elimina barra amarilla; cierra UX-02 | ✅ |
| M13-SHELL-07 | **P2** | Expandir/recortar lienzo — ubicación final (Mapas vs menú ⋮) | Usuario afinará después | ✅ |
| M13-SHELL-08 | **P2** | Modo interactivo: rail visible (Mapas + lápiz); resto solo en edición | Decisión usuario 2026-06-11 | ✅ |
| M13-SHELL-09 | **P3** | Persistir sección rail activa + collapsed en sesión mapa | Opcional UX | ✅ |
| M13-SHELL-10 | **P1** | Toggle edición: icono **lápiz** en rail (2.º); resaltado en edición | Sustituye botones cabecera | ✅ |

**Archivos probables:** nuevo `MapEditSidePanel.tsx`, refactor `MapWorkspace.tsx` layout, `MapTimelineBar.tsx` + `MapDesdeField`, `useLayoutStore` o `useMapStudioStore`.

---

## 3. Backlog — UX e información (layout)

> **Actualizado 2026-06-11:** reorganización estructural en **§2bis** (`M13-SHELL-*`). Ítems aquí = refinamientos dentro del nuevo shell.

| ID | Prioridad | Problema | Dirección | Origen | Estado |
|----|-----------|----------|-----------|--------|--------|
| M13-UX-01 | ~~P0~~ **→ SHELL** | Cabecera saturada | M13-SHELL-02 + SHELL-05 | Captura | ✅ |
| M13-UX-02 | **P0** | Triple tiempo (Desde arriba + scrubber) | Desde + scrubber **una barra** abajo — M13-SHELL-06 | Usuario | ✅ |
| M13-UX-03 | ~~P1~~ **→ SHELL** | Columna izq. apilada | Rail derecho M13-SHELL-03 | MAP-010 H1 | ✅ |
| M13-UX-04 | ~~P1~~ **→ SHELL** | Pie timeline + estudio | SHELL-04 + SHELL-06 | Usuario | ✅ |
| M13-UX-05 | **P2** | Badge «TERRENO BASE» poco claro | Copy según sección rail + `activeDrawingRef` | MAP-010 H2 | ✅ |
| M13-UX-06 | **P1** | Contenido CAPAS denso | §7 Sketchbook **dentro** sección rail Capas | Usuario · §7 | ✅ (LAY-01…04) |
| M13-UX-07 | **P2** | Opacidad capa vs pincel | Tooltip Capas vs Estudio en rail | Captura | ✅ |
| M13-UX-08 | **P3** | «+ Nuevo mapa» | Dentro sección Mapas del rail | Captura | ✅ |
| M13-UX-09 | **P2** | Selector `<select>` | Lista/miniatura en sección Mapas | spec §3ter | ⬜ |

---

## 4. Backlog — Comportamiento interactivo / nav

| ID | Prioridad | Problema | Dirección | Origen | Estado |
|----|-----------|----------|-----------|--------|--------|
| M13-NAV-01 | **P0** | Clic hotspot → nav hijo **sin evidencia OBS** (`navPush` ausente en QA MAP-010) | Verificar handler + umbral 5px; smoke mínimo E1–E3 | MAP-010 §12.1 · MAP-012 §6.E | ✅ |
| M13-NAV-02 | **P1** | Al salir de edición, `activeDrawingRef: nav:*` con `navDepth: 0` — compositor confuso | Reset a `principal` al `setViewMode("interactive")` o al `navPop` final | MAP-010 §13 H2 | ✅ |
| M13-NAV-03 | **P1** | Breadcrumb / volver depende de NAV-01 | Tras NAV-01, validar `navPop` y clic segmentos | MAP-010 §13 H4 | ✅ |
| M13-NAV-04 | **P2** | Hotspot panel no muestra destino nav claramente | Label con nombre dibujo hijo + preview bounds | MAP-010 §13 H5 | ✅ |
| M13-NAV-05 | **P2** | Modo edición: dibujar rect hotspot vs navegar en interactivo — fácil confundir | Hint contextual / deshabilitar nav en edición (ya OK) + copy | MAP-010 | ✅ |

---

## 5. Backlog — Tiempo, parches y scrubber

| ID | Prioridad | Problema | Dirección | Origen | Estado |
|----|-----------|----------|-----------|--------|--------|
| M13-T-01 | **P1** | Rango barra demasiado ancho (décadas vacías 2000–2029) | Padding adaptativo en `computeMapTimelineRange` | MAP-009 §13.2 | ✅ |
| M13-T-02 | **P1** | Panel PARCHES no refleja qué parche está vigente en T | Highlight / opacidad lista según `previewT` | MAP-009 §13.1 | ✅ |
| M13-T-03 | **P2** | Marcadores parche en barra: punto 2px sin nombre | Labels / tooltip; color por parche | MAP-009 §13.2 | ⬜ |
| M13-T-04 | **P2** | `tiempoFin` poco visible al scrub | Chip cierre + desaparición visual | MAP-009 §13.1 · MAP-008 §9 | ⬜ |
| M13-T-05 | **P2** | QA MAP-008 §9 incompleto (multi-parche, expand, delete con scrubber) | Re-ejecutar pasos 1,4,5,8,9 | MAP-008 | ⬜ |
| M13-T-06 | **P3** | Transición alpha al cruzar umbral parche «se siente rara» | Crossfade opcional §4.4 | MAP-009 §13.1 | ⏸ |
| M13-T-07 | **P3** | Snap scrubber a fechas clave | Snap opcional Desde / inicios parche | MAP-009 §13.2 | ⏸ |
| M13-T-08 | **P3** | OBS `previewTSet` muy denso al arrastrar | Throttle acción ~200ms | MAP-009 §13.2 | ⏸ |
| M13-T-09 | **P3** | Sync timeline global proyecto ↔ mapa | Fase 10 / fuera MAP-013 | MAP-009 §13.4 | ⏸ |

---

## 6. Backlog — Ubicaciones (MAP-011)

| ID | Prioridad | Problema | Dirección | Origen | Estado |
|----|-----------|----------|-----------|--------|--------|
| M13-LOC-01 | **P1** | Atajo editor → mapa (`SideLocationMapSection`) es **placeholder**, no flujo deseado | Rediseñar handoff: ¿abrir mapa en T del evento? ¿panel split? | Usuario · MAP-011 | ✅ (v1: T evento + colocación) |
| M13-LOC-02 | ~~P1~~ **→ SHELL** | Panel Ubicaciones enterrado | Sección rail **Ubicaciones** (icono 6) — M13-SHELL-03 | Captura | ✅ |
| M13-LOC-03 | **P2** | Marcas X visibles también en **edición** (spec C5: solo interactivo) | Ocultar `locationMarkers` salvo ghost colocación | MAP-011 C5 · MAP-012 §2.8 | ✅ |
| M13-LOC-04 | **P2** | Anclar pin: flujo poco guiado (lista ocurrencias @ T vs unpinned) | Wizard corto o click-to-place más obvio | Usuario | ✅ |
| M13-LOC-05 | **P2** | Tras crop, pins fuera de bounds — verificar feedback UI | Toast + panel refresh (Rust ya sincroniza) | MAP-011 · MAP-012 §8.1 | ⬜ |
| M13-LOC-06 | **P3** | X en nav hijo — implementado pero no validado en QA | Caso smoke F5 cuando MAP-012 retome | MAP-011 D7 | ⬜ |

---

## 7. Panel CAPAS — rediseño estilo Sketchbook

> **Contenedor:** sección **Capas** del rail §2bis (icono 2) — no panel fijo columna derecha actual.  
> **Origen:** usuario 2026-06-11 · referencia visual Sketchbook (capturas + boceto wireframe).

### 7.1 Visión

El panel CAPAS debe sentirse como una **app de dibujo** (Sketchbook), no como formularios apilados:

- Filas **más bajas** verticalmente.
- **Miniatura** del contenido dibujado en cada capa (no contador «N trazos»).
- **Opacidad en barra vertical** a la **derecha** de la fila (no slider horizontal debajo).
- **Reordenar arrastrando** con icono **≡** (tres líneas) — sin flechas arriba/abajo.
- **Grupos** (carpetas) con visibilidad y opacidad de grupo que **afectan a todas las capas hijas**.

### 7.2 Layout objetivo por fila (capa)

Boceto acordado (izq → der):

```text
┌─────────────────────────────────────────────────────────┐
│ [👁][🔒]  MINIATURA   NOMBRE              │ ▌ │  ≡   │
│            (preview)   (editable)          │ ▌ │ drag │
│                                            │ ▌ │      │
│                                            │ ▌ │      │
└─────────────────────────────────────────────────────────┘
     ↑ controles      ↑ zoom a contenido      ↑ opacidad  ↑ handle DnD
       visibilidad       dibujado en capa        vertical
       bloqueo
```

| Zona | Comportamiento |
|------|----------------|
| **Izq.** | Icono ojo (visible) + candado (bloqueo) — compactos, misma fila que miniatura |
| **Centro** | Miniatura + nombre capa; clic fila = seleccionar capa activa; doble clic / botón = renombrar |
| **Der. centro** | **Slider opacidad vertical** (0–100 %), siempre visible en la fila |
| **Der. extremo** | Icono **≡** — única zona para iniciar **drag-and-drop** reorden |

**Quitar del diseño actual:**

- Flechas ↑ / ↓ (`onReorderLayer` front/back).
- Texto «Activa · N trazos» como identificador principal.
- Slider horizontal «Opacidad» bajo la tarjeta.

### 7.3 Grupos de capas (carpetas)

Referencia Sketchbook: fila **Grupo** con icono carpeta + nombre; capas anidadas indentadas debajo.

| Regla | Detalle |
|-------|---------|
| **Crear grupo** | Acción «+ grupo» o agrupar capas seleccionadas (definir en implementación) |
| **Visibilidad grupo** | Ojo del grupo oculta/muestra **todas** las capas del grupo en compositor |
| **Opacidad grupo** | Slider vertical del grupo modifica opacidad efectiva de hijas (multiplicativa o override — **decidir en impl.**; default: `opacity_efectiva = grupo × capa`) |
| **Bloqueo grupo** | Opcional v1: candado grupo bloquea todas las hijas |
| **Reordenar** | Grupos y capas sueltas reordenables con **≡**; arrastrar grupo mueve bloque entero |
| **Persistencia** | Extender `MapDrawingV2`: p. ej. `layers` mixtos `{ kind: "layer" \| "group", … }` o `groupId` + metadata grupo — **migración v2→v2.1** |

> **Nota:** MAP-006 entregó capas planas; grupos es **feature nueva** dentro de MAP-013, no polish menor.

### 7.4 Miniatura de capa (preview)

Sustituye el contador de trazos.

| Regla | Detalle |
|-------|---------|
| **Contenido** | Render de los trazos **de esa capa** solamente |
| **Encuadre** | **Bounding box** del contenido dibujado — **no** escala del lienzo completo |
| **Ejemplo** | Lienzo 4000×4000 con un trazo pequeño → miniatura muestra solo esa mancha ampliada (zoom al contenido), estilo Sketchbook |
| **Capa vacía** | Placeholder neutro (grid vacío / «—») |
| **Rendimiento** | Cache por capa; invalidar al editar trazos de esa capa |
| **Técnica orientativa** | Offscreen canvas: calcular bbox strokes → `drawMapStrokes` recortado/escalado al rect miniatura |

### 7.5 Backlog ítems CAPAS

| ID | Prioridad | Entregable | Notas | Estado |
|----|-----------|------------|-------|--------|
| M13-LAY-01 | **P1** | Fila capa compacta estilo Sketchbook (layout §7.2) | Sustituye tarjetas altas actuales | ✅ |
| M13-LAY-02 | **P1** | Opacidad **vertical** a la derecha de cada fila | Eliminar slider horizontal inferior | ✅ |
| M13-LAY-03 | **P1** | Reordenar **drag-and-drop** con handle **≡** | Quitar flechas ↑↓; pointer capture + reorder en `layers[]` | ✅ |
| M13-LAY-04 | **P1** | **Miniatura** bbox-contenido por capa | Reemplaza `strokeCount` en UI; ver §7.4 | ✅ |
| M13-LAY-05 | **P1** | **Grupos** de capas (UI + persistencia) | Schema §7.3; carpeta colapsable | ✅ |
| M13-LAY-06 | **P1** | Visibilidad/opacidad de **grupo → hijas** | Compositor aplica opacidad/visible compuesta | ✅ |
| M13-LAY-07 | **P2** | DnD **grupos** enteros + capas entre grupos | Mismo handle ≡ en fila grupo | ✅ |
| M13-LAY-08 | **P2** | Borrar / renombrar grupo; disolver grupo | Capas hijas vuelven a raíz | ✅ |
| M13-LAY-09 | **P3** | Colapsar/expandir grupo en panel | Flecha carpeta como Sketchbook | ✅ |

**Archivos probables:** `MapLayersPanel.tsx`, `mapLayerThumbnail.ts` (nuevo), tipos `maps.ts`, compositor `mapStrokeRender` / `paintMapViewport`, tests bbox + reorder.

---

## 8. Backlog — Estudio dibujo (barra inferior, MAP-005/006)

| ID | Prioridad | Problema | Dirección | Origen | Estado |
|----|-----------|----------|-----------|--------|--------|
| M13-DRAW-01 | **P2** | Barra estudio ancha | Paleta compacta **en sección Estudio del rail** (SHELL-04) | Captura | ✅ |
| M13-DRAW-02 | **P2** | Modos pan/dibujo/hotspot/pin mezclados | Modo exclusivo; indicador en rail Estudio o lienzo | Usuario | ✅ |
| M13-DRAW-03 | **P3** | Presión tableta MAP-005 | Revisar spec §3bis | MAP-005 | ⏸ |
| M13-DRAW-04 | **P2** | Expandir/recortar en pie | M13-SHELL-07 — menú Mapas o ⋮ cabecera | Captura | ✅ |

---

## 9. Backlog — Multi-mundo y metadatos (MAP-002/003/007)

| ID | Prioridad | Problema | Dirección | Origen | Estado |
|----|-----------|----------|-----------|--------|--------|
| M13-META-01 | **P2** | Cambiar mapa con dibujo sucio — dialog OK pero fácil perder contexto T | Confirmar qué se guarda (T por mapa ya existe) + copy | MAP-002 | ⬜ |
| M13-META-02 | **P2** | «Al abrir» poco discoverable junto al selector | Tooltip / onboarding mínimo | MAP-002 | ✅ |
| M13-META-03 | **P3** | Asistente parches solapados §4.3.2 | v1.1 — fuera MAP-013 | MAP-008 | ⏸ |

---

## 10. Backlog — Integración manuscrito / calendario

| ID | Prioridad | Problema | Dirección | Origen | Estado |
|----|-----------|----------|-----------|--------|--------|
| M13-MS-01 | **P2** | Eventos MS no aparecen en barra timeline mapa | Puntos lectura §4.4 futuro | MAP-009 §13.4 | ⏸ |
| M13-MS-02 | **P1** | Extracción §4bis.1 difícil de depurar para el usuario | Panel debug ocurrencias @ T (dev) o copy explicativo | MAP-011 | ✅ (copy) |

---

## 11. Backlog — Técnico / deuda (pospuesto de MAP-012)

| ID | Prioridad | Problema | Dirección | Origen | Estado |
|----|-----------|----------|-----------|--------|--------|
| M13-TECH-01 | **P2** | Deps npm Leaflet/Excalidraw huérfanas | Purga §MAP-012-7 cuando retome | MAP-012 §7 | ⏸ |
| M13-TECH-02 | **P2** | Docs activos describen stack legacy | Actualización §MAP-012-9 | MAP-012 §9 | ⏸ |
| M13-TECH-03 | **P3** | `implementation-plan` MAP-005 📋 vs roadmap ✅ | Alinear fila al cerrar MAP-013 | MAP-012 handoff | ⏸ |
| M13-TECH-04 | ✅ | Test Rust `location_pins_crud_bounds_and_crop_sync` | Corregido 2026-06-11 (pin-b coords) | MAP-012 P0 | ✅ |

---

## 12. Orden sugerido de trabajo

```text
Oleada 0 — Shell panel derecho (P0, usuario 2026-06-11)
  M13-SHELL-01 → SHELL-02 → SHELL-03 → SHELL-05
  M13-SHELL-06 (Desde + timeline unificados abajo)
  M13-SHELL-04 (estudio al rail)

Oleada 1 — Desbloqueo comportamiento
  M13-NAV-01 → smoke mini nav

Oleada 2 — Contenido secciones (P1)
  M13-LAY-01…04 (capas Sketchbook dentro de rail)
  M13-T-01, M13-T-02 (scrubber + parches en contexto nueva barra)
  M13-LOC-01 (handoff editor — cuando se afine)

Oleada 2b — Grupos capas (opcional, caro)
  M13-LAY-05 → LAY-06

Oleada 3 — Polish P2
  M13-NAV-02…05 · M13-LOC-03…05 · M13-DRAW-* · M13-LAY-07…09 · M13-UX-*

Oleada 4 — Retomar MAP-012
  Smoke §6 · purga · docs · cierre Fase F
```

> Las oleadas son orientativas. Ajustar según lo que más duela al usar el mapa día a día.

---

## 13. Fuera de MAP-013 (no mezclar)

| Tema | Destino |
|------|---------|
| Ubicación rica WB, iconos, filtros | WB-001 |
| Edición bidireccional mapa ↔ MS | WB-002 |
| Trayectorias, zonas peligro | WB-003 |
| FIX-011 evento huérfano | Post WB |

---

## 14. Registro

| Fecha | Evento |
|-------|--------|
| 2026-06-11 | Backlog MAP-013 creado — MAP-012 ⏸ pospuesto; deuda §13 MAP-008/009/010/011 + feedback UI «nave espacial» consolidados |
| | Usuario pospone smoke MAP-012 hasta módulo usable |
| 2026-06-11 | **§7 Panel CAPAS** — spec Sketchbook: miniaturas bbox, opacidad vertical, DnD ≡, grupos |
| 2026-06-11 | **§2bis Shell UI** — panel derecho tipo manuscrito (rail iconos); rojo → secciones; Desde fusionado con timeline abajo; M13-SHELL-01…09 |
| 2026-06-11 | **Oleada 0 impl.** — `MapEditSidePanel`, `MapMapsSection`, `useMapEditPanelStore`; refactor `MapWorkspace` (M13-SHELL-01…06, 08 ✅); capas §7 **sin rediseño** |
| 2026-06-11 | **Oleada 2 impl.** — capas Sketchbook M13-LAY-01…04: fila compacta, miniatura bbox, opacidad vertical, DnD ≡ |
| 2026-06-11 | **Oleada 1 impl.** — NAV-01…03: hotspots visibles interactivo, `pushNavFromHotspot`, reset nav/edición; LOC-03 ya OK |
| 2026-06-11 | **Grupos capas** — M13-LAY-05…09: `groups[]` + `groupId`, carpeta UI, opacidad/visible compuesta, DnD, colapsar |
| 2026-06-11 | **Oleada 2b + polish** — T-01/T-02 timeline+parches @ T; SHELL-07/09; NAV-04/05; UX-05/07/08; MS-02; META-02; LOC-01/04; DRAW-01/02/04 |
| 2026-06-11 | **Vista interactiva** — cabecera `Mapas \| nombre`; rail Mapas+lápiz; SHELL-08/10 revisados |

**Notas libres:** _(añadir aquí ítems nuevos con formato M13-XXX antes de codificar)_

---

## 15. Plantilla para nuevos ítems

```markdown
| M13-???-NN | P? | _(qué falla / qué duele)_ | _(dirección de solución)_ | _(origen)_ | ⬜ |
```

---

**Última actualización:** 2026-06-11 (vista interactiva: cabecera fina + rail Mapas/lápiz)
