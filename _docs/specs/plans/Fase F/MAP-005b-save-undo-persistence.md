# MAP-005b — Guardado manual, borrador sucio y undo estable

> **Estado:** ✅ **Implementado + QA OK** (2026-06-11)  
> **Esfuerzo:** Medio · **Riesgo:** Medio (localStorage + guards navegación)  
> **Lista maestra:** [`implementation-plan.md`](../../implementation-plan.md) Fase F · **Spec:** [`maps-design.md`](../../maps-design.md) §3bis · **Previo:** [MAP-005 🔨](MAP-005-draw-studio.md) (fases 1–8) · **Siguiente:** MAP-006 (sin cambio)

---

## 0. Convención

| Regla | Detalle |
|-------|---------|
| Flujo | Plan → ejecución → tests → QA/OBS → cerrar §12 → MAP-006 |
| Commits | Usuario |
| Relación MAP-005 | **Suplemento / corrección** — no reemplaza el estudio ya entregado; **modifica** D9, D14, D15 y criterios C3/C10 |
| Evidencia | Recorrido QA §9 + sesión OBS post-implementación |

---

## 1. Problema y objetivo

### 1.1 Problema (QA post MAP-005 fases 6–8)

Sesión OBS `1781837265659-23296`: el estudio funciona, pero el **modelo de guardado actual es invasivo**:

| Síntoma | Causa raíz |
|---------|------------|
| Autosave cada ~500 ms mientras se dibuja | `useMapAutosave` debounce + `drawing` como dependencia |
| Sensación de «recarga» tras cada guardado | IPC + `loadSession()` + patch snapshot en `useMapProject` |
| **Undo inutilizable** tras guardar | Tras `markSaved()` → `isDirty=false` → efecto en `useMapDrawingSession` llama `resetFromSource()` → **borra undoStack/redoStack** |
| Usuario espera Ctrl+S + sucio persistente | Patrón ya existente en manuscrito (FIX-007); mapas no lo replican |

**Bug concreto** (`useMapDrawingSession.ts`):

```typescript
useEffect(() => {
  if (!sourceDrawing || isDirty) return;
  resetFromSource(sourceDrawing); // ← se dispara tras cada autosave OK
}, [isDirty, resetFromSource, sourceDrawing]);
```

### 1.2 Objetivo MAP-005b

Alinear mapas con el **modelo de persistencia del manuscrito**:

1. **Guardado a disco manual por defecto** — `Ctrl+S` en mapa + modo edición.
2. **Estado sucio** visible hasta guardar; undo/redo **estables** mientras haya sucio (sin reset al guardar).
3. **Borrador local** (localStorage) del dibujo sucio + stacks undo/redo — sobrevive cerrar app / cambiar vista sin guardar a disco.
4. **Diálogo «Cambios sin guardar»** al salir de edición, cambiar mapa o cambiar vista principal.
5. **Ajustes:** toggle autosave mapas on/off (modo alternativo futuro; **off** por defecto).
6. **Límite undo** acotado en memoria y en borrador (no infinito).

### 1.3 Criterios de aceptación

| # | Criterio |
|---|----------|
| C1 | Por defecto (`mapAutosaveEnabled=false`): **no** hay `saveDrawing` automático al dibujar |
| C2 | `Ctrl+S` con `mainView === "map"` y `viewMode === "edit"` guarda `principal.json` vía IPC |
| C3 | Tras guardar manual, trazos en disco; **undo sigue operativo** en la sesión actual (hasta límite D20) |
| C4 | Indicador footer: «Sin guardar» / «Guardando…» / «Guardado» / error |
| C5 | Borrador sucio en localStorage; reabrir app → edición restaura trazos **no guardados** |
| C6 | Undo/redo limitado a **50 operaciones** (constante; no crece sin tope) |
| C7 | Diálogo sucio al: salir edición, cambiar mapa activo, cambiar `mainView` (editor/timeline/…) |
| C8 | Diálogo ofrece: **Cancelar** / **Descartar** / **Guardar** (guardar = Ctrl+S + continuar acción) |
| C9 | Ajustes: sección «Mapas» con toggle autosave; si ON, debounce 500 ms **sin** resetear undo (misma fix D18) |
| C10 | `expand` / `crop` / cambio proyecto: guard sucio vía diálogo o guardar explícito — **no** autosave silencioso en modo manual |
| C11 | OBS: `saveDrawing` solo en manual, autosave (si ON) o flush explícito; `undo`/`redo` con `depth` coherente |
| C12 | Tests unitarios: baseline/isDirty, persist draft round-trip, guard navegación (mock) |

### 1.4 Fuera de alcance MAP-005b

| Tema | Plan |
|------|------|
| Panel capas UI | MAP-006 |
| `*.autosave.json` hermano en disco (crash recovery Rust) | Opcional futuro |
| Historial versiones / snapshots del dibujo | VersionHistory existente — no integrar aquí |
| Sincronización multi-dispositivo | Fuera Era III |
| Comprimir borrador (gzip) | Solo si QA detecta límite localStorage |
| Rehacer spec MAP-005 entero | Este doc parchea decisiones; MAP-005 §12 se referencia |

---

## 2. Auditoría (estado repo jun 2026)

### 2.1 Lo que MAP-005 ya entrega (reutilizar)

| Pieza | Archivo | Notas |
|-------|---------|-------|
| Sesión editable + undo | `hooks/useMapDrawingSession.ts` | `MAX_UNDO_DEPTH = 50` ya existe — **mantener** |
| IPC save | `hooks/useMapProject.saveDrawing` | Conservar |
| Autosave hook | `hooks/useMapAutosave.ts` | **Condicionar** a setting; no borrar |
| Flush registro | `lib/maps/mapAutosaveFlush.ts` | Repurpose: flush manual o autosave según modo |
| Atajos mapa | `hooks/useMapStudioShortcuts.ts` | Ampliar guard con `useMapSaveShortcut` |
| Manuscrito referencia | `usePersistManuscriptTabs`, `lastManuscriptFile.ts` | Patrón borrador FIX-007 |
| Diálogo sucio editor | `UnsavedChangesDialog.tsx` + `useEditorStore` | Patrón UI; **nuevo** store/hook mapas |
| Ajustes | `useSettingsStore`, `SettingsDialog` | Ampliar tipos guardado mapas |

### 2.2 Gaps a cerrar

| Gap | Severidad |
|-----|-----------|
| Reset sesión post-save | 🔴 Bloqueante UX |
| Autosave ON por defecto (MAP-005 D9) | 🟠 Alto — cambiar default |
| Sin borrador localStorage | 🟠 Alto |
| Sin guard navegación | 🟠 Alto |
| `useSaveShortcut` solo editor | 🟡 Medio |
| Flush D15 autosave silencioso incompatible con manual | 🟡 Medio |

---

## 3. Decisiones de diseño

### D17 — Modo de guardado por defecto: **manual**

| Parámetro | Valor |
|-----------|-------|
| Default | `mapAutosaveEnabled: false` |
| Guardado manual | `Ctrl+S` + acción «Guardar» en diálogo sucio |
| Indicador | «Sin guardar» cuando `isDirty`; ocultar «Guardado» tras N s opcional (v1: dejar hasta próximo edit) |

### D18 — Baseline en disco vs copia editable (fix undo)

Separar **baseline** (último guardado en disco / al abrir edición) de **working copy** (sesión):

```typescript
interface MapDrawingSessionState {
  drawing: MapDrawingV2;           // working copy
  baselineFingerprint: string;       // hash o strokeCount+ids al último save/load
  isDirty: boolean;                  // drawing !== baseline (estructural)
  // undo/redo stacks — NO se resetean en save manual
}
```

| Evento | Comportamiento |
|--------|----------------|
| Abrir edición / cambiar mapa | Cargar disco → baseline + working; stacks vacíos **salvo** borrador local (D19) |
| Editar trazo / undo / redo | Solo muta working + stacks; `isDirty` según baseline |
| **Guardado manual OK** | Actualizar baseline; `isDirty=false`; **no** `resetFromSource` |
| `sourceDrawing` cambia en `useMapProject` tras save | **Ignorar** si fingerprint coincide con baseline recién guardada |
| Recarga externa (fs watcher futuro) | Prompt conflicto — v1 omitir |

**Eliminar o reescribir** el efecto `if (!isDirty) resetFromSource(sourceDrawing)` — sustituir por sync explícita solo en cambio de `sessionKey`.

### D19 — Borrador local (localStorage, espíritu FIX-007)

| Parámetro | Valor |
|-----------|-------|
| Clave | `narralith:map-drawing-drafts-v1` |
| Estructura | `Record<projectRoot, Record<mapId, MapDrawingDraft>>` |
| Debounce persist | **400 ms** (igual manuscrito) |
| Contenido borrador | `{ drawing, undoOps[], redoOps[], baselineFingerprint, updatedAt }` |
| Cuándo escribir | `isDirty === true` y cambio en drawing/stacks |
| Cuándo borrar entrada | Guardado manual OK; descartar en diálogo; mapa eliminado |
| Restaurar | Al montar edición: si borrador existe y `isDirty` → **preferir borrador** sobre disco |
| Tamaño | Advertencia soft si JSON > **2 MB** por mapa; hard cap **50** ops undo en borrador (D20) |

**No** escribir a `principal.json` hasta guardado manual (o autosave si D22 ON).

### D20 — Límite undo/redo (memoria acotada)

| Regla | Valor |
|-------|-------|
| Profundidad máxima | **50** operaciones (`MAP_UNDO_MAX_DEPTH`) — ya implementado |
| Unidad | Añadir / quitar **trazo completo** (sin cambio) |
| Persistencia undo en borrador | Serializar stacks; truncar al persistir si > 50 |
| Redo | Invalidado al trazo nuevo post-undo (sin cambio MAP-005 D8) |
| RAM | Stacks en `useRef`; no duplicar drawing entero por op |

### D21 — Diálogo «Cambios sin guardar» (mapas)

Disparadores obligatorios:

| Acción | Guard |
|--------|-------|
| Salir modo edición → interactivo | `guardMapDrawingNavigation` |
| Cambiar mapa en selector | idem |
| Cambiar `mainView` (map → editor, timeline, …) | idem |
| Cerrar proyecto / abrir otro | idem (integrar con `flushMapDrawingAutosave` → guard manual) |
| `expandCanvas` / `cropCanvas` | idem — operación destructiva en servidor |

**No** disparar al cambiar herramienta/pincel/color.

Opciones del diálogo (i18n `maps.unsaved.*`):

| Botón | Efecto |
|-------|--------|
| Cancelar | Aborta navegación |
| Descartar | `resetFromSource(disk)` + borrar borrador local + continuar |
| Guardar | `saveDrawing` → si OK, continuar acción pendiente |

Patrón referencia: `UnsavedChangesDialog` + `useEditorStore.showUnsavedDialog` — implementación paralela en `useMapDrawingStore` o hook `useMapUnsavedGuard` para no acoplar editor.

### D22 — Ajustes: autosave mapas on/off

| Parámetro | Valor |
|-----------|-------|
| Setting | `mapAutosaveEnabled: boolean` (default **false**) |
| UI | `SettingsDialog` — sección «Mapas» o sub-bloque en «Editor y guardado» |
| Si ON | Reutilizar `useMapAutosave` debounce **500 ms** + flush pagehide |
| Si ON | **Obligatorio** D18: autosave no debe resetear undo |
| i18n | `settings.maps.autosaveLabel`, `settings.maps.autosaveHint` |
| OBS | `obs.action.settings.mapAutosave` al cambiar toggle |

Independiente de `editor.autosaveEnabled` — el usuario puede querer manuscrito manual y mapas autosave o viceversa.

### D23 — Atajo Ctrl+S contextual

| Contexto | Acción |
|----------|--------|
| `mainView === "map"` && `viewMode === "edit"` && dirty | `saveMapDrawing()` |
| `mainView === "map"` && edit && !dirty | no-op silencioso |
| Resto | Comportamiento actual `useSaveShortcut` (editor) |

Implementación: extender `useSaveShortcut` o hook dedicado `useMapSaveShortcut` registrado en `MapWorkspace`.

### D24 — Flush D15 revisado (modo manual)

MAP-005 D15 «flush si dirty» pasa a:

| Modo | Antes de acción destructiva |
|------|----------------------------|
| Manual (default) | **Diálogo D21** — no autosave silencioso |
| Autosave ON | `flushAutosave` + si falla, bloquear (MAP-005) |

Quitar flush silencioso en `handleExitEdit` / `selectMap` cuando manual.

### D25 — Footer estudio: estados de guardado

| Estado | Texto i18n |
|--------|------------|
| Sucio | `studio.save.unsaved` |
| Guardando | `studio.save.saving` |
| Guardado | `studio.save.saved` |
| Error | `studio.save.error` |

---

## 4. Esquema e IPC

### 4.1 Disco — sin cambio

Sigue `principal.json` v2; `save_map_drawing_cmd` sin cambios (MAP-001 / MAP-005 D10).

### 4.2 localStorage — nuevo tipo

```typescript
interface MapDrawingDraft {
  drawing: MapDrawingV2;
  undoOps: MapDrawingUndoOp[];   // max MAP_UNDO_MAX_DEPTH
  redoOps: MapDrawingUndoOp[];
  baselineFingerprint: string;
  updatedAt: number;               // Date.now() al persistir
}

type MapDrawingDraftsStore = Record<string, Record<string, MapDrawingDraft>>;
// projectRoot → mapId → draft
```

Validación al cargar: `version === 2`, dimensiones coherentes; si corrupto → descartar borrador.

### 4.3 IPC — sin comandos nuevos

| Comando | Uso MAP-005b |
|---------|----------------|
| `save_map_drawing_cmd` | Guardado manual y autosave (si ON) |
| `get_map_drawing_cmd` | Baseline al abrir / tras descartar |

---

## 5. Frontend — diseño de componentes

### 5.1 Archivos nuevos

| Archivo | Rol |
|---------|-----|
| `lib/maps/mapDrawingDraft.ts` | Tipos, fingerprint, get/set localStorage, validación |
| `lib/maps/mapDrawingDraft.test.ts` | Round-trip, truncado undo |
| `hooks/usePersistMapDrawingDraft.ts` | Debounce 400 ms persist borrador |
| `hooks/useMapSaveShortcut.ts` | Ctrl+S contextual mapa |
| `hooks/useMapUnsavedGuard.ts` | API `guardMapNavigation(action, fn)` |
| `stores/useMapUnsavedStore.ts` | Estado diálogo + acción pendiente (opcional; puede ser hook) |
| `modules/maps/MapUnsavedChangesDialog.tsx` | UI diálogo |
| `lib/types/mapSettings.ts` | `MapSaveSettings`, defaults |

### 5.2 Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `hooks/useMapDrawingSession.ts` | D18 baseline; quitar reset post-save; export fingerprint helpers |
| `hooks/useMapAutosave.ts` | Solo activo si `mapAutosaveEnabled`; respetar D18 |
| `hooks/useMapProject.ts` | No forzar resync session en save; optional `patchBaseline` |
| `modules/maps/MapWorkspace.tsx` | Guard hooks, diálogo, quitar flush silencioso manual |
| `modules/maps/MapEditStudio.tsx` | Indicador «Sin guardar» |
| `modules/layout/WorkspaceShell.tsx` | `guardMapNavigation` en `handleMainViewChange` |
| `hooks/useSaveShortcut.ts` | Delegar a mapa si aplica |
| `stores/useSettingsStore.ts` | `mapAutosaveEnabled` persistido |
| `modules/settings/SettingsDialog.tsx` | Toggle mapas |
| `stores/useProjectStore.ts` | Cerrar/abrir proyecto → guard mapas sucio |
| `i18n/{es,en}/maps.json` | `unsaved.*`, `studio.save.unsaved` |
| `i18n/{es,en}/settings.json` | `maps.autosave*` |

### 5.3 Flujo datos (modo manual)

```text
get_map_drawing_cmd (disco)
    │
    ▼
useMapDrawingSession — working copy + baseline + undo stacks
    │
    ├─ edit / undo / redo → isDirty=true
    ├─ usePersistMapDrawingDraft → localStorage (400 ms)
    │
    ▼
Ctrl+S o diálogo «Guardar»
    │
    ▼
save_map_drawing_cmd → principal.json + index.updatedAt
    │
    ├─ baseline ← working; isDirty=false
    ├─ borrador local eliminado
    └─ undo stacks INTACTOS (D18)
```

---

## 6. OBS — eventos

### 6.1 Acciones (ampliar / ajustar)

| Evento | Cuándo | Payload |
|--------|--------|---------|
| `obs.action.map.saveDrawing` | Manual / autosave OK | `{ mapId, strokeCount, layerCount, reason: "manual" \| "autosave" \| "dialog" }` |
| `obs.action.map.unsavedDialog` | Abrir diálogo | `{ mapId, trigger: "exitEdit" \| "selectMap" \| "viewChange" \| "canvasOp" \| "project" }` |
| `obs.action.map.unsavedChoice` | Respuesta usuario | `{ mapId, choice: "cancel" \| "discard" \| "save" }` |
| `obs.action.settings.mapAutosave` | Toggle ajustes | `{ enabled: boolean }` |
| `obs.action.map.draftPersist` | Borrador local escrito (verbose) | `{ mapId, strokeCount, undoDepth }` |

Sin cambio: `drawStroke`, `undo`, `redo`, `brushChange`, etc.

---

## 7. Fases de ejecución

```text
Fase 1  D18 baseline + eliminar reset post-save + indicador «Sin guardar»
Fase 2  Desactivar autosave default + useMapSaveShortcut (Ctrl+S mapa)
Fase 3  mapDrawingDraft + usePersistMapDrawingDraft (localStorage)
Fase 4  useMapUnsavedGuard + MapUnsavedChangesDialog + cablear navegación
Fase 5  Settings mapAutosaveEnabled + condicionar useMapAutosave (D22)
Fase 6  Revisar D15/D24 flush + useProjectStore guards
Fase 7  Tests + i18n + OBS §6
Fase 8  QA manual §9 + cerrar §12
```

**Orden crítico:** Fase 1 antes que cualquier QA undo — desbloquea UX inmediata.

**Checkpoint:** tras Fase 2, QA mínimo: dibujar → Ctrl+Z funciona → Ctrl+S → Ctrl+Z **sigue** funcionando.

---

## 8. Verificación automatizada

| Comando | Esperado |
|---------|----------|
| `npm test` | + `mapDrawingDraft.test.ts`, tests baseline session, guard unitarios |
| `npm run build` | OK |
| `cargo test maps_store` | Sin regresión (sin cambio Rust v1) |

---

## 9. Recorrido QA (usuario)

| Paso | Acción | Qué buscar |
|------|--------|------------|
| 1 | Editar, dibujar, **no** Ctrl+S | Footer «Sin guardar»; **sin** `saveDrawing` en action log (autosave off) |
| 2 | Ctrl+Z varias veces | Undo funciona; stacks no se vacían solos |
| 3 | Ctrl+S | `saveDrawing` reason manual; footer «Guardado»; undo **aún** operativo |
| 4 | Cerrar app sin guardar nuevo trazo | Reabrir → borrador restaurado |
| 5 | Cambiar a editor con sucio | Diálogo tres botones |
| 6 | Descartar | Vuelve estado disco |
| 7 | Guardar en diálogo | Persiste y navega |
| 8 | Ajustes → autosave ON | Tras ~500 ms idle, save sin perder undo |
| 9 | 51+ trazos + undo profundo | Profundidad capped a 50 |

**Archivos:** `action-session-*.ndjson`.

---

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| localStorage lleno (dibujos grandes) | Cap undo 50; warning 2 MB; futuro compresión |
| Borrador stale vs disco editado externamente | v1: borrador gana si dirty; documentar |
| Doble diálogo editor + mapa sucios | Prioridad: guard mapa primero si `mainView===map` |
| Autosave ON reintroduce bug undo | D18 obligatorio en Fase 5 |
| Confusión dos toggles autosave | Labels claros «Manuscrito» vs «Mapas» en ajustes |

---

## 11. Actualización MAP-005 (referencia cruzada)

Tras cerrar MAP-005b, actualizar en [MAP-005-draw-studio.md](MAP-005-draw-studio.md):

| Sección MAP-005 | Cambio |
|-----------------|--------|
| D9 Autosave | «Default off; ver MAP-005b D17/D22» |
| D15 Flush | «Ver MAP-005b D24 — diálogo en modo manual» |
| C3, C10 | Superseded por MAP-005b C1–C5, C9 |
| §12 Registro | Entrada enlace MAP-005b cerrado |

---

## 12. Registro

| Fecha | Evento |
|-------|--------|
| 2026-06-11 | Plan MAP-005b redactado — QA `1781837265659-23296`, feedback undo/autosave invasivo |
| 2026-06-11 | **Fases 1–8 implementadas** — baseline D18, Ctrl+S, borrador localStorage, diálogo sucio, ajustes autosave mapas, flush D24, OBS §6, tests 264 |
| 2026-06-11 | **QA usuario** — sesiones `1781847929216-22504` (pre-reload) + `1781848001932-22504` (post-reload); criterios §9 C1–C12 ✅ en action log; `draftPersist` solo en `action-verbose-*.ndjson` |
