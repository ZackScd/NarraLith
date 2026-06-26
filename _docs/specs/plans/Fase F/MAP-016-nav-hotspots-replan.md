# MAP-016 — Dibujos hijo + hotspots unificados (replan)

> **Estado:** 📋 **Planificado** (2026-06-25)  
> **Tipo:** Replanteo navegación §5 — supersede parcial **MAP-010** (rect in-viewport)  
> **Spec:** [`maps-design.md`](../../maps-design.md) §5.5–5.6 · Tab MAP-015 §2.8  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md)  
> **Depende de:** MAP-014 (shell flotante) · MAP-015 tab «Dibujos hijo»

| Campo | Valor |
|-------|--------|
| **Prioridad** | P0 — modelo navegación acordado |
| **Esfuerzo** | Alto |
| **Referencia UX** | Rubber banding / tethering (captura usuario) · ventana hijo = mini workspace |

---

## 0. Decisiones de producto (usuario 2026-06-25)

### A — Una sola opción: hijo ⟺ hotspot

| Antes (MAP-010) | Ahora |
|-----------------|-------|
| Crear dibujo hijo (`CreateNavDialog`) **y** dibujar hotspot por separado | **Un solo flujo:** «Nuevo dibujo hijo» → dibujar zona → crea **ambos** |
| Hotspot sin hijo / hijo sin hotspot posible en UI | **Prohibido** — relación 1:1 obligatoria |
| Paneles `MapNavDrawingsPanel` + `MapHotspotsPanel` | **Un tab** «Dibujos hijo» (MAP-015) |

### B — Forma del hotspot

| Herramienta | Default | Descripción |
|-------------|---------|-------------|
| **Rubber banding** (lasso + tether) | **✅** | Origen + trazo con línea elástica al cursor; contorno discontinuo; polígono cerrado |
| Rectángulo | Opcional | Drag — comportamiento MAP-010 |
| Círculo | Opcional | Centro + radio |

### C — Ventana flotante del hijo

| Antes (MAP-010) | Ahora |
|-----------------|-------|
| Clic hotspot → **sustituye** lienzo en viewport (`navStack`, breadcrumb) | Clic hotspot → **ventana flotante** sobre el padre |
| Editar hijo = cambiar `activeDrawingRef` en mismo layout | Editar hijo = **abrir ventana** con mismas herramientas (estudio, capas, T) |

### D — Vista interactiva

- Clic en hotspot (hit-test polígono/rect/círculo) → abre ventana hijo en modo **interactivo** (compositor @ T, sin dibujar).

---

## 1. Estado actual (MAP-010 — a refactorizar)

| Pieza | Archivo | Comportamiento v1 |
|-------|---------|-------------------|
| Bounds | `MapHotspotBoundsV1` `{ x,y,width,height }` | Solo rectángulo |
| Hit-test | `mapHotspotHitTest.ts` | `pointInHotspotBounds` AABB |
| Crear nav | `CreateNavDialog.tsx` | Sin hotspot |
| Hotspots UI | `MapHotspotsPanel.tsx` | Lista + modo dibujo rect |
| Nav stack | `useMapNav.ts`, `MapNavBreadcrumb.tsx` | Push/pop in-viewport |
| Interactivo | `mapInteractiveNavClick.ts` | Clic → `navPush` |

**Mantener reutilizable:** persistencia `drawings/nav/`, IPC CRUD nav, `MapDrawingRef.kind === "nav"`, guards dirty por ref, T conservado.

**Deprecar / sustituir:** `navStack` in-viewport, breadcrumb como navegación principal, hotspot rect-only, flujos desacoplados nav/hotspot.

---

## 2. Modelo de datos — `hotspots.json` v2

```typescript
type MapHotspotShapeV2 =
  | { kind: "polygon"; points: { x: number; y: number }[] }
  | { kind: "rect"; x: number; y: number; width: number; height: number }
  | { kind: "circle"; cx: number; cy: number; radius: number };

interface MapHotspotV2 {
  id: string;
  label?: string;
  hostDrawingRef: MapHostDrawingRef;
  shape: MapHotspotShapeV2;
  targetNavId: string; // siempre presente — 1:1 con nav
}

interface MapNavSummaryV2 extends MapNavSummaryV1 {
  hotspotId: string; // back-ref opcional para integridad
}
```

| Regla | Detalle |
|-------|---------|
| Migración v1→v2 | `bounds` rect → `shape: { kind: "rect", … }` |
| Crear hijo | Transacción: `create_nav` + `append_hotspot` con `targetNavId` |
| Eliminar hijo | Elimina hotspot vinculado (y viceversa — confirmación usuario) |
| Validación | Polígono ≥ 3 puntos; sin auto-intersección (v1: aceptar cualquier polígono simple) |

---

## 3. Herramienta rubber banding (lienzo padre)

### 3.1 Estados del gesto

```text
idle → originPlaced → drawing → closed | cancelled
```

| Fase | UI |
|------|-----|
| **originPlaced** | Punto «Origin» + tether al cursor + distancia px (tooltip) |
| **drawing** | Vértices sucesivos; contorno **discontinuo** cerrado al cursor |
| **closed** | Polígono sólido preview → diálogo nombre hijo → persistir |

### 3.2 Componentes nuevos

| Componente | Rol |
|------------|-----|
| `useHotspotDrawGesture.ts` | Máquina estados; coordenadas mundo |
| `MapHotspotDrawOverlay.tsx` | SVG/canvas overlay: origin, tether, dashed path, px label |
| `MapHotspotToolPicker.tsx` | Selector lasso \| rect \| circle |

### 3.3 Integración

- Solo activo en **modo edición** del host (`principal` o `nav` padre).
- Tras cerrar polígono → `CreateNavChildDialog` (nombre) → IPC atómico nav+hotspot.
- Lista tab «Dibujos hijo»: fila = hijo + mini preview forma + editar zona / editar dibujo / eliminar.

---

## 4. Ventana flotante `MapNavChildWindow`

### 4.1 Wireframe

```text
┌─ Padre (viewport principal, sigue visible) ─────────────┐
│  mapa continente + hotspots overlay                      │
│                    ┌─ Ventana hijo ─────────────────┐   │
│                    │ ≡ Ciudad de…              [×] │   │
│                    ├───────────────────────────────┤   │
│                    │        lienzo hijo            │   │
│                    ├───────────────────────────────┤   │
│                    │ scrubber T                    │   │
│                    └───────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

### 4.2 Contenido

Reutilizar piezas existentes scoped a `drawingRef: { kind: "nav", id }`:

| Pieza | Notas |
|-------|-------|
| `MapViewport` + compositor | Mismo motor paint |
| `MapTimelineBar` | T sincronizado con padre store |
| Ventana capas MAP-015 | Opcional embebida o botón abre |
| `MapEditStudio` | Modo edición |
| Modo interactivo | Sin estudio; clic hotspots internos abre **ventana nieta** |

### 4.3 Store

```typescript
interface MapNavWindowState {
  openWindows: Array<{
    navId: string;
    mode: "interactive" | "edit";
    position: { x; y };
    size: { width; height };
    parentNavId?: string; // para anidación
  }>;
  openFromHotspot(navId, mode): void;
  close(navId): void;
  focus(navId): void;
}
```

### 4.4 Sustitución nav stack

| MAP-010 | MAP-016 |
|---------|---------|
| `useMapNav` push/pop | `useMapNavWindows` open/close |
| `MapNavBreadcrumb` | **Opcional:** breadcrumb **dentro** de ventana hijo o título cadena |
| `activeDrawingRef` en workspace principal | Principal **no** cambia a nav al navegar |

---

## 5. Hit-test y vista interactiva

| `shape.kind` | Algoritmo |
|--------------|-----------|
| `rect` | AABB (actual) |
| `circle` | distancia ≤ radius |
| `polygon` | Ray casting / winding |

`resolveInteractiveHotspotHit` → en lugar de `navPush`, llama `openNavWindow(targetNavId, "interactive")`.

**Pan vs clic:** conservar umbral drag MAP-010 (`mapInteractiveNavClick`).

---

## 6. Fases de implementación

| Fase | ID | Entregable |
|------|-----|------------|
| **1** | M16-SCHEMA | `hotspots.json` v2 + migración lectura v1 |
| **2** | M16-LASSO | Rubber banding overlay + persist polygon |
| **3** | M16-TOOLS | Selector rect/circle; hit-test extendido |
| **4** | M16-UNIFY | Flujo único crear hijo+zona; purga UI dual |
| **5** | M16-WINDOW | `MapNavChildWindow` + store ventanas |
| **6** | M16-EDIT | Abrir ventana edición desde tab lista |
| **7** | M16-INTER | Clic interactivo → ventana; deprecar navStack |
| **8** | M16-QA | Tests polígono + OBS + migración |

**Orden:** 1 → 2 → 4 → 3 → 5 → 6 → 7 → 8. (Unificar flujo antes de pulir herramientas geométricas.)

**Dependencia MAP-014:** ventana hijo usa `FloatingPanelFrame` (Fase A).

---

## 7. Criterios de aceptación

- [ ] No existe acción «solo hotspot» ni «solo hijo» — siempre par.
- [ ] Herramienta default al crear zona = rubber banding.
- [ ] Tether + distancia px visibles durante el trazo.
- [ ] Rect y circle disponibles en selector.
- [ ] Editar hijo abre ventana flotante con estudio + capas + T.
- [ ] Interactivo: clic en zona abre ventana; padre permanece visible.
- [ ] T no se resetea al abrir/cerrar ventana.
- [ ] Hotspots v1 rect migran sin pérdida.
- [ ] **Re-editar** forma hotspot de hijo existente persiste sin recrear nav.
- [ ] `navStack` / breadcrumb in-viewport eliminados o reducidos a legacy flag.

---

## 8. Preguntas abiertas

| ID | Pregunta |
|----|----------|
| **Q1** | ¿Varias ventanas hijo abiertas simultáneamente? (**asumimos sí** hasta confirmación) |
| **Q2** | ¿Ventana hijo modal (bloquea padre) o no modal? |
| **Q3** | ¿Tamaño default ventana (% viewport)? |
| **Q4** | Círculo: ¿drag desde centro o dos clics? |
| ~~**Q5**~~ | ~~¿Re-editar forma hotspot?~~ → **✅ Sí** — gesto zona reentrable en padre; actualiza `shape` en `hotspots.json` v2 |

---

## 9. Relación MAP-010 / MAP-015

| Documento | Cambio |
|-----------|--------|
| **MAP-010** | Marcado **superseded** en navegación UX — código base IPC reutilizable |
| **MAP-015 §2.8** | Tab «Dibujos hijo» implementa lista + lanza gestos §3 y ventanas §4 |

---

## 10. Registro

| Fecha | Evento |
|-------|--------|
| 2026-06-25 | Plan creado — hijo+hotspot unificados; rubber banding default; ventana flotante hijo; supersede MAP-010 in-viewport |
| 2026-06-25 | **Q5 cerrada:** re-editar forma hotspot = **Sí** |
