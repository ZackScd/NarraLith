# MAP-014 — Panel de herramientas flotante (módulo mapas)

> **Estado:** 📋 **Planificado** (2026-06-25)  
> **Tipo:** Replanteo UI — ventana lateral derecha flotante y arrastrable (Sketchbook)  
> **Spec:** [`maps-design.md` §8.5](../../maps-design.md) · **Supersede:** MAP-013 §2bis (rail fijo)  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md)  
> **Bloquea:** MAP-012 (smoke) — junto con MAP-013 residual

| Campo | Valor |
|-------|--------|
| **Prioridad** | P0 — arquitectura UI antes de más polish MAP-013 |
| **Esfuerzo** | Medio–Alto |
| **Referencia UX** | Sketchbook (panel capas flotante) · `TimeTagDialog` (arrastre) |
| **QA sesión** | `1782441798108-3084` (apertura tiempo MS + rail mapas) |

---

## 0. Decisión de producto

El usuario replanifica el módulo mapas. **Primera decisión documentada:**

> En mapas, el menú lateral derecho **no** es un rail fijo pegado al borde de la ventana. Debe ser una **ventana flotante arrastrable** (como Sketchbook), aplicada a **toda** el área de herramientas derecha del módulo mapas únicamente.

**Reutilizar** el patrón de la ventana flotante de tiempo del manuscrito (`TimeTagDialog`), no reinventar arrastre/clamp/portal.

---

## 1. Estado actual (auditoría código)

### 1.1 Layout shell

`WorkspaceShell.tsx` reserva una columna fija cuando `mainView === "map"`:

```text
<aside className="w-10 …">
  <div id="map-side-panel-rail-mount" />
</aside>
```

El lienzo **no** usa el ancho completo: pierde ~40 px + panel contenido (~256 px si expandido).

### 1.2 Portal rail + contenido

`MapEditSidePanel.tsx`:

- **Rail** → portal a `#map-side-panel-rail-mount` (iconos verticales, toggle expandir, ✏️, secciones).
- **Contenido** → portal a `#map-side-panel-content-mount` dentro de `MapWorkspace` (`aside w-64`).

Patrón heredado de MAP-013 §2bis (imitar `EditorSidePanel` manuscrito).

### 1.3 Estado

`useMapEditPanelStore.ts` — `activeSection`, `contentExpanded`; persistencia en `sessionStorage` por `mapId`.

### 1.4 Patrón flotante existente (manuscrito)

`TimeTagDialog.tsx` + `useTimeTagDialogStore.ts`:

| Pieza | Implementación |
|-------|----------------|
| Posición | `{ x, y }` en store; `DEFAULT_POSITION` |
| Arrastre | `onPointerDown` en header → `pointermove` / `pointerup` en contenedor |
| Clamp | `clampPosition(x, y, width)` — márgenes viewport |
| Render | `position: fixed`, `z-50`, `createPortal` implícito (fixed en árbol) |
| Cierre | Escape, botón × |
| Resize contenido | `ResizeObserver` reclampa al cambiar ancho |

**No hay** componente compartido hoy — la lógica vive inline en `TimeTagDialog`.

### 1.5 Evidencia QA — sesión `1782441798108-3084`

| ts | evento | payload relevante |
|----|--------|-------------------|
| `1782441980370` | `obs.ui.workspace.layout` | `mainView: editor`, `rightPanelCollapsed: true`, `rightPanelWidth: 299` |
| `1782442007146` | `obs.ui.workspace.layout` | `mainView: map`, mismas métricas panel derecho MS |

**Lectura:** al cambiar a mapas, el panel derecho del **manuscrito** sigue colapsado en layout store, pero el módulo mapas monta su **propio** rail (`w-10`) independiente. Confirma que hay dos sistemas de lateral derecho distintos — MAP-014 unifica mapas en flotante sin tocar `ResizableRightPanel` del editor.

*(Log UI verbose: 3 líneas; sin eventos de clic en secciones — suficiente para confirmar transición editor→map.)*

---

## 2. Objetivo (to-be)

```text
ANTES (MAP-013 §2bis)                DESPUÉS (MAP-014)
┌──────────────────────┬──┬────┐    ┌────────────────────────────┐
│      LIENZO          │≡│CAP │    │         LIENZO 100%        │
│                      │▦│AS  │    │    ┌──────────────┐        │
│                      │…│    │    │    │ ≡ CAPAS  [×] │ flot.  │
└──────────────────────┴──┴────┘    │    │  contenido   │        │
 rail fijo + panel anclado           │    └──────────────┘        │
                                     └────────────────────────────┘
```

| Requisito | Detalle |
|-----------|---------|
| **R1** | Cero columna reservada en shell para mapas |
| **R2** | Ventana flotante con cabecera arrastrable (asa + título sección + cerrar) |
| **R3** | Ventana **capas** con 3 tabs internos (Capas / Parches / Dibujos hijo) — un botón en accesos flotantes — ver [`MAP-015`](MAP-015-layers-patches-unified-panel.md) |
| **R4** | Reutilizar extracción de `TimeTagDialog` para arrastre/clamp |
| **R5** | Otras herramientas (Estudio, Ubicaciones, Lienzo, Config) en ventanas flotantes separadas o accesos MAP-014 |
| **R6** | Lienzo + timeline pie sin cambios funcionales |
| **R7** | Solo módulo mapas — manuscrito `TimeTagDialog` sigue igual |

---

## 3. Arquitectura propuesta

### 3.1 Extracción compartida (Fase A)

Nuevo en `src/components/workspace-ui/` o `src/lib/ui/`:

| Export | Responsabilidad |
|--------|-----------------|
| `clampFloatingPosition(x, y, w, h)` | Generalizar `clampPosition` de TimeTagDialog |
| `useFloatingPanelDrag({ position, setPosition, getSize })` | pointer drag + reclamp |
| `FloatingPanelFrame` | header (grip, title, close), body scroll, opcional resize handle |

Refactor mínimo: `TimeTagDialog` consume `FloatingPanelFrame` — sin cambio visual MS.

### 3.2 Store mapas (Fase B)

`useMapFloatingToolsStore.ts` (reemplaza o extiende `useMapEditPanelStore`):

```typescript
interface MapFloatingToolsState {
  isOpen: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };  // si R1 resize aprobado
  activeSection: MapEditPanelSectionId;
  setPosition, setSize, openSection, close, toggleOpen, syncForMap
}
```

**Persistencia propuesta (pendiente confirmación usuario):**

| Clave | Contenido |
|-------|-----------|
| `localStorage` `narralith.mapFloatingTools.v1` | Por `mapId`: position, size, activeSection, isOpen |

### 3.3 Componente (Fase C)

`MapFloatingToolsPanel.tsx`:

- Montado en `MapWorkspace` (no en `WorkspaceShell`).
- `createPortal(..., document.body)` o `fixed` dentro del workspace con `z-index` alto.
- **Cabecera:** grip + tabs expandibles (MAP-015) o título sección + cerrar.
- **Toolbar interna:** según ventana — Capas/Parches/Nav en MAP-015; Estudio/Lienzo en sus ventanas.
- **Cuerpo:** componentes hijos existentes reubicados.
- **Pie opcional:** toggle ✏️ edición + ⚙ settings (o delegar ✏️ a top bar §2ter).

Posición por defecto: esquina superior derecha del viewport del módulo mapas, con offset para no tapar `WorkspaceTopBar`.

### 3.4 Limpieza shell (Fase D)

| Archivo | Cambio |
|---------|--------|
| `WorkspaceShell.tsx` | Eliminar bloque `mainView === "map"` aside `w-10` |
| `mapSidePanelMount.ts` | Deprecar IDs de montaje (o eliminar si sin referencias) |
| `MapWorkspace.tsx` | Quitar `#map-side-panel-content-mount` del layout flex; lienzo `flex-1` full width |
| `MapEditSidePanel.tsx` | Reemplazar por `MapFloatingToolsPanel` o redirigir |

### 3.5 Modos interactivo / edición

| Modo | Comportamiento propuesto (v1) |
|------|-------------------------------|
| **Interactivo** | Ventana cerrada por defecto; botón en top bar o FAB para abrir (solo ⚙ + ✏️ en toolbar mínima) |
| **Edición** | Ventana abierta por defecto; última sección activa restaurada |

*(Ajustar tras feedback usuario — ver §6 preguntas abiertas.)*

---

## 4. Fases de implementación

| Fase | Entregable | Criterio done |
|------|------------|---------------|
| **A** | `FloatingPanelFrame` + `useFloatingPanelDrag` + refactor `TimeTagDialog` | Tests manuales MS tiempo; sin regresión visual |
| **B** | `useMapFloatingToolsStore` + persistencia | Unit test store básico |
| **C** | `MapFloatingToolsPanel` con sección Capas | Ventana arrastra; Capas funcional |
| **D** | Migrar todas las secciones + modos | Paridad funcional con rail actual |
| **E** | Limpieza shell + purga `MapEditSidePanel` | Sin montajes rail; lienzo full width |
| **F** | OBS UI + QA manual | `obs.ui.map.floatingTools.*` en verbose |

**Orden:** A → B → C → D → E → F. No paralelizar A.

---

## 5. Criterios de aceptación (§8 QA)

- [ ] En vista mapa, **no** hay columna fija a la derecha del shell.
- [ ] Ventana herramientas se **arrastra** por cabecera sin seleccionar texto del lienzo.
- [ ] Posición **reclampa** al redimensionar ventana app.
- [ ] Cambiar sección (Capas → Estudio) **no** resetea posición.
- [ ] Cerrar ventana (×) deja lienzo usable; reabrir restaura sección.
- [ ] `TimeTagDialog` manuscrito sigue funcionando tras extracción Fase A.
- [ ] Cambiar mapa (`syncForMap`) restaura layout guardado por mapa.
- [ ] Modo interactivo ↔ edición conserva toggle ✏️.
- [ ] Timeline pie visible y sin solapamiento crítico con ventana flotante (z-index / posición default).

---

## 6. Preguntas abiertas (usuario)

| ID | Pregunta | Impacto |
|----|----------|---------|
| **Q1** | ¿Redimensionar ventana (asa inferior derecha Sketchbook)? | Fase C scope |
| **Q2** | ¿Una sola ventana con tabs vs varias? | **Cerrado** — ventana capas = 3 tabs ([`MAP-015`](MAP-015-layers-patches-unified-panel.md)); otras herramientas = otras ventanas |
| **Q3** | ¿Persistir posición/tamaño por mapa, proyecto o global? | Store schema |
| **Q4** | ¿Visible en modo interactivo o solo al editar? | UX default open/close |
| **Q5** | ¿Atajo teclado (ej. `Tab` / `F2`) para toggle panel? | Opcional v1 |
| **Q6** | ¿Toggle ✏️ en ventana flotante, top bar, o ambos? | §2ter vs flotante |

---

## 7. Relación con MAP-013

| MAP-013 | Tras MAP-014 |
|---------|--------------|
| §2bis rail | **Obsoleto** — reemplazado por este plan |
| §2ter top bar | **Vigente** |
| MAP-013 §7 Capas Sketchbook | **Vigente** — dentro tab Capas MAP-015 |
| MAP-015 | Ventana capas 3 tabs + Fondo + parches combinados — **depende** de MAP-014 Fase A |
| Ítems M13-SHELL-* rail | Cerrados en código legacy; no reabrir |
| MAP-012 smoke | Sigue bloqueado hasta MAP-013 + MAP-014 |

---

## 8. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Ventana tapa lienzo | Posición default + persistencia; z-index moderado |
| Regresión `TimeTagDialog` | Fase A con refactor compartido primero |
| DnD capas vs arrastre ventana | Drag handle solo en header; DnD capas en cuerpo |
| Portal + eventos puntero mapa | `pointer-events` en frame; no capturar eventos del lienzo |

---

## 9. Registro

| Fecha | Evento |
|-------|--------|
| 2026-06-25 | Plan creado — decisión usuario: lateral mapas = ventana flotante (Sketchbook), reutilizar patrón `TimeTagDialog`; QA ref `1782441798108-3084` |
| 2026-06-25 | Alineado con [`MAP-015`](MAP-015-layers-patches-unified-panel.md) — ventana capas 3 tabs; rail multi-sección obsoleto |
