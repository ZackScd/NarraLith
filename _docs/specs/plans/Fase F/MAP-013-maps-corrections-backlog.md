# MAP-013 — Backlog de correcciones del módulo mapas

> **Estado:** 📋 **Backlog activo** (2026-06-11) — lista viva; ítems se afinan y priorizan antes de ejecutar  
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
| **Cabecera** | Título + badge + selector mapa + «Al abrir» + pin ⭐ en dos filas |
| **Barra temporal** | «Desde» + «Vista en T» + botones Editar/Cambiar — duplica concepto con scrubber inferior |
| **Columna izq.** | PARCHES + DIBUJOS HIJO (+ Hotspots + Ubicaciones más abajo, scroll) — mucha altura mínima por panel |
| **Columna der.** | CAPAS con opacidad por capa |
| **Centro** | Lienzo + grid |
| **Pie** | Scrubber 2000–2029 + barra estudio completa (herramientas, 10 colores, tamaño, opacidad, undo, expandir/recortar) |

**Conclusión:** no falta funcionalidad; falta **jerarquía visual**, **agrupación** y **coherencia** entre modos interactivo / edición.

---

## 3. Backlog — UX e información (layout)

| ID | Prioridad | Problema | Dirección | Origen | Estado |
|----|-----------|----------|-----------|--------|--------|
| M13-UX-01 | **P0** | Cabecera con demasiados controles permanentes (selector, preferencia apertura, pin) | Mover preferencia/pin a menú ⚙️ o fila colapsable; selector más compacto | Captura · MAP-002 §3ter | ⬜ |
| M13-UX-02 | **P1** | «Desde» y «Vista en T» en barra superior **más** scrubber inferior — triple representación del tiempo | Unificar: scrubber = T en ambos modos; «Desde» solo edición metadatos; quitar o fusionar `MapPreviewTField` en edición | Captura · MAP-007/009 | ⬜ |
| M13-UX-03 | **P1** | Columna izq. apila 4–5 paneles (Parches, Nav, Hotspots, Ubicaciones) — ilegible sin scroll largo | Tabs acordeón **una** sección expandida; o sub-nav «Tiempo · Nav · Ubicaciones»; alturas mínimas revisadas | MAP-010 §13 H1 · captura | ⬜ |
| M13-UX-04 | **P1** | Barra inferior = timeline + estudio dibujo — ocupa ~30% vertical en pantallas normales | Estudio en barra flotante/colapsable; timeline siempre visible pero más delgada; expandir estudio bajo demanda | Captura · usuario | ⬜ |
| M13-UX-05 | **P2** | Badge «TERRENO BASE» / ref activa no explica si estás en principal, parche o nav | Copy + icono según `activeDrawingRef`; breadcrumb también en edición si nav activo | MAP-010 H2 | ⬜ |
| M13-UX-06 | **P2** | Capas a la derecha compiten con lienzo en anchura | Capas colapsables / drawer; o integrar capa activa en barra estudio | MAP-006 | ⬜ |
| M13-UX-07 | **P2** | Opacidad en capa **y** opacidad en herramienta — redundante/confuso | Documentar diferencia en UI o unificar según spec §3bis | Captura | ⬜ |
| M13-UX-08 | **P3** | Botón «+ Nuevo mapa» mismo peso visual que salir de edición | Jerarquía: primario = modo vista; secundario = crear mapa | Captura | ⬜ |
| M13-UX-09 | **P2** | Selector mapas crudo (`<select>`) — poco escaneable con muchos mapas | Lista con miniatura / búsqueda (§3ter.1 spec) | MAP-009 §13 · spec §3ter | ⬜ |

---

## 4. Backlog — Comportamiento interactivo / nav

| ID | Prioridad | Problema | Dirección | Origen | Estado |
|----|-----------|----------|-----------|--------|--------|
| M13-NAV-01 | **P0** | Clic hotspot → nav hijo **sin evidencia OBS** (`navPush` ausente en QA MAP-010) | Verificar handler + umbral 5px; smoke mínimo E1–E3 | MAP-010 §12.1 · MAP-012 §6.E | ⬜ |
| M13-NAV-02 | **P1** | Al salir de edición, `activeDrawingRef: nav:*` con `navDepth: 0` — compositor confuso | Reset a `principal` al `setViewMode("interactive")` o al `navPop` final | MAP-010 §13 H2 | ⬜ |
| M13-NAV-03 | **P1** | Breadcrumb / volver depende de NAV-01 | Tras NAV-01, validar `navPop` y clic segmentos | MAP-010 §13 H4 | ⬜ |
| M13-NAV-04 | **P2** | Hotspot panel no muestra destino nav claramente | Label con nombre dibujo hijo + preview bounds | MAP-010 §13 H5 | ⬜ |
| M13-NAV-05 | **P2** | Modo edición: dibujar rect hotspot vs navegar en interactivo — fácil confundir | Hint contextual / deshabilitar nav en edición (ya OK) + copy | MAP-010 | ⬜ |

---

## 5. Backlog — Tiempo, parches y scrubber

| ID | Prioridad | Problema | Dirección | Origen | Estado |
|----|-----------|----------|-----------|--------|--------|
| M13-T-01 | **P1** | Rango barra demasiado ancho (décadas vacías 2000–2029) | Padding adaptativo en `computeMapTimelineRange` | MAP-009 §13.2 | ⬜ |
| M13-T-02 | **P1** | Panel PARCHES no refleja qué parche está vigente en T | Highlight / opacidad lista según `previewT` | MAP-009 §13.1 | ⬜ |
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
| M13-LOC-01 | **P1** | Atajo editor → mapa (`SideLocationMapSection`) es **placeholder**, no flujo deseado | Rediseñar handoff: ¿abrir mapa en T del evento? ¿panel split? | Usuario · MAP-011 | ⬜ |
| M13-LOC-02 | **P1** | Panel Ubicaciones enterrado bajo otros paneles | Subir prioridad visual o tab dedicado | Captura | ⬜ |
| M13-LOC-03 | **P2** | Marcas X visibles también en **edición** (spec C5: solo interactivo) | Ocultar `locationMarkers` salvo ghost colocación | MAP-011 C5 · MAP-012 §2.8 | ⬜ |
| M13-LOC-04 | **P2** | Anclar pin: flujo poco guiado (lista ocurrencias @ T vs unpinned) | Wizard corto o click-to-place más obvio | Usuario | ⬜ |
| M13-LOC-05 | **P2** | Tras crop, pins fuera de bounds — verificar feedback UI | Toast + panel refresh (Rust ya sincroniza) | MAP-011 · MAP-012 §8.1 | ⬜ |
| M13-LOC-06 | **P3** | X en nav hijo — implementado pero no validado en QA | Caso smoke F5 cuando MAP-012 retome | MAP-011 D7 | ⬜ |

---

## 7. Backlog — Estudio dibujo (MAP-005/006)

| ID | Prioridad | Problema | Dirección | Origen | Estado |
|----|-----------|----------|-----------|--------|--------|
| M13-DRAW-01 | **P2** | Barra estudio muy ancha (10 colores + sliders) | Paleta colapsable; favoritos; último color | Captura | ⬜ |
| M13-DRAW-02 | **P2** | Herramientas pan vs dibujo vs hotspot vs pin — muchos modos | Modo único exclusivo con indicador claro | Usuario | ⬜ |
| M13-DRAW-03 | **P3** | Presión tableta / pinceles avanzados MAP-005 | Revisar spec §3bis vs entregado | MAP-005 plan | ⏸ |
| M13-DRAW-04 | **P2** | Expandir / recortar lienzo en barra inferior — acción poco frecuente, mucho peso | Mover a menú mapa o diálogo | Captura | ⬜ |

---

## 8. Backlog — Multi-mundo y metadatos (MAP-002/003/007)

| ID | Prioridad | Problema | Dirección | Origen | Estado |
|----|-----------|----------|-----------|--------|--------|
| M13-META-01 | **P2** | Cambiar mapa con dibujo sucio — dialog OK pero fácil perder contexto T | Confirmar qué se guarda (T por mapa ya existe) + copy | MAP-002 | ⬜ |
| M13-META-02 | **P2** | «Al abrir» poco discoverable junto al selector | Tooltip / onboarding mínimo | MAP-002 | ⬜ |
| M13-META-03 | **P3** | Asistente parches solapados §4.3.2 | v1.1 — fuera MAP-013 | MAP-008 | ⏸ |

---

## 9. Backlog — Integración manuscrito / calendario

| ID | Prioridad | Problema | Dirección | Origen | Estado |
|----|-----------|----------|-----------|--------|--------|
| M13-MS-01 | **P2** | Eventos MS no aparecen en barra timeline mapa | Puntos lectura §4.4 futuro | MAP-009 §13.4 | ⏸ |
| M13-MS-02 | **P1** | Extracción §4bis.1 difícil de depurar para el usuario | Panel debug ocurrencias @ T (dev) o copy explicativo | MAP-011 | ⬜ |

---

## 10. Backlog — Técnico / deuda (pospuesto de MAP-012)

| ID | Prioridad | Problema | Dirección | Origen | Estado |
|----|-----------|----------|-----------|--------|--------|
| M13-TECH-01 | **P2** | Deps npm Leaflet/Excalidraw huérfanas | Purga §MAP-012-7 cuando retome | MAP-012 §7 | ⏸ |
| M13-TECH-02 | **P2** | Docs activos describen stack legacy | Actualización §MAP-012-9 | MAP-012 §9 | ⏸ |
| M13-TECH-03 | **P3** | `implementation-plan` MAP-005 📋 vs roadmap ✅ | Alinear fila al cerrar MAP-013 | MAP-012 handoff | ⏸ |
| M13-TECH-04 | ✅ | Test Rust `location_pins_crud_bounds_and_crop_sync` | Corregido 2026-06-11 (pin-b coords) | MAP-012 P0 | ✅ |

---

## 11. Orden sugerido de trabajo

```text
Oleada 1 — Desbloqueo (P0)
  M13-NAV-01 → M13-UX-01 (cabecera) → smoke mini nav

Oleada 2 — «Dejar de parecer nave espacial» (P1 UX)
  M13-UX-02, M13-UX-03, M13-UX-04
  M13-T-01, M13-T-02
  M13-LOC-01, M13-LOC-02

Oleada 3 — Comportamiento fino (P1 restante + P2)
  M13-NAV-02…05 · M13-LOC-03…05 · M13-DRAW-* · M13-UX-*

Oleada 4 — Retomar MAP-012
  Smoke §6 · purga · docs · cierre Fase F
```

> Las oleadas son orientativas. Ajustar según lo que más duela al usar el mapa día a día.

---

## 12. Fuera de MAP-013 (no mezclar)

| Tema | Destino |
|------|---------|
| Ubicación rica WB, iconos, filtros | WB-001 |
| Edición bidireccional mapa ↔ MS | WB-002 |
| Trayectorias, zonas peligro | WB-003 |
| FIX-011 evento huérfano | Post WB |

---

## 13. Registro

| Fecha | Evento |
|-------|--------|
| 2026-06-11 | Backlog MAP-013 creado — MAP-012 ⏸ pospuesto; deuda §13 MAP-008/009/010/011 + feedback UI «nave espacial» consolidados |
| | Usuario pospone smoke MAP-012 hasta módulo usable |

**Notas libres:** _(añadir aquí ítems nuevos con formato M13-XXX antes de codificar)_

---

## 14. Plantilla para nuevos ítems

```markdown
| M13-???-NN | P? | _(qué falla / qué duele)_ | _(dirección de solución)_ | _(origen)_ | ⬜ |
```

---

**Última actualización:** 2026-06-11
