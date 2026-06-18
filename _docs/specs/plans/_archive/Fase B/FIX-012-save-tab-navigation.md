# FIX-012 — Guardar no debe cambiar pestaña ni cerrar tabs abiertas

> Plan de investigación y arreglo. **Estado:** ✅ Cerrado (jun 2026, incl. 2b) · **Esfuerzo:** Medio · **Riesgo:** Medio  
> **Lista maestra:** [`implementation-plan.md`](../implementation-plan.md) Fase B · **Sin archivos extra** — solo este plan + la fila en la lista maestra.

---

## 1. Problema y objetivo

**Problema:** Tras guardar, el editor **cambia de documento**, **cierra pestañas** que el usuario tenía abiertas y editando, o deja el explorador desincronizado — sin acción explícita del usuario. El contenido en disco puede haberse guardado bien; el fallo es de **sesión de pestañas** y, en el peor caso, de **índice SQLite** (`status = ghost`).

**Objetivo FIX-012:**

1. **Ctrl+S** guarda el documento **activo** sin cambiar de pestaña ni cerrar otras tabs.
2. **«Guardar todo»** persiste todas las pestañas sucias **sin** cerrarlas, **sin** dejar al usuario en un documento arbitrario y **sin recorrer visualmente** la barra de pestañas (Fase 2b).
3. Un guardado propio (`save_manuscript` + sync eventos WB) **no** debe disparar `closeTabsRemovedFromDisk` ni `mark_ghost` espurio sobre manuscritos que siguen en disco.
4. Tras guardar, **explorador ↔ pestañas ↔ editor** coherentes (sin resaltados «fantasma» de archivos ya cerrados en la barra de tabs).
5. QA manual confirma round-trip en manuscritos con marcos de evento (`eventoTest`, etc.).

**Fuera de alcance:**

| Tema | Motivo |
|------|--------|
| Scroll al inicio tras recarga externa | Checklist §7 `manuscript-design.md` — otro fix |
| FIX-007 borrador sucio al cerrar app | Persistencia de sesión |
| Renombrado explícito en explorador | Flujo CRUD ya documentado |
| Épica FIX-011 evento WB huérfano | Detector de huérfanos reales; aquí evitamos **falsos** ghost por watcher |

### 1.1 Reproducción confirmada (QA usuario, 2026-06-11)

**Precondición:**

- Varias pestañas abiertas: `shushah`, `sas`, `skanlnsklnals`, `meow`, `eventoTest` (orden observado).
- Solo **`meow`** y **`eventoTest`** editados (sucios).
- Activo al guardar: **`eventoTest`**.

**Acción:** guardar (Ctrl+S o «Guardar todo» — por confirmar en Fase 0).

**Resultado observado:**

| Aspecto | Antes | Después |
|---------|-------|---------|
| Pestañas abiertas | 5 manuscritos | **3** (`shushah`, `sas`, `skanlnsklnals`) |
| `meow`, `eventoTest` | Abiertas, sucias | **Cerradas** en la barra (contenido aparentemente guardado en disco) |
| Documento activo | `eventoTest` | **`skanlnsklnals`** |
| Explorador | — | Resaltado anómalo: **`skanlnsklnals` y `eventoTest`** a la vez (desincronización UI) |

**Interpretación (encaja con H2):**

```text
tabOrder = [shushah, sas, skanlnsklnals, meow, eventoTest]

Si fs-changed kind=remove incluye meow y eventoTest (watcher / OneDrive):
  closeTabsRemovedFromDisk(eventoTest) → activo pasa a meow
  closeTabsRemovedFromDisk(meow)       → activo pasa a skanlnsklnals  ← resultado final
```

H1 (`saveAllOpenTabs` + switchTab) explicaría **saltos temporales**, pero **no** el cierre de **dos** pestañas de la barra. Eso apunta a **`remove` espurio** en el watcher, no solo a restauración fallida.

**Primer reporte (sesión anterior):** salto `eventoTest` → `meow` sin cierre explícito — compatible con H1 o con un solo `remove`. Este segundo reporte **eleva H2** a causa principal.

### 1.2 Evidencia OBS-001 (NDJSON, 2026-06-11)

**Archivo:** `_debug/logs/session-1781303360008-18448.ndjson` (107 líneas, audit ON, `tauri dev`).

**Escenario capturado:** tabs restauradas `shushah`, `sas` (+ activo previo `sas`); luego abiertas `meow`, `eventoTest`. Guardados con «Guardar todo» (`obs.editor.saveAll.*`). Solo **`eventoTest`** sucio en el guardado fatal.

**Cadena del bug (guardado fatal, ~L66–79):**

| t (ms rel.) | Evento | Hallazgo |
|-------------|--------|----------|
| +464793 | `saveAll.start` | `activePath`: `eventoTest`; `dirtyPaths`: solo `eventoTest` |
| +464829 | `save.end` ok | `segmentCount`: 3 |
| +464826 (Rust) | `obs.rust.save_manuscript` | `touchedEntityPaths`: `evento1.md`, `EVENTO 2.md` |
| +464844 | `saveAll.end` ok | `activePath` sigue en **`eventoTest`** → **H1 descartada** como causa del cierre |
| +465060–75 | `watcher.raw` | `modify` en manuscrito + entidades; `remove` en `.narralith-write-18448` (temp atómico WB) |
| +465125 | `reconcile.emit` **`kind=remove`** | paths: `evento1.md`, **`eventoTest.md`**, `EVENTO 2.md`, `.narralith-write-18448` |
| +465127 | `tab.close` **`reason=fs-remove`** | Cierra **`eventoTest`** (activo); `nextActive`: **`meow`** |

**Conclusiones cerradas con evidencia:**

1. **H2 confirmada:** el cierre de pestaña ocurre **~283 ms después** de `saveAll.end`, por `fs-changed` `remove`, no por `switchTab`.
2. **Causa raíz en Rust (`apply_changes`):** un mismo batch debounced mezcla `Modify` + `Remove`; el `kind` final queda en **`remove`** pero `paths` incluye rutas que en el watcher eran **`modify`** y **siguen en disco** ([`reconcile.rs`](../../../src-tauri/src/fs/reconcile.rs) L68–96, un solo `kind` + un solo `touched` por batch).
3. **Temp WB no ignorado:** `.narralith-write-{pid}` dispara `remove` + `mark_ghost` espurio (`should_ignore` no lo filtra); agrava el batch mixto.
4. **`markSelfSave` no protege `remove`:** en [`useEditorFsSync.ts`](../../../src/hooks/useEditorFsSync.ts) la rama `remove` llama `closeTabsRemovedFromDisk` sin consultar self-save (solo aplica a recarga en `modify`).
5. **Repro parcial respecto a §1.1:** en esta sesión solo cerró **`eventoTest`** (única sucia); **`meow` no se cerró**. El salto final fue a **`meow`**, no a `skanlnsklnals` (orden de tabs distinto: 4 tabs, sin `skanlnsklnals`).

**Segundo guardado (L82–101):** reabrió `eventoTest`, guardó de nuevo; hubo `remove` solo sobre `EVENTO 2.md` + temp — **sin** `tab.close` de manuscrito. Comportamiento intermitente (timing OneDrive / debounce).

**Fixes derivados (prioridad Fase 3):**

| # | Cambio | Motivo (evidencia) |
|---|--------|-------------------|
| F3a | **`should_ignore`** para `.narralith-write-*` (y no emitir ghost) | L24–33, L50–61 |
| F3b | **`apply_changes`:** emitir **por kind** o no incluir en `remove` paths que existen en disco al reconciliar | L77: `modify` raw → `remove` emit |
| F3c | Frontend: ignorar `remove` en paths de `touchedEntityPaths` / `markSelfSave` recientes | L79: cierre pese a guardado propio |
| F3d | Opcional: devolver `touchedPaths` desde `save_manuscript` (ya logueado en audit) | Correlación batch ↔ watcher |

---

## 2. Auditoría del código (cadena completa)

### 2.1 Entradas de guardado

| Origen | Handler | Comportamiento (post FIX-012) |
|--------|---------|------------------------------|
| **Ctrl+S** | [`useSaveShortcut`](../../../src/hooks/useSaveShortcut.ts) en `WorkspaceShell` | `saveActiveTab()` → `saveDocument()` |
| **Ctrl+Shift+S** | Idem | `saveAllOpenTabs()` |
| Botón 💾 panel lateral | [`EditorSidePanel.tsx`](../../../src/modules/editor/EditorSidePanel.tsx) | `saveAllOpenTabs()` |
| Autoguardado (opcional) | [`useEditorAutoSave.ts`](../../../src/hooks/useEditorAutoSave.ts) | `saveDocument()` **solo pestaña activa** ✅ |

**Conclusión inmediata:** el atajo más usado (Ctrl+S) **no** equivale a «guardar este archivo»; equivale a «guardar todo lo sucio», con cambios de pestaña intermedios.

### 2.2 `saveAllOpenTabs` — mecanismo de salto

[`useEditorStore.ts`](../../../src/stores/useEditorStore.ts) L1174–1223:

```text
initialActivePath = activeFilePath
dirtyPaths = tabOrder.filter(path => tabs[path].isDirty)

for (path of dirtyPaths):
  if activeFilePath !== path → await switchTab(path)   ← salto visible
  await saveDocument() | saveEntity()

if initialActivePath && active !== initial && tabs[initialActivePath]:
  await switchTab(initialActivePath)                   ← restauración
```

**Efectos colaterales de cada `switchTab`:**

- `flushActiveTabToCache` → extrae Lexical del tab que se abandona.
- `extractManuscriptFn = null` + `beginEditorSession()` → remonta sesión del tab destino.
- UI: pestaña superior, canvas y explorador (`activeFilePath` en `FileTreeItem`) cambian.

**Restauración frágil:** si al final `tabs[initialActivePath]` es `undefined`, **no hay `switchTab` de vuelta** y el usuario se queda en la **última pestaña guardada** del bucle.

Orden en captura del bug: `shushah`, `sas`, `skanlnsklnals`, **`meow`**, **`eventoTest`**.  
Si `meow` también está sucio y se guarda **después** de `eventoTest`, el bucle termina en `meow` hasta que la restauración funcione.

### 2.3 `saveDocument` — guardado del activo

[`useEditorStore.ts`](../../../src/stores/useEditorStore.ts) L849–905:

- Requiere `extractManuscriptFn` del editor montado (pestaña activa).
- `markSelfSave(activeFilePath)` antes del IPC.
- Tras éxito: actualiza `manuscript`, `tabs[path]`, `isDirty: false` **sin** cambiar `activeFilePath`.

Por sí solo **no** cambia de pestaña.

### 2.4 Pipeline Rust al guardar manuscrito con eventos

[`save_manuscript`](../../../src-tauri/src/commands/editor.rs) → [`write_manuscript_and_persist`](../../../src-tauri/src/parser/document.rs) L593–609:

1. `sync_manuscript_event_entities` — escribe/renombra fichas `Worldbuilding/Eventos/*.md` ([`sync_event.rs`](../../../src-tauri/src/entity/sync_event.rs), `write_atomic` temp + rename).
2. `fs::write` del `.md` del manuscrito.
3. Re-parse + persistencia SQLite.

**No** emite `fs-changed` desde el comando; el **watcher** (`notify` + debounce 250 ms) reconcilia y emite un único evento con rutas tocadas ([`reconcile.rs`](../../../src-tauri/src/fs/reconcile.rs) `apply_changes`).

### 2.5 Reacción frontend a `fs-changed`

[`useEditorFsSync.ts`](../../../src/hooks/useEditorFsSync.ts):

| `kind` | Acción |
|--------|--------|
| `remove` | `closeTabsRemovedFromDisk(paths)` — **puede cambiar pestaña activa** |
| `modify` / `create` | Recarga pestañas abiertas cuyo path está en `paths` |
| `rename` | `remapTabPath` |

Guard para guardado propio: [`markSelfSave`](../../../src/lib/editor/fsSync.ts) — ventana **2,5 s**, **solo** la ruta pasada a `saveDocument` (el manuscrito activo). **No** cubre fichas WB escritas en el mismo guardado.

Recarga de pestaña activa sucia → `requestExternalReload()` (diálogo), no cambio de tab.

### 2.6 `closeTabsRemovedFromDisk` — cierra pestañas y elige activo

[`useEditorStore.ts`](../../../src/stores/useEditorStore.ts) L1012–1050:

```text
nextActive = nextOrder[nextOrder.length - 1]
activateTabView(nextTab)
```

Invocado desde [`useEditorFsSync.ts`](../../../src/hooks/useEditorFsSync.ts) cuando `kind === "remove"`.

**Efecto encadenado (repro §1.1):** cerrar `eventoTest` → activo `meow`; cerrar `meow` → activo **`skanlnsklnals`**. Las pestañas **desaparecen** de la barra; el `.md` puede seguir en disco → sensación de «archivos fantasma» (existen pero ya no están abiertos).

**SQLite (Rust):** en el mismo `remove`, [`reconcile.rs`](../../../src-tauri/src/fs/reconcile.rs) ejecuta `mark_ghost` sobre la ruta. Un `remove` **falso** (OneDrive, ventana entre `rename` temp y `write`) deja entradas **`ghost`** en `entities` aunque el archivo siga existiendo — hay que **suprimir** ghost/reconcile para rutas bajo guardado propio (Fase 3).

### 2.7 Explorador vs editor

- Resaltado manuscrito en árbol: `activeFilePath` ([`FileTreeItem.tsx`](../../../src/modules/explorer/FileTreeItem.tsx) L66–72).
- Tras cierre erróneo de tab, puede quedar **`selectedPath`** en un archivo ya sin pestaña → doble resaltado o fila «fantasma» en el árbol (repro: `eventoTest` + `skanlnsklnals`). **Fix:** al `closeTab` / `closeTabsRemovedFromDisk`, limpiar o realinear `selectedPath` con `activeFilePath` si la selección ya no tiene tab abierta.
- `loadTree()` tras `fs-changed` **no** cambia pestaña activa por sí solo.

---

## 3. Hipótesis priorizadas

> Tras repro §1.1, **H2 es la causa principal** (cierre de tabs). **H1 sigue siendo un agravante** (Ctrl+S guarda todo y multiplica ventanas de carrera con el watcher).

### H2 — **Principal (confirmada OBS-001):** batch `remove` mezclado cierra pestañas guardadas

**Mecanismo:** El watcher debounced agrupa `Modify` (manuscrito + entidades) y `Remove` (temp `.narralith-write-*`, posibles glitches OneDrive). [`apply_changes`](../../../src-tauri/src/fs/reconcile.rs) usa **un solo** `kind` por batch: cualquier `Remove` posterior fuerza `kind=remove` sobre **todas** las rutas en `touched`, incluidas las que fueron `Modify` y siguen existiendo. [`useEditorFsSync`](../../../src/hooks/useEditorFsSync.ts) cierra tabs en rama `remove` **sin** `markSelfSave`.

**Evidencia:** `_debug/logs/session-1781303360008-18448.ndjson` L77–79 — ver §1.2.

**Por qué encaja con §1.1:**

- Dos manuscritos sucios guardados → dos escrituras → uno o dos eventos `remove` espurios → **dos tabs cerradas** (captura parcial: una sucia → un cierre).
- Orden final distinto según `tabOrder` al cerrar (captura: `eventoTest` → activo `meow`).
- Contenido guardado OK + tabs cerradas = disco bien, sesión rota.

**Factores agravantes:**

- Proyecto bajo **OneDrive** (`OneDrive/Documentos/…` en ruta del workspace).
- Escritura atómica WB (`.narralith-write-*` + `rename`) y `fs::write` manuscrito en el mismo debounce (250 ms).
- **`markSelfSave` no protege la rama `remove`** en el frontend ni coalesce en Rust.

**Estado confirmación:** ✅ **Confirmada** (Fase 0 OBS-001, jun 2026). Comprobar SQLite `ghost` en `eventoTest`/`meow` sigue siendo QA manual pendiente.

**Probabilidad:** **Confirmada** con NDJSON.

---

### H1 — Secundaria: `saveAllOpenTabs` + varias pestañas sucias

**Mecanismo:** Ctrl+S itera pestañas sucias en `tabOrder`, hace `switchTab` antes de cada guardado, restaura al final.

**Limitación:** sola **no** explica cierre de **dos** tabs; sí explica parpadeos y que, si H2 cierra la tab activa, **`tabs[initialActivePath]` ya no existe** y la restauración de `saveAllOpenTabs` **no corre**.

**Probabilidad:** Alta como **multiplicador** de H2; media como causa única.

---

### H3 — Media: carrera `saveAllOpenTabs` ↔ `useEditorFsSync`

**Mecanismo:** Durante el bucle, `activeFilePath` cambia. Un `fs-changed` llega cuando la pestaña activa **ya** es `meow`; `markSelfSave` solo protegió `eventoTest` al guardarlo, no impide lógica que dependa del activo en ese momento.

**Efecto típico:** recarga o diálogo en tab equivocado, no necesariamente salto permanente — salvo interacción con H2.

---

### H4 — Baja: remapeo de rutas / normalización

**Mecanismo:** `initialActivePath !== activeFilePath` usa comparación estricta `!==`, no `projectPathsEqual`. Si algún paso normaliza `\` vs `/`, la restauración podría no ejecutarse.

**Nota:** `tabOrder` y keys de `tabs` usan rutas del backend; baja probabilidad salvo bug previo de rename.

---

### Descartado o poco probable

| Hipótesis | Motivo |
|-----------|--------|
| `loadTree` cambia documento activo | Solo refresca árbol |
| `ensure_manuscript_title_on_disk` renombra archivo | Solo escribe metadata title en bloque 0 |
| Autoguardado | Usa `saveDocument()` sin switch |
| Clic accidental en explorador | No ocurre «siempre al guardar» |

---

## 4. Matriz de reproducción QA (Fase 0 — antes de codear)

> **Fase 0:** ✅ Repro pre-fix en `session-1781303360008-18448.ndjson`. **Regresión post-fix:** ✅ `session-1781304927416-25560.ndjson`, `session-1781305243035-22576.ndjson` (arranque 5 tabs + saveAll con `eventoTest`/WB; sin `tab.close` ni `kind=remove`).

Ejecutar y anotar **pestaña activa final**, **pestañas sucias antes**, **atajo usado**:

| # | Precondición | Acción | Resultado esperado tras fix |
|---|--------------|--------|----------------------------|
| R1 | Solo `eventoTest` sucio | Ctrl+S | Sigue en `eventoTest` |
| R2 | `meow` + `eventoTest` sucios; activo `eventoTest` | Ctrl+S | Sigue en `eventoTest`; ambos limpios |
| R3 | Igual R2 | Botón «Guardar todo» 💾 | Igual |
| R4 | Solo `eventoTest` sucio, con 2 eventos WB | Ctrl+S | Sigue en `eventoTest`; fichas WB sync |
| R5 | R4 con proyecto en OneDrive | Ctrl+S × 5 | Sin cierre de pestaña ni salto |
| R6 | Autoguardado ON, un solo sucio | Esperar debounce | Sin salto (regresión) |
| R7 | Guardar falla (simular error IPC) en tab intermedio | Ctrl+S multi-sucio | Vuelve a tab inicial o se queda en inicial sin bucle roto |
| **R8** | **Repro §1.1:** 5 tabs, solo `meow`+`eventoTest` sucios, activo `eventoTest` | Guardar | **5 tabs siguen abiertas**; activo `eventoTest`; sin ghost SQLite |
| R9 | Tras R8 | Explorador | Un solo resaltado coherente con tab activa |
| **R10** | 5+ tabs sucias; activo fijo (`eventoTest`) | Ctrl+Shift+S / Guardar todo | NDJSON: **0** `obs.editor.tab.switch` durante `saveAll`; activo sin cambiar |
| **R11** | Editar tab inactiva, cambiar a otra, Guardar todo | Ctrl+Shift+S | Contenido de la tab inactiva en disco = última edición en sesión |
| R12 | Tab sucia activa + 2 inactivas con eventos WB | Guardar todo | Sync WB OK; sin cierre de tabs; sin switch (R10) |

**Instrumentación (Fase 0):** ✅ **OBS-001** — export `_debug/logs/session-*.ndjson`; buscar `obs.fs.reconcile.emit` `kind=remove` + `obs.editor.tab.close` `reason=fs-remove` tras `obs.editor.saveAll.end` (§1.2).

---

## 5. Diseño del arreglo (fases de implementación)

### Fase 1 — Semántica de guardado (UX, cambio pequeño, alto impacto)

| Cambio | Detalle |
|--------|---------|
| **Ctrl+S** | [`EditorCanvas.tsx`](../../../src/modules/editor/EditorCanvas.tsx) → `saveDocument()` (o wrapper `saveActiveTab()`) |
| **Ctrl+Shift+S** (nuevo) | `saveAllOpenTabs()` — patrón VS Code / IDE |
| **Botón 💾 panel** | Etiqueta/tooltip «Guardar todo» — mantener `saveAllOpenTabs` |
| **EntityWorkspace Ctrl+S** | Alinear: guardar entidad activa, no todas |

**i18n:** claves `header.save` vs `header.saveAll` en `editor.json`.

**Riesgo:** bajo. Usuarios que dependían de Ctrl+S para guardar todo deben usar Ctrl+Shift+S o el botón.

---

### Fase 2 — `saveAllOpenTabs` sin salto visible

> **2a ✅ (jun 2026):** alternativa mínima — guardar activo primero, `try/finally` + `projectPathsEqual`, `saveBatchGuard`. Corrige cierres espurios pero **sigue haciendo `switchTab`** por cada pestaña sucia inactiva (parpadeo UX; evidencia: `session-1781305243035-22576.ndjson` L34–57).
>
> **2b ✅ (jun 2026):** guardado desde caché de tab **sin activar** pestañas inactivas. §10 · §10.10.

#### 2a — Entregado (alternativa mínima)

- Guardar **primero** la pestaña activa si está sucia.
- Restauración obligatoria con `try/finally` y `projectPathsEqual`.
- `beginSaveBatch` / `markSelfSavePaths` durante el batch.

#### 2b — Objetivo UX (pendiente de código)

Objetivo: **cero** `switchTab` / `obs.editor.tab.switch` durante «Guardar todo»; `activeFilePath` y canvas **estables** de principio a fin.

**Enfoque:**

1. `flushActiveTabToCache(state)` **una vez** al inicio → volcar Lexical del activo a `tabs[active]` **sin** cambiar vista.
2. Para cada `path` sucio (orden `tabOrder`, estable):
   - Si `path === activeFilePath` → extract en vivo → **`saveManuscriptAtPath`** (no `saveDocument()` directo; ver §10.10 batch flag)
   - Si `tab.kind === "entity"` → **`saveEntityAtPath(path)`** — IPC con `tabs[path].entity`.
   - Si manuscrito inactivo → **`saveManuscriptAtPath(path)`** — IPC con payload derivado de `tabs[path].manuscript`.
3. **No** restauración final: nunca se abandona la pestaña activa.
4. Mantener `saveBatchGuard` + `markSelfSave` (incl. rutas WB) ya implementados en Fase 3.

**Invariante de caché (pestaña inactiva sucia):**

| Momento | Qué contiene `tabs[path].manuscript` |
|---------|--------------------------------------|
| Usuario edita tab A y cambia a B | `flushActiveTabToCache` en `switchTab` — snapshot al salir ✅ |
| Usuario edita tab activa y pulsa Guardar todo sin cambiar | Extract en vivo en paso 2 (activo) ✅ |
| Tab sucia nunca visitada en sesión | No debería ocurrir (`isDirty` implica edición previa) |

**Validación antes de cache-save:** `tabs[path].manuscript` presente y huella distinta de `savedBodyFingerprint` (`bodyFingerprintFromManuscript`). Si falla → **fallback** documentado: un solo `switchTab(path)` + `saveDocument()` + log `obs.editor.saveAll.fallback_switch`.

**Sin IPC nuevo:** reutilizar `save_manuscript` y `save_entity` con payload construido en TS.

---

### Fase 3 — Guard FS durante guardado propio (anti-fantasma)

| Cambio | Archivo |
|--------|---------|
| **F3b — Emitir por kind / no mezclar paths** | [`reconcile.rs`](../../../src-tauri/src/fs/reconcile.rs) `apply_changes`: no poner rutas `Modify` en un evento `remove`; o emitir un `fs-changed` por kind. **Causa raíz confirmada §1.2.** |
| **F3a — Ignorar temp atómico WB** | `should_ignore` para `.narralith-write-*` (no watcher, no ghost) |
| **`saveBatchGuard`** | Contador en store; mientras > 0: **no** `closeTabsRemovedFromDisk` para paths del batch |
| Ampliar `markSelfSave` | `string[]` — manuscrito + `touchedEntityPaths`; usar también en rama **`remove`** del listener |
| **Rust: no `mark_ghost` si path existe** | Antes de `mark_ghost`, `Path::exists()`; skip temp files |
| **Explorador** | Tras cierre legítimo de tab, limpiar `selectedPath` si apunta a path sin pestaña |

**IPC opcional:** `save_manuscript` → `{ manuscript, touchedPaths: string[] }` (audit ya loguea `touchedEntityPaths` en Rust).

---

### Fase 4 — Endurecer `closeTabsRemovedFromDisk`

- No elegir `nextOrder[length-1]` ciegamente: preferir pestaña **adyacente** a la cerrada o la más reciente en historial (futuro); mínimo FIX-012: si cierre ocurre durante `saveBatchGuard`, **reabrir** tab desde disco en lugar de saltar.
- Log `console.warn` cuando un `remove` cierra la pestaña activa <3 s después de `markSelfSave(path)`.

---

### Fase 5 — Tests automatizados

| Test | Ubicación sugerida |
|------|-------------------|
| `saveAllOpenTabs` restaura activo tras 2 tabs sucias | Vitest store mock — **obsoleto tras 2b** (no debe haber restore) |
| `saveAllOpenTabs` **no llama `switchTab`** con N sucias | Vitest store mock; espiar `switchTab` → 0 llamadas |
| `saveManuscriptAtPath` usa caché, no `extractManuscriptFn` | Vitest store + mock IPC |
| `manuscriptToSavePayload` round-trip segmentos evento | `documentSync.test.ts` o nuevo helper test |
| `tabPathsToReloadOnFsChange` + `shouldIgnoreFsReload` tras multi-path mark | [`fsSync.test.ts`](../../../src/lib/editor/fsSync.test.ts) ✅ |
| Fallback switch si caché inválida | Vitest: manuscript `undefined` → 1 switch |

---

### Fase 6 — Documentación

- [`manuscript-design.md`](../manuscript-design.md): § guardado — Ctrl+S vs Guardar todo.
- Cerrar con QA manual R1–R9.

---

## 6. Orden de ejecución recomendado

```text
Fase 0  ✅ Repro OBS-001 — session-1781303360008-18448.ndjson (H2 confirmada)
Fase 3  ✅ apply_changes + ignore temp + markSelfSave remove
Fase 1  ✅ Ctrl+S → saveDocument · Ctrl+Shift+S → saveAllOpenTabs
Fase 2a ✅ saveAll restore + batch guard (con switch visible)
Fase 4  ✅ closeTabs defensivo + selectedPath explorador
Fase 5  ✅ Tests fsSync + should_ignore temp (Rust)
Fase 6  ✅ Docs (`manuscript-design.md` §1.1) + QA NDJSON R4/R8/R3
Fase 2b ✅ saveAll desde caché sin switch — §10
```

**Entrega mínima aceptable (anti-fantasma):** Fase 0 + **Fase 3** + Fase 1 + 2a.  
**Entrega UX completa:** Fases 0–6 + **Fase 2b**.

---

## 7. Criterios de aceptación

1. Con **una** pestaña sucia, Ctrl+S nunca cambia `activeFilePath` ni cierra otras tabs.
2. Con **N** pestañas sucias, Ctrl+S guarda solo el activo; «Guardar todo» deja al usuario en la pestaña que tenía al pulsar y **no cierra** ninguna tab.
3. Repro §1.1 (R8): tras guardar, **`meow` y `eventoTest` siguen en la barra**; activo sigue siendo `eventoTest`.
4. Guardar manuscrito con eventos no marca manuscritos como **`ghost`** en SQLite ni cierra pestañas (R4–R5).
5. Explorador: un solo resaltado coherente con la tab activa (R9).
6. Sin regresión en autoguardado (R6).
7. Tests Fase 5 en verde; `npm run build` OK.
8. **(2b)** «Guardar todo» con N pestañas sucias: **ningún** `switchTab`; canvas estable.
9. **(2b)** Round-trip de tab inactiva editada antes de cambiar de pestaña (R11).

---

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Tab inactiva sucia guardada desde caché desactualizada | Fingerprint ≠ baseline antes de IPC; fallback `switchTab` + audit `saveAll.fallback_switch` |
| Parpadeo barra de tabs durante save-all | Fase 2b elimina switches; indicador global `saveStatus: saving` en batch |
| Usuarios acostumbrados a Ctrl+S = guardar todo | Changelog + Ctrl+Shift+S; tooltip en botón |
| OneDrive sigue emitiendo remove espurios | Fase 3 batch guard + coalesce watcher; ignorar `remove` en paths recién guardados |
| Entidades `ghost` en SQLite tras guardar | No ejecutar `mark_ghost` si path sigue existiendo en disco tras ventana de guardado |
| Duplicar handlers Ctrl+S (Canvas + Entity) | Extraer `useSaveShortcut()` compartido |

---

## 9. Referencias de código (índice rápido)

| Pieza | Ruta |
|-------|------|
| Atajo Ctrl+S manuscrito | `src/modules/editor/EditorCanvas.tsx` |
| saveAllOpenTabs | `src/stores/useEditorStore.ts` L1174–1223 |
| saveDocument + markSelfSave | `src/stores/useEditorStore.ts` L849–905 |
| closeTabsRemovedFromDisk | `src/stores/useEditorStore.ts` L1012–1050 |
| fs-changed listener editor | `src/hooks/useEditorFsSync.ts` |
| Guard self-save | `src/lib/editor/fsSync.ts` |
| Sync eventos al guardar | `src-tauri/src/entity/sync_event.rs` |
| mark_ghost en remove | `src-tauri/src/fs/reconcile.rs` |
| apply_changes batch kind | `src-tauri/src/fs/reconcile.rs` L58–134 |
| Evidencia NDJSON pre-fix | `_debug/logs/session-1781303360008-18448.ndjson` |
| Evidencia NDJSON post-fix | `_debug/logs/session-1781304927416-25560.ndjson`, `session-1781305243035-22576.ndjson` |
| selectedPath explorador | `src/stores/useFileTreeStore.ts`, `FileTreeItem.tsx` |
| `flushActiveTabToCache` | `src/stores/useEditorStore.ts` ~L240 |
| Huella dirty / baseline | `src/lib/editor/documentSync.ts` `bodyFingerprintFromManuscript` |

---

## 10. Fase 2b — Plan de implementación: «Guardar todo» sin recorrer pestañas

> **Estado:** 📋 Planificado · **Prerrequisitos:** Fases 1, 2a, 3 ✅ · **Implementado** jun 2026

### 10.1 Problema UX actual

Tras 2a, «Guardar todo» es **correcto** (no cierra tabs, vuelve al activo) pero **molesto**: cada pestaña sucia inactiva provoca `switchTab` → remontaje Lexical (`extractManuscriptFn = null`, `beginEditorSession`) → parpadeo de barra, canvas y explorador.

**Evidencia:** `session-1781305243035-22576.ndjson` — `saveAll` con 5 sucias genera **6** `obs.editor.tab.switch` (L35–57) pese a `activePath` final correcto (L58).

### 10.2 Comportamiento objetivo

```text
Usuario pulsa Guardar todo (activo = eventoTest, sucias = meow, sas, …)

  ANTES (2a):  eventoTest → meow → sas → … → eventoTest  (N switches)
  DESPUÉS (2b): eventoTest permanece montado; IPC en background por tab sucia
```

| Aspecto | Regla |
|---------|--------|
| `activeFilePath` | **Invariante:** igual antes y después del batch |
| `obs.editor.tab.switch` | **0** eventos con `correlationId` de `saveAll` |
| Lexical / `EditorShell` | Sin remontaje por guardado batch |
| Indicador UI | `saveStatus: saving` global al inicio; por-tab `tabs[path].saveStatus` opcional |
| Errores | Si falla tab intermedia: continuar resto; `ok: false` al final; activo sigue igual |

### 10.3 API nueva (store + helpers)

#### Helpers puros (`documentSync.ts` o `manuscriptSave.ts`)

| Función | Responsabilidad |
|---------|-----------------|
| `manuscriptToSavePayload(m: ParsedManuscript)` | `ParsedManuscript` → `SaveManuscriptPayload` (mapear segmentos freeText/event) |
| `assertCacheSaveable(tab: EditorTab)` | `manuscript` presente + fingerprint ≠ `savedBodyFingerprint`; devuelve motivo si no |

#### Métodos internos del store

| Método | Entrada | IPC |
|--------|---------|-----|
| `saveManuscriptAtPath(filePath, manuscript)` | Caché o extract | `save_manuscript` |
| `saveEntityAtPath(filePath, entity)` | `tabs[path].entity` | `save_entity` |

**Refactor recomendado:** extraer el cuerpo de `saveDocument` / `saveEntity` a variantes `AtPath` que no lean `activeFilePath` / `get().entity`; los métodos públicos actuales delegan al activo.

**Actualización post-IPC:** usar **`patchTabSavedBaseline`** siempre en `tabs`; propagar a **root** (`manuscript`, `document`, `isDirty`, `saveStatus`, `documentSyncKey`) **solo** si `filePath === activeFilePath`. Ver §10.9 B1–B3.

#### `saveAllOpenTabs` (nuevo algoritmo)

```text
saveAllOpenTabs():
  dirtyPaths ← tabOrder.filter(isDirty)
  if empty → return true

  markSelfSavePaths(dirtyPaths + entity paths WB estimadas del activo si aplica)
  beginSaveBatch()
  audit saveAll.start

  state ← get()
  flushed ← flushActiveTabToCache(state)
  set({ tabs: flushed.tabs })                    // solo mapa tabs; NO activateTabView

  allSaved ← true
  for path in dirtyPaths:                        // orden tabOrder, NO reorder “activo primero”
    tab ← get().tabs[path]
    if !tab?.isDirty → continue

    if projectPathsEqual(path, initialActivePath):
      ok ← saveManuscriptAtPath(path, extract|flushed.manuscript)  // extract en vivo; NO saveDocument() directo
    else if tab.kind === "entity":
      ok ← saveEntityAtPath(path, tab.entity!)
    else if assertCacheSaveable(tab).ok:
      ok ← saveManuscriptAtPath(path, tab.manuscript!)
    else:
      audit saveAll.fallback_switch { path, reason }
      await switchTab(path)
      ok ← saveDocument()
      await switchTab(initialActivePath)         // único restore permitido en fallback

    if !ok → allSaved ← false

  endSaveBatch()
  audit saveAll.end { ok: allSaved, switchCount: 0 esperado }
  return allSaved
```

**Eliminar** el bloque `finally` de restauración de 2a cuando no haya fallback (ya no necesario en el camino feliz).

### 10.4 Auditoría (OBS-001)

Nuevos eventos sugeridos:

| Evento | Cuándo |
|--------|--------|
| `obs.editor.saveAll.cache_save` | `{ path, kind: manuscript \| entity }` |
| `obs.editor.saveAll.fallback_switch` | `{ path, reason }` |
| `obs.editor.saveAll.end` | ampliar payload: `{ switchCount, cacheSaveCount, fallbackCount }` |

**QA R10:** filtrar NDJSON por `correlationId` de `saveAll` → `switchCount === 0`.

### 10.5 Orden de implementación sugerido

| Paso | Tarea | Archivos |
|------|-------|----------|
| 1 | `manuscriptToSavePayload` + tests | `documentSync.ts`, `*.test.ts` |
| 2 | `saveManuscriptAtPath` / `saveEntityAtPath` + **split `patchSavedBaseline`** (B1–B3) | `useEditorStore.ts` |
| 3 | Refactor `saveDocument` / `saveEntity` → delegación | idem |
| 4 | Reescribir `saveAllOpenTabs` según §10.3 | idem |
| 5 | Audit payloads §10.4 | `useEditorStore.ts`, audit bridge si hace falta |
| 6 | Tests Vitest §5 (switch spy) | nuevo `useEditorStore.saveAll.test.ts` o similar |
| 7 | QA manual R10–R12 + NDJSON | `_debug/logs/` |
| 8 | Actualizar `manuscript-design.md` §1.1 (sin parpadeo) | specs |

### 10.6 Casos límite

| Caso | Comportamiento |
|------|----------------|
| Activo sucio + extract no registrado | Error en activo (como hoy); batch aborta ese path |
| Inactiva sucia sin `manuscript` en tab | Fallback switch (una vez) o error con `lastErrorKey` |
| Inactiva sucia pero fingerprint = baseline (desync flag) | **Fallback `switchTab`** — no skip silencioso (§10.9 R1) |
| Entidad WB inactiva | `saveEntityAtPath` con template en `entity.template` |
| Guardar todo con 1 sola sucia (activa) | Equivalente a Ctrl+S; 0 cache-save |
| Watcher durante batch | Fase 3 (`saveBatchGuard`) ya cubre; no regresión |

### 10.7 Fuera de alcance 2b

- Guardar tabs sucias **sin** estar abiertas en `tabOrder` (solo tabs abiertas).
- Progress bar porcentual multi-tab (opcional futuro).
- Cancelación a mitad de batch (Esc).
- Cambiar orden de guardado por dependencias WB (orden `tabOrder` basta; Rust sync ya tolera batch).

### 10.8 Criterio de cierre 2b

1. R10 + R11 + R12 manuales OK.
2. Vitest: `switchTab` no invocado en camino feliz con ≥3 sucias inactivas.
3. NDJSON post-fix sin `tab.switch` en correlación `save-all-*`.
4. `npm run build` + tests verdes.
5. Marcar Fase 2b ✅ en §6 y fila FIX-012 en `implementation-plan.md` (nota UX).

### 10.9 Auditoría pre-implementación (¿rompe algo?)

> **Veredicto:** el diseño **2b es viable** y **no regresa** el bug anti-fantasma (Fases 3 + batch guard intactos).  
> **Pero** hay **3 blockers** en el store actual si se reutiliza `saveDocument` / `patchSavedBaseline` sin refactor. Sin corregirlos, 2b **sí rompería** estado del activo, autoguardado y timeline.

#### ✅ Lo que NO se rompe (confianza alta)

| Área | Motivo |
|------|--------|
| Cierre espurio de tabs | `saveBatchGuard`, `filterFsRemovePaths`, reconcile por kind **sin cambios** |
| Ctrl+S / autoguardado | Siguen usando `saveDocument()` solo en activo; no pasan por cache-save |
| Caché inactiva tras `switchTab` | `flushActiveTabToCache` en cada switch deja `tabs[path].manuscript` al día al salir |
| Activo en save-all | `flushActiveTabToCache` al inicio + `saveDocument()` (extract en vivo) cubren `DirtyStatePlugin` (solo `markDirty`, sin reconcile) |
| IPC Rust | Mismo `save_manuscript` / `save_entity`; payload derivable de `ParsedManuscript` |
| Entidades WB inactivas | `tabs[path].entity` + `template` ya persistidos en tab; patrón análogo a manuscrito |
| Explorador / `selectedPath` | Sin `switchTab` → sin drift adicional |

#### 🔴 Blocker B1 — `patchSavedBaseline` pisa la vista activa

Hoy `patchSavedBaseline` **siempre** escribe en el **root** del store:

```371:385:src/stores/useEditorStore.ts
function patchSavedBaseline(state, filePath, fingerprint) {
  return {
    savedBodyFingerprint: fingerprint,
    isDirty: false,
    saveStatus: "saved",
    tabs: syncTabInMap(state.tabs, filePath, { ... }),
  };
}
```

Si `saveManuscriptAtPath` guarda una pestaña **inactiva** y spreadea esto, el activo (aún sucio) quedaría `isDirty: false` → **pérdida de dirty**, autoguardado roto, punto de tab incorrecto.

**Mitigación obligatoria:** dividir en:

- `patchTabSavedBaseline(tabs, filePath, fingerprint)` — solo `tabs[path]`
- `patchActiveSavedBaseline(...)` — root + tab **solo si** `projectPathsEqual(filePath, activeFilePath)`

`reloadTabFromDisk` ya distingue activo vs inactivo (L1194–1208); reutilizar ese patrón.

#### 🔴 Blocker B2 — `saveDocument` sobrescribe `manuscript` / `document` del root

El `set` post-IPC asigna `manuscript: saved` al **root** aunque el path guardado sea el activo. Para inactivo habría que **omitir** `manuscript`, `document`, `entity`, `documentSyncKey` en root.

**Mitigación:** `saveManuscriptAtPath` actualiza solo `tabs` (+ root si activo). Misma regla en `saveEntityAtPath`.

#### 🔴 Blocker B3 — `saveStatus` global y side effects

| Consumidor | Riesgo si root `saveStatus: saved` tras guardar inactivo |
|------------|----------------------------------------------------------|
| `useEditorAutoSave` | Podría autoguardar mal o no detectar sucio |
| `useProjectTimeline` | Recarga timeline al ver `saved` aunque el activo siga editándose |
| `EditorSidePanel` | Indicador «Guardado» engañoso mid-batch |

**Mitigación:**

- Durante batch: `saveStatus: "saving"` en root al inicio; `"saved"` / `"error"` solo al **final** del batch (según `allSaved`).
- Por tab: `tabs[path].saveStatus` durante IPC individual.
- Inactivo guardado: **no** propagar `saveStatus: saved` al root.

#### 🟡 Riesgo R1 — `assertCacheSaveable` + skip (§10.6)

Si `tab.isDirty === true` pero fingerprint del caché == baseline (desync flag/manuscript), **no** hacer skip silencioso — eso dejaría suciedad sin persistir.

**Mitigación:** `isDirty && !cacheSaveable` → **fallback `switchTab`**, no skip.

#### 🟡 Riesgo R2 — `markSelfSave` incompleto en batch

Marcar solo `dirtyPaths` al inicio **no** cubre rutas WB tocadas por manuscritos inactivos al guardar desde caché.

**Mitigación:** antes de cada `saveManuscriptAtPath`, `markSelfSavePaths([path, ...entityPathsFromSegments(manuscript)])` (igual que `saveDocument` hoy).

#### 🟡 Riesgo R3 — fallback con 2× `switchTab`

Parpadeo residual en casos raros (caché vacía). Aceptable; auditar frecuencia vía `obs.editor.saveAll.fallback_switch`. Objetivo: **≈0** en QA normal.

#### 🟡 Riesgo R4 — `flushActiveTabToCache` + `set({ tabs })` sin sync root

Tras flush, conviene actualizar también `manuscript` / `document` del root si el activo es manuscrito (coherencia memoria). Opcional si el activo siempre pasa por `saveDocument()` con re-extract; documentar en paso 4.

#### 🟢 Orden de guardado (sin «activo primero»)

El plan 2b itera `tabOrder` sin reordenar. **Validado:** el flush inicial sincroniza el activo; inactivas usan caché del último switch; el activo usa extract al llegar su turno. No requiere «activo primero» (a diferencia de 2a).

#### Checklist pre-merge 2b

- [x] B1–B3 resueltos con tests de store (activo sucio + guardar inactivo → activo sigue `isDirty`)
- [x] Test: `manuscriptToSavePayload` + `assertCacheSaveable`
- [ ] Test: `saveAllOpenTabs` con 3 inactivas → `switchTab` mock **0** llamadas (QA R10 NDJSON)
- [ ] Test R11: contenido disco == edición pre-switch
- [ ] NDJSON R10: `switchCount === 0` en camino feliz
- [ ] Regresión Fase 3: ningún `tab.close` / `kind=remove` tras save-all
- [ ] `useProjectTimeline` no dispara reload espurio (mock o manual)

#### Conclusión

| Pregunta | Respuesta |
|----------|-----------|
| ¿Rompe anti-fantasma? | **No**, si no se toca Fase 3 |
| ¿Rompe guardado / dirty state? | **Sí**, si se implementa ingenuamente — requiere B1–B3 |
| ¿Proceder? | **Sí**, con el refactor de patch/save at-path del §10.3 ampliado |

### 10.10 Matriz de no-choque con `implementation-plan.md`

> **Regla del repo:** FIX-001…006.5 y OBS-001 ✅. **FIX-012 2b** es la única tarea en curso; el resto ⬜ **no se toca** al implementar §10.

#### Estado en lista maestra

| ID | Relación con 2b | Acción |
|----|-----------------|--------|
| **FIX-012** (2a+3) | ✅ Hecho | No revertir reconcile / fsSync / atajos |
| **FIX-012** (2b) | 🔄 Sub-entrega UX | Solo §10; cerrar FIX-012 del todo al terminar 2b |
| **FIX-007** (#9 orden) | ⬜ Siguiente tarea global | **Fuera de alcance 2b** — ver §1 fuera de alcance |

#### Tareas ⬜ — sin choque si se respeta el perímetro

| ID | ¿Choca? | Notas |
|----|---------|-------|
| **FIX-007** Borrador al cerrar app | **No** (ahora) | Hoy `usePersistManuscriptTabs` solo guarda orden+activa, no contenido sucio. 2b **refuerza** el modelo `tabs[path].manuscript` que FIX-007 podría serializar después. **No** implementar persistencia de borrador en 2b. |
| **FIX-008** Explorador inline | **No** | Sin archivos explorador / `create_file` en §10.5 |
| **FIX-009** Timeline chips | **No** | UI timeline distinta; 2b solo debe cumplir B3 para no disparar reload espurio en `useProjectTimeline` |
| **FIX-010** Calendario obsoleto | **No** | Consistencia / calendario — fuera de perímetro |
| **FIX-011** Evento WB huérfano | **No** | 2b sigue llamando `save_manuscript` (sync WB igual que hoy). No borra fichas; no sustituye detector huérfanos |
| **ERAII-001** M7 un solo modelo | **No** (bloqueante) | 2b usa `ParsedManuscript` en caché — **alineado** con M7. Tras M7: posible limpieza de `tab.document` legacy, no requisito previo |
| **ERAII-002** QA §7 | **No** | Checklist manual; 2b añade R10–R12 dentro de FIX-012 |
| **MAP-*** / **WB-*** | **No** | Eras posteriores |

#### Tareas ✅ — dependencias que 2b debe respetar (no romper)

| ID | Dependencia |
|----|-------------|
| **FIX-005** | `manuscriptToSavePayload` copia `body` **sin** re-trim; mismos tests de whitespace |
| **FIX-006 / 6.5** | Payload evento incluye `closed`, `barTags`, `entityPath`, `description` |
| **OBS-001** | Solo **añadir** eventos §10.4; no cambiar contrato del visor |
| **FIX-012 2a+3** | **No tocar** `reconcile.rs`, `filterFsRemovePaths`, `useSaveShortcut`, flujo Ctrl+S |

#### Perímetro de archivos 2b (único alcance de código)

| Tocar | No tocar |
|-------|----------|
| `useEditorStore.ts` (`saveAllOpenTabs`, `save*AtPath`, split baseline) | `reconcile.rs`, watcher Rust |
| `documentSync.ts` (+ tests) `manuscriptToSavePayload` | `useEditorFsSync.ts` (salvo bug P0) |
| Tests Vitest §5 / §10.8 checklist | `EditorSidePanel`, explorador, timeline UI |
| Audit payloads en store | `usePersistManuscriptTabs` / FIX-007 session |
| `manuscript-design.md` §1.1 (1 párrafo UX) | `implementation-plan` salvo marcar 2b ✅ al cierre |

#### Choque interno corregido (plan §10.3)

Llamar `saveDocument()` **dentro** del batch contradice B3 (`saveStatus: saved` por IPC intermedio). **Regla 2b:** todo el batch usa `saveManuscriptAtPath` / `saveEntityAtPath` con flag `{ batch: true }`; el activo obtiene payload vía **extract en vivo**, no vía `saveDocument()` público. `saveDocument()` / Ctrl+S / autoguardado siguen igual fuera del batch.

#### Orden global vs sub-entrega

```text
implementation-plan #8  FIX-012 core ✅  →  FIX-012 2b 🔄  →  #9 FIX-007 ⬜
```

Implementar 2b **antes** de FIX-007 es coherente con la lista numerada y **no** adelanta FIX-007 (no persistir borrador al cerrar).

### 10.11 Veredicto auditoría cruzada (2b)

| Pregunta | Respuesta |
|----------|-----------|
| ¿Choca con otra tarea ⬜ del plan? | **No**, si se respeta §10.10 |
| ¿Choca con FIX-007 futuro? | **No** — complementario; no serializar sesión en 2b |
| ¿Choca con ERAII-001? | **No** — mismo modelo; refactor menor posible después |
| ¿Algo pendiente en el plan 2b? | B1–B3, batch flag, activo vía `AtPath`+extract (§10.10) |
| ¿Proceder a codear 2b? | **Sí**, acotado al perímetro §10.10 |
