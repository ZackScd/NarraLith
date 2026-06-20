# MAP-012 — Smoke Era III + purga legacy + cierre Fase F

> **Estado:** ⏸ **Pospuesto** (2026-06-11) — retomar tras [MAP-013](MAP-013-maps-corrections-backlog.md)  
> **Esfuerzo:** Medio · **Riesgo:** Medio (smoke transversal + deps + deuda QA acumulada)  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md) Fase F · **Spec:** [`maps-design.md`](../../maps-design.md) §2 · §9 · **Previo:** [MAP-011](MAP-011-manuscript-location-x.md) · **Siguiente:** Era IV / WB-001 (aplazado)

---

## 0. Convención

| Regla | Detalle |
|-------|---------|
| Flujo | P0 §3 → pre-vuelo §3 → smoke §6 → purga §7 → polish §8 → docs §9 → cerrar §12 |
| Commits | **Usuario** |
| Evidencia | `npm test` + `cargo test` + `npm run build` + sesión OBS smoke + grep final |
| OBS | Recorrido §6 con toggles acción + render estándar ON |
| Alcance | **No** nuevas features Era III · **Sí** cerrar deuda MAP-008/009/010/011 + barrido MAP-000 §2.5 |
| Automatizado vs manual | Gates §6.A / §10 = agente o CI · **Smoke §6.B–G = usuario** (ver §14) |

**Contratos heredados (no renegociar en MAP-012):**

| Origen | Contrato |
|--------|----------|
| MAP-000 §1.1 | Barrido final deps/docs/tests — **este plan** |
| MAP-011 §11 | Smoke integrado MS + mapas + X @ T + nav + parches |
| MAP-009/010 §13 | Polish UX — triage §8 (no todo es bloqueante) |
| maps-design §4bis.4.3+ | WB rico, edición bidireccional — **Fuera** (WB-001…) |

---

## 1. Problema y objetivo

### 1.1 Problema (post MAP-011)

Era III está **funcionalmente implementada** en código v2 (canvas 2D, persistencia JSON, compositor, nav, ubicaciones), pero:

| Carencia | Impacto |
|----------|---------|
| **Sin smoke end-to-end** formal que cruce editor ↔ mapa ↔ MS ↔ T ↔ nav ↔ X | Riesgo de regresión al cerrar Fase F |
| **Deps npm legacy** (`leaflet`, `excalidraw`) aún en `package.json` sin uso en `src/` | Contradice MAP-000 §2.5; ruido en build/auditorías |
| **Docs activos desactualizados** (`maps-design.md` §2, `02-TECH_STACK.md`, …) | Describe stack Leaflet como «actual» |
| **QA parcial acumulada** MAP-008 §9, MAP-009 §9/§13, MAP-010 §9/§13 | Cierre funcional ✅ pero evidencia OBS incompleta |
| **MAP-011** impl ✅ · QA OBS pendiente | No marcar ✅ hasta smoke §6.F |
| **Placeholder editor→mapa** (`SideLocationMapSection`) aceptado por usuario | v1.0 stub; no bloquea smoke si pin manual funciona |

### 1.2 Objetivo MAP-012

1. **Smoke Era III** — recorrido reproducible integrado con manuscrito y calendario.
2. **Purga legacy** — eliminar deps npm huérfanas + docs/notices + grep final.
3. **Cierre deuda QA crítica** — re-verificar nav push/pop (MAP-010) y ubicaciones @ T (MAP-011).
4. **Triage polish §13** — clasificar fixes vs post-v0.11.
5. **Cerrar Fase F** — MAP-011 ✅ + MAP-012 ✅ en lista maestra.

### 1.3 Criterios de aceptación (done)

| # | Criterio |
|---|----------|
| C1 | `npm test -- --run` verde (≥320 tests) |
| C2 | `npm run build` verde sin imports Leaflet/Excalidraw |
| C3 | `cargo test maps_store` (34 OK) + `cargo test location_occurrences` (2 OK) |
| C4 | Grep §7.2 vacío en `src/` y `src-tauri/src/` |
| C5 | Cuatro deps npm legacy eliminadas; lockfile regenerado |
| C6 | Smoke §6.B–G completado; sesión OBS en §12 |
| C7 | Nav: clic hotspot → `navPush` → breadcrumb → `navPop` (OBS) |
| C8 | Ubicaciones: X @ T tras pin + scrubber (§6.F) |
| C9 | Docs §9 actualizados |
| C10 | `implementation-plan.md`: MAP-011 ✅ · MAP-012 ✅ |

---

## 2. Auditoría pre-planificación (2026-06-11)

> MAP-001 purgó **código**; MAP-012 = smoke + npm + docs + QA OBS.

### 2.1 Código runtime — Era III (✅)

| Área | Hallazgo |
|------|----------|
| UI mapas | ~20 componentes en `src/modules/maps/` |
| Hooks | `useMapProject`, `useMapNav`, `useProjectLocations`, `useMapLocationPinGesture`, … |
| Lib | 22 archivos test en `src/lib/maps/` |
| Rust | `maps_store.rs`: principal, secundarios, nav, hotspots, location-pins, crop sync |
| IPC mapas | **30 comandos** en `lib.rs` (líneas 89–118) |
| Legacy runtime | **0** refs Leaflet/Excalidraw/IPC v1 en `src/` + `src-tauri/src/` |

### 2.2 Dependencias npm — pendiente §7 (⚠️)

| Paquete | Acción |
|---------|--------|
| `leaflet`, `react-leaflet`, `@excalidraw/excalidraw`, `@types/leaflet` | Eliminar §7.1 |

### 2.3 Tests automatizados

| Suite | Cobertura |
|-------|-----------|
| Frontend | 320 tests (`npm test -- --run`) |
| Rust `maps_store` | **34** tests |
| Rust `location_occurrences` | 2 tests |
| Gap | Sin E2E React; smoke §6 = manual + OBS |

### 2.4 Documentación — desalineada (⚠️ → §9)

| Archivo | Problema |
|---------|----------|
| `maps-design.md` §2 | Leaflet como «actual» |
| `_docs/02-TECH_STACK.md` §8 | Mapas con Leaflet |
| `_docs/01-REQUIREMENTS.md` §7 | Purga legacy obsoleta |
| `_docs/03-ROADMAP.md` | «Código Leaflet existe» |
| `THIRD_PARTY_NOTICES.md` | Licencias Leaflet/Excalidraw activas |
| `implementation-plan.md` | MAP-005 📋 vs `maps-roadmap.md` ✅ |

### 2.5 Deuda QA heredada

| Plan | Deuda MAP-012 |
|------|---------------|
| MAP-008 | §9 parcial — mayoría opcional §8.2 |
| MAP-009 | §13 polish — diferido §8.3 |
| MAP-010 | **Crítico:** `navPush`/`navPop` sin OBS §12.1 |
| MAP-011 | 🔄 impl · QA §6.F |

### 2.6 Cambios recientes (verificar en smoke)

| Cambio | Archivo |
|--------|---------|
| Scrubber activo en edición | `MapWorkspace.tsx` (`interactive` siempre) |
| Sidebar scroll único | columna `overflow-y-auto` |
| Atajo editor→mapa stub | `SideLocationMapSection.tsx` — opcional F8 |
| Umbral clic vs pan 5px | `useMapViewport.ts` `INTERACTIVE_CLICK_MOVE_PX` |

### 2.7 Veredicto inicial

```text
MAP-012 NO re-purga modules/maps/.
MAP-012 SÍ: smoke + deps + docs + OBS nav/ubicaciones.
```

### 2.8 Re-auditoría seguridad (2026-06-11)

| Comprobación | Resultado |
|--------------|-----------|
| `npm test -- --run` | ✅ 320/320 |
| `npm run build` | ✅ |
| `cargo test location_occurrences` | ✅ 2/2 |
| `cargo test maps_store` | ❌→✅ tras fix test `location_pins_crud_bounds_and_crop_sync` (pin-b fuera de bounds post-crop) |
| Purga npm segura | ✅ 0 imports en `src/` |
| Nav/location OBS cableados | ✅ `useMapNav`, `MapWorkspace` |
| X en vista nav hijo | ✅ `paintMapViewport` rama `composeNavDrawing` |
| Desviación spec | X también visibles en **edición** (MAP-011 C5); no bloqueante si smoke usa interactivo |

**Conclusión §2.8:** plan **seguro de ejecutar** tras P0 verde. Bloqueante real restante = **smoke manual OBS** §6.E + §6.F.

---

## 3. Pre-vuelo

| # | Acción | Quién | Bloqueante |
|---|--------|-------|------------|
| **P0** | `cargo test maps_store` verde (incl. `location_pins_crud_bounds_and_crop_sync`) | Agente | ✅ corregido 2026-06-11 |
| **P1** | `npm test -- --run` · `cargo test location_occurrences` · `npm run build` | Agente | ✅ |
| **P2** | Proyecto QA: calendario + MS con barTags time+location + mapa con parche/nav/hotspot (`map_677dcb30…` o equivalente) | **Usuario** | ✅ |
| **P3** | OBS ON (acción + render estándar) | **Usuario** | ✅ |
| **P4** | Decidir polish §8 (registrar en §12) | Usuario | Recomendado |

> **No** marcar MAP-011 ✅ hasta smoke §6.F exitoso (Fase 6 §12).

---

## 4. Alcance

### 4.1 Dentro de MAP-012

- Smoke §6 (usuario) + gates §6.A (agente)
- Purga §7 + docs §9 (agente)
- Fixes solo si smoke falla (§8.1)
- Cierre §12

### 4.2 Fuera (no fallar done)

| Tema | Destino |
|------|---------|
| WB rico / edición bidireccional | WB-001… |
| Crossfade, sync timeline global | MAP-009 §13.4 / post-v0.11 |
| Rediseño atajo editor→mapa | Post MAP-012 |
| X solo en interactivo (spec C5) | Polish opcional; documentar si persiste |

---

## 5. Fases de ejecución

```text
Fase 0   P0 — cargo test maps_store verde
Fase 1   P1 — baseline automatizado
Fase 2   Smoke §6 — USUARIO (bloqueantes C7–C8)
Fase 3   Purga §7 — agente
Fase 4   Docs §9 — agente
Fase 5   Polish §8 — opcional
Fase 6   Cierre §12 — MAP-011 ✅ + MAP-012 ✅
```

**Checkpoint Fase 2:** OBS con `navPush`, `navPop`, `locationPinCreate`, compositor `navDepth≥1` + `locationCountAtT≥2`.

---

## 6. Smoke Era III

### 6.A Puertas automatizadas (agente — Fase 1)

```powershell
npm test -- --run
npm run build
cd src-tauri; cargo test maps_store
cd src-tauri; cargo test location_occurrences
```

Grep pre-purga (código; debe vaciarse salvo comentarios inexistentes):

```powershell
rg -i "leaflet|excalidraw|MapLeaflet|MapSketch|get_map_data_cmd" src src-tauri/src
```

### 6.B Multi-mundo y lienzo

| Paso | Acción | Esperado |
|------|--------|----------|
| B1 | Abrir mapas | Open preference OK |
| B2 | Cambiar mapa con dibujo sucio | Dialog guard |
| B3 | Crear mapa + imagen | Dimensiones OK |
| B4 | Expandir + recortar | Trazos/pins/hotspots OK |

### 6.C Estudio (MAP-004/005/006)

| Paso | Acción | Esperado |
|------|--------|----------|
| C1 | Interactivo default; ✏️ edición | Modos OK |
| C2 | Dibujar; capas; undo/redo | Autosave |
| C3 | Salir del módulo | Sin pérdida |

> MAP-005 está impl (`MapEditStudio`); fila 📋 en `implementation-plan.md` es solo doc.

### 6.D Tiempo y parches

| Paso | Acción | Esperado |
|------|--------|----------|
| D1 | Desde + secundario @ T | Parche al scrub |
| D2 | Scrubber en interactivo **y** edición | T cambia |
| D3 | Mapa A→B→A | T de A restaurado |
| D4 | Segundo parche + tiempoFin | Opcional §8.2 |

### 6.E Navegación — **bloqueante**

| Paso | Acción | Esperado | OBS |
|------|--------|----------|-----|
| E1 | Interactivo: clic hotspot **sin arrastrar** (>5px cancela) | Vista hijo | `navPush`, `navDepth≥1` |
| E2 | Scrubber T en hijo | T estable | `timeT` |
| E3 | Breadcrumb volver | Vista padre | `navPop` |
| E4 | Edición: rect hotspot | No navega | — |
| E5 | Sidebar scroll a Ubicaciones | Un scroll columna | visual |
| E6 | Expand/crop con nav | Sync OK | Rust cubre |

### 6.F Ubicaciones — **bloqueante**

| Paso | Acción | Esperado | OBS |
|------|--------|----------|-----|
| F1 | MS: time **X** + locations **A**, **B** | 2 ocurrencias @ X | — |
| F2 | Anclar pins **A**, **B** @ coords; pin **C** extra (sin ocurrencia @ X) | `location-pins.json` 3 pins | `locationPinCreate` ×3 |
| F3 | Interactivo T=X | X solo en **A**, **B** (`locationCountAtT≥2`) | compositor |
| F4 | Scrub T=Y / vacío | X acorde | compositor |
| F5 | Nav hijo @ T=X | X siguen visibles (MAP-011 D7) | `navDepth≥1` + `locationCountAtT≥2` |
| F6 | Mover/eliminar pin | Persistencia | `locationPinMove` / `Delete` |
| F7 | Guardar MS (nueva location) | Panel Ubicaciones refresh | — |
| F8 | *(Opcional)* stub editor insertar+pin | Placeholder | limitación v1 |

### 6.G Transversal

| Paso | Acción | Esperado |
|------|--------|----------|
| G1 | editor → mapa → scrub → nav → X → editor | Sin crash |
| G2 | Cambiar proyecto | Reset stores |
| G3 | i18n maps + editor location | Sin claves rotas |

---

## 7. Purga legacy (agente — Fase 3)

### 7.1 npm

1. Quitar de `package.json`: `leaflet`, `react-leaflet`, `@excalidraw/excalidraw`, `@types/leaflet`
2. `npm install`
3. `npm run build`

### 7.2 Grep final

En `src/` + `src-tauri/src/` (excl. `_docs/`):

```text
leaflet | excalidraw | MapLeaflet | MapSketch | mapMutations
get_map_data_cmd | get_map_state_at | layers.json
sketches/default.excalidraw
```

> No grep global `manifest.json` — demasiado genérico; mapas v2 no lo usa.

### 7.3 Tests huérfanos

Auditoría: ningún test TS/Rust referencia símbolos legacy.

---

## 8. Triage polish §13

### 8.1 Si smoke falla (fix regresión)

| ID | Ítem |
|----|------|
| MAP-010 H3 | Clic vs pan — sin `navPush` |
| MAP-010 H2 | `activeDrawingRef: nav:*` con `navDepth: 0` |
| MAP-010 H4 | Breadcrumb invisible |
| MAP-011 | Pin tras crop en UI |

### 8.2 Si hay tiempo

MAP-010 H1/H5 · MAP-009 §13.2 · MAP-008 §9 restante

### 8.3 Diferir post-v0.11

MAP-009 §13.1/§13.4 · §3ter.1 · rediseño editor→mapa

---

## 9. Documentación (agente — Fase 4)

| Archivo | Acción |
|---------|--------|
| `_docs/specs/maps-design.md` §2 | Era III canvas 2D |
| `_docs/02-TECH_STACK.md` | Compositor propio |
| `_docs/01-REQUIREMENTS.md` | Purga legacy ✅ |
| `_docs/03-ROADMAP.md` | Era III mapas ✅ |
| `THIRD_PARTY_NOTICES.md` | Quitar Leaflet/Excalidraw |
| `implementation-plan.md` | MAP-005 ✅ · MAP-011 ✅ · MAP-012 ✅ |
| `maps-roadmap.md` | Registro cierre |
| `plans/README.md` | Próximo Era IV / WB |
| MAP-011 §12 | Sesión QA smoke |
| `plans/_archive/DEFERRED.md` | Polish §13 diferido (opcional) |

---

## 10. Gate final (agente)

| Comando | Esperado |
|---------|----------|
| `npm test -- --run` | ≥320 OK |
| `npm run build` | OK |
| `cargo test maps_store` | 34 OK |
| `cargo test location_occurrences` | 2 OK |
| Grep §7.2 | vacío en código |
| `package.json` | sin 4 deps legacy |

---

## 11. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Nav sin OBS previo | §6.E bloqueante; §8.1 |
| Purga rompe build | §10 tras §7 |
| Inflar scope | §8 triage |
| Marcar ✅ sin smoke | C6/C7/C8 obligatorios |

---

## 12. Registro

| Fecha | Evento |
|-------|--------|
| 2026-06-11 | Plan MAP-012 redactado + auditoría §2 |
| 2026-06-11 | Re-auditoría §2.8: fix test `location_pins_crud_bounds_and_crop_sync` (pin-b @ 1100,750); plan corregido P0/P2/F2/rutas |

**Sesiones OBS smoke:** _(usuario — rellenar tras §6)_

**Decisión polish §8:** _(rellenar)_

---

## 13. Handoff post-Era III

| Destino | Contenido |
|---------|-----------|
| v0.11.x / changelog | Era III cerrada |
| WB-001… | Ubicación rica |
| Polish §13 | MAP-013 opcional o DEFERRED |
| FIX-010e / VER-001 | Era IV calendario |

---

## 14. Qué hace el usuario manualmente

> El agente puede ejecutar P0–P1, §7 purga, §9 docs y §10 gates. **Tú** debes hacer lo siguiente.

### Antes del smoke

1. **Abrir un proyecto QA** con:
   - Calendario configurado
   - Manuscrito con al menos un evento con barTags `time` + `location` (dos ubicaciones distintas en el mismo **T**)
   - Un mapa con: `desde`, ≥1 parche secundario, ≥1 nav + hotspot enlazado (o créalos durante el smoke)
2. **Activar OBS** — toggles acción + render estándar ON (debug build).
3. *(Opcional)* Anotar ID sesión OBS al iniciar.

### Durante el smoke (≈45–60 min)

4. Recorrer **§6.B → §6.G** en la app Tauri (`npm run tauri dev` o build instalada).
5. **Bloqueantes obligatorios** — no cerrar MAP-012 si fallan:
   - **§6.E** E1–E3: clic hotspot → hijo → volver; confirmar `navPush` / `navPop` en logs OBS
   - **§6.F** F1–F7: pins, X @ T, scrub, nav hijo, mover/eliminar pin, guardar MS
6. **§6.G** G1: una pasada editor ↔ mapa sin crash.
7. Si algo falla: anotar paso + captura/log; el agente aplica §8.1 — **no** purgar deps hasta re-smoke OK.

### Después del smoke OK

8. **Comunicar al agente:** «smoke OK» + pegar ID sesión OBS (o resumen) para §12.
9. **Decidir polish §8** — qué difieres a post-v0.11 (una línea basta).
10. **Commit** cuando quieras (agente no commitea salvo que lo pidas): incluye purga deps + docs + fix test si aplica.

### No necesitas hacer manualmente

- `npm test` / `cargo test` / `npm run build`
- Quitar deps Leaflet/Excalidraw de `package.json`
- Actualizar `maps-design.md`, TECH_STACK, THIRD_PARTY, etc.
- Grep legacy

---

**Última actualización:** 2026-06-11 (re-auditoría + §14 manual)
